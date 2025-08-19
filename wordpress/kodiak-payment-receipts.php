<?php
/**
 * Plugin Name: Kodiak Payment Receipts
 * Description: Manages payment receipt CPT, sends immediate receipts for one-time/first installments, and integrates with scheduled payments for future installment receipts.
 * Version: 1.0.0
 * Author: Kodiak
 */

if (!defined('ABSPATH')) { exit; }

class Kodiak_Payment_Receipts_Plugin {
  const CPT = 'kodiak_receipt';
  const REST_NS = 'kodiak/v1';
  const ROUTE_CREATE_RECEIPT = '/create-receipt';
  const ROUTE_SEND_RECEIPT = '/send-receipt';
  
  const OPTION_GROUP = 'kodiak_payment_receipts';
  const OPTION_SHARED_SECRET = 'kodiak_receipt_shared_secret';
  const OPTION_FROM_EMAIL = 'kodiak_receipt_from_email';
  const OPTION_FROM_NAME = 'kodiak_receipt_from_name';

  public function __construct() {
    add_action('init', [$this, 'register_cpt']);
    add_action('rest_api_init', [$this, 'register_rest_routes']);
    
    add_action('admin_menu', [$this, 'register_settings_page']);
    add_action('admin_init', [$this, 'register_settings']);
    
    add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
    add_filter('manage_edit-' . self::CPT . '_columns', [$this, 'admin_columns']);
    add_action('manage_' . self::CPT . '_posts_custom_column', [$this, 'render_admin_columns'], 10, 2);
    add_filter('manage_edit-' . self::CPT . '_sortable_columns', [$this, 'sortable_columns']);
    
    // Hook into scheduled payment completion for future installments
    add_action('kodiak_scheduled_payment_completed', [$this, 'handle_scheduled_payment_receipt'], 10, 2);
    
    register_activation_hook(__FILE__, [$this, 'on_activate']);
  }

  /* ---------- CPT ---------- */
  public function register_cpt() {
    register_post_type(self::CPT, [
      'label'       => 'Payment Receipts',
      'public'      => false,
      'show_ui'     => true,
      'show_in_menu'=> true,
      'show_in_rest'=> true,
      'supports'    => ['title', 'custom-fields'],
      'menu_icon'   => 'dashicons-email-alt',
    ]);
  }

  /* ---------- REST ---------- */
  public function register_rest_routes() {
    register_rest_route(self::REST_NS, self::ROUTE_CREATE_RECEIPT, [
      'methods'             => 'POST',
      'callback'            => [$this, 'rest_create_receipt'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);
    
    register_rest_route(self::REST_NS, self::ROUTE_SEND_RECEIPT, [
      'methods'             => 'POST',
      'callback'            => [$this, 'rest_send_receipt'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);
  }

  public function rest_auth(WP_REST_Request $req) {
    $shared = (string) get_option(self::OPTION_SHARED_SECRET, '');
    $header = (string) $req->get_header('x-kodiak-secret');
    return !empty($shared) && hash_equals($shared, $header);
  }

  public function rest_create_receipt(WP_REST_Request $req) {
    $p = $req->get_json_params();

    // Required fields
    $transaction_id = sanitize_text_field($p['transaction_id'] ?? '');
    $amount = floatval($p['amount'] ?? 0);
    $payment_method = sanitize_text_field($p['payment_method'] ?? '');
    $payment_type = sanitize_text_field($p['payment_type'] ?? ''); // 'singular' or 'installment'
    
    // Customer info
    $customer_name = sanitize_text_field($p['customer_name'] ?? '');
    $customer_email = sanitize_email($p['customer_email'] ?? '');
    $service_address = sanitize_text_field($p['service_address'] ?? '');
    
    // Installment info (if applicable)
    $current_payment = intval($p['current_payment'] ?? 1);
    $total_payments = intval($p['total_payments'] ?? 1);
    $future_dates = is_array($p['future_dates'] ?? null) ? $p['future_dates'] : [];
    
    // Contract info
    $contract_id = sanitize_text_field($p['contract_id'] ?? '');
    $season = sanitize_text_field($p['season'] ?? '');

    if (empty($transaction_id) || $amount <= 0 || empty($customer_email)) {
      return new WP_REST_Response(['error' => 'Missing required fields'], 400);
    }

    $title = sprintf('Receipt %s - %s', $transaction_id, $customer_name ?: $customer_email);
    $post_id = wp_insert_post([
      'post_type'   => self::CPT,
      'post_status' => 'publish',
      'post_title'  => $title,
    ], true);

    if (is_wp_error($post_id)) {
      return new WP_REST_Response(['error' => $post_id->get_error_message()], 500);
    }

    // Store receipt data
    update_post_meta($post_id, '_receipt_transaction_id', $transaction_id);
    update_post_meta($post_id, '_receipt_amount', number_format($amount, 2, '.', ''));
    update_post_meta($post_id, '_receipt_payment_method', $payment_method);
    update_post_meta($post_id, '_receipt_payment_type', $payment_type);
    update_post_meta($post_id, '_receipt_customer_name', $customer_name);
    update_post_meta($post_id, '_receipt_customer_email', $customer_email);
    update_post_meta($post_id, '_receipt_service_address', $service_address);
    update_post_meta($post_id, '_receipt_current_payment', $current_payment);
    update_post_meta($post_id, '_receipt_total_payments', $total_payments);
    update_post_meta($post_id, '_receipt_future_dates', wp_json_encode($future_dates));
    update_post_meta($post_id, '_receipt_contract_id', $contract_id);
    update_post_meta($post_id, '_receipt_season', $season);
    update_post_meta($post_id, '_receipt_payment_date', current_time('Y-m-d H:i:s'));
    update_post_meta($post_id, '_receipt_status', 'pending');

    // For one-time and first installments, send receipt immediately
    if ($payment_type === 'singular' || ($payment_type === 'installment' && $current_payment === 1)) {
      $send_result = $this->send_receipt_email($post_id);
      if ($send_result['success']) {
        update_post_meta($post_id, '_receipt_status', 'sent');
        update_post_meta($post_id, '_receipt_sent_date', current_time('Y-m-d H:i:s'));
      } else {
        update_post_meta($post_id, '_receipt_status', 'failed');
        update_post_meta($post_id, '_receipt_error', $send_result['error']);
      }
    }

    return new WP_REST_Response([
      'ok' => true, 
      'post_id' => $post_id,
      'email_sent' => ($payment_type === 'singular' || ($payment_type === 'installment' && $current_payment === 1))
    ], 200);
  }

  public function rest_send_receipt(WP_REST_Request $req) {
    $p = $req->get_json_params();
    $post_id = intval($p['post_id'] ?? 0);
    
    if ($post_id <= 0 || get_post_type($post_id) !== self::CPT) {
      return new WP_REST_Response(['error' => 'Invalid receipt ID'], 400);
    }

    $result = $this->send_receipt_email($post_id);
    
    if ($result['success']) {
      update_post_meta($post_id, '_receipt_status', 'sent');
      update_post_meta($post_id, '_receipt_sent_date', current_time('Y-m-d H:i:s'));
    } else {
      update_post_meta($post_id, '_receipt_status', 'failed');
      update_post_meta($post_id, '_receipt_error', $result['error']);
    }

    return new WP_REST_Response($result, 200);
  }

  /* ---------- Email Functions ---------- */
  private function send_receipt_email($post_id) {
    // Get receipt data
    $transaction_id = get_post_meta($post_id, '_receipt_transaction_id', true);
    $amount = get_post_meta($post_id, '_receipt_amount', true);
    $payment_method = get_post_meta($post_id, '_receipt_payment_method', true);
    $payment_type = get_post_meta($post_id, '_receipt_payment_type', true);
    $customer_name = get_post_meta($post_id, '_receipt_customer_name', true);
    $customer_email = get_post_meta($post_id, '_receipt_customer_email', true);
    $service_address = get_post_meta($post_id, '_receipt_service_address', true);
    $current_payment = intval(get_post_meta($post_id, '_receipt_current_payment', true));
    $total_payments = intval(get_post_meta($post_id, '_receipt_total_payments', true));
    $future_dates = json_decode(get_post_meta($post_id, '_receipt_future_dates', true), true) ?: [];
    $contract_id = get_post_meta($post_id, '_receipt_contract_id', true);
    $season = get_post_meta($post_id, '_receipt_season', true);
    $payment_date = get_post_meta($post_id, '_receipt_payment_date', true);

    // Generate schedule message
    $schedule_message = $this->generate_schedule_message($payment_type, $current_payment, $total_payments, $future_dates);

    // Split customer name
    $name_parts = explode(' ', trim($customer_name), 2);
    $first_name = $name_parts[0] ?? '';
    $last_name = $name_parts[1] ?? '';

    // Format payment date
    $formatted_date = date('F j, Y', strtotime($payment_date));

    // Load and populate HTML template
    $html_content = $this->get_email_template();
    
    $replacements = [
      '{first_name}' => $first_name,
      '{last_name}' => $last_name,
      '{address}' => $service_address,
      '{payment_date}' => $formatted_date,
      '{schedule_message}' => $schedule_message,
      '%trnAmount%' => '$' . number_format(floatval($amount), 2),
      '%trnOrderNumber%' => $transaction_id,
      '%merchantName%' => 'Kodiak Snow Removal',
      '%merchantOnlineAddress%' => 'https://kodiaksnowremoval.ca',
    ];

    foreach ($replacements as $placeholder => $value) {
      $html_content = str_replace($placeholder, $value, $html_content);
    }

    // Email settings
    $from_email = get_option(self::OPTION_FROM_EMAIL, get_option('admin_email'));
    $from_name = get_option(self::OPTION_FROM_NAME, 'Kodiak Snow Removal');
    
    $headers = [
      'Content-Type: text/html; charset=UTF-8',
      'From: ' . $from_name . ' <' . $from_email . '>',
      'Cc: info@kodiaksnowremoval.ca'
    ];

    $subject = 'Payment Confirmation - Kodiak Snow Removal';

    // Send email via wp_mail (will use Fluent SMTP)
    $sent = wp_mail($customer_email, $subject, $html_content, $headers);

    if ($sent) {
      return ['success' => true];
    } else {
      return ['success' => false, 'error' => 'Failed to send email via wp_mail'];
    }
  }

  private function generate_schedule_message($payment_type, $current_payment, $total_payments, $future_dates) {
    if ($payment_type === 'singular' || $total_payments === 1) {
      return 'Your balance is paid in full.';
    }

    $message = "This is payment {$current_payment} of {$total_payments}.";
    
    if (!empty($future_dates) && count($future_dates) > 0) {
      $formatted_dates = array_map(function($date) {
        return date('F j', strtotime($date));
      }, $future_dates);
      
      $message .= ' Your future payments are scheduled 30 days apart for ' . implode(', ', $formatted_dates) . '.';
    }

    return $message;
  }

  private function get_email_template() {
    $template_path = plugin_dir_path(__FILE__) . 'receipt-template.html';
    
    if (file_exists($template_path)) {
      return file_get_contents($template_path);
    }
    
    // Fallback basic template if file doesn't exist
    return '
    <html>
    <body>
      <h2>Payment Confirmation</h2>
      <p>Dear {first_name} {last_name},</p>
      <p>Thank you for your payment of %trnAmount% for snow removal services at {address}.</p>
      <p>Payment Date: {payment_date}</p>
      <p>Transaction ID: %trnOrderNumber%</p>
      <p>{schedule_message}</p>
      <p>Best regards,<br>%merchantName%</p>
    </body>
    </html>';
  }

  /* ---------- Integration with Scheduled Payments ---------- */
  public function handle_scheduled_payment_receipt($payment_post_id, $transaction_data) {
    // This will be called when a scheduled payment completes successfully
    // Create receipt for future installment payments
    
    $customer_code = get_post_meta($payment_post_id, '_kodiak_customer_code', true);
    $amount = get_post_meta($payment_post_id, '_kodiak_amount', true);
    $service_address = get_post_meta($payment_post_id, '_kodiak_service_address', true);
    $customer_name = get_post_meta($payment_post_id, '_kodiak_customer_name', true);
    $customer_email = get_post_meta($payment_post_id, '_kodiak_customer_email', true);
    $contract_id = get_post_meta($payment_post_id, '_kodiak_contract_id', true);
    
    // Extract installment info from metadata if available
    $metadata = json_decode(get_post_meta($payment_post_id, '_kodiak_metadata', true), true) ?: [];
    $current_payment = intval($metadata['current_payment'] ?? 2); // Assume 2+ for scheduled payments
    $total_payments = intval($metadata['total_payments'] ?? 1);
    $future_dates = $metadata['future_dates'] ?? [];

    if (empty($customer_email)) {
      return; // Can't send receipt without email
    }

    // Create receipt CPT entry
    $title = sprintf('Receipt %s - %s (Scheduled)', $transaction_data['id'] ?? 'N/A', $customer_name ?: $customer_email);
    $post_id = wp_insert_post([
      'post_type'   => self::CPT,
      'post_status' => 'publish',
      'post_title'  => $title,
    ]);

    if (is_wp_error($post_id)) {
      return;
    }

    // Store receipt data
    update_post_meta($post_id, '_receipt_transaction_id', $transaction_data['id'] ?? '');
    update_post_meta($post_id, '_receipt_amount', $amount);
    update_post_meta($post_id, '_receipt_payment_method', 'Credit Card (Scheduled)');
    update_post_meta($post_id, '_receipt_payment_type', 'installment');
    update_post_meta($post_id, '_receipt_customer_name', $customer_name);
    update_post_meta($post_id, '_receipt_customer_email', $customer_email);
    update_post_meta($post_id, '_receipt_service_address', $service_address);
    update_post_meta($post_id, '_receipt_current_payment', $current_payment);
    update_post_meta($post_id, '_receipt_total_payments', $total_payments);
    update_post_meta($post_id, '_receipt_future_dates', wp_json_encode($future_dates));
    update_post_meta($post_id, '_receipt_contract_id', $contract_id);
    update_post_meta($post_id, '_receipt_payment_date', current_time('Y-m-d H:i:s'));
    update_post_meta($post_id, '_receipt_status', 'pending');

    // Send receipt email
    $send_result = $this->send_receipt_email($post_id);
    if ($send_result['success']) {
      update_post_meta($post_id, '_receipt_status', 'sent');
      update_post_meta($post_id, '_receipt_sent_date', current_time('Y-m-d H:i:s'));
    } else {
      update_post_meta($post_id, '_receipt_status', 'failed');
      update_post_meta($post_id, '_receipt_error', $send_result['error']);
    }
  }

  /* ---------- Admin UI ---------- */
  public function add_meta_boxes() {
    add_meta_box(
      'receipt_details',
      'Receipt Details',
      [$this, 'render_receipt_details'],
      self::CPT,
      'normal',
      'high'
    );
  }

  public function render_receipt_details($post) {
    $meta = function(string $key, $default = '') use ($post) {
      $v = get_post_meta($post->ID, $key, true);
      return $v !== '' && $v !== null ? $v : $default;
    };

    $rows = [
      ['Transaction ID',    $meta('_receipt_transaction_id')],
      ['Amount',           '$' . $meta('_receipt_amount')],
      ['Payment Method',   $meta('_receipt_payment_method')],
      ['Payment Type',     $meta('_receipt_payment_type')],
      ['Customer Name',    $meta('_receipt_customer_name')],
      ['Customer Email',   $meta('_receipt_customer_email')],
      ['Service Address',  $meta('_receipt_service_address')],
      ['Payment Number',   $meta('_receipt_current_payment') . ' of ' . $meta('_receipt_total_payments')],
      ['Payment Date',     $meta('_receipt_payment_date')],
      ['Status',           $meta('_receipt_status')],
      ['Sent Date',        $meta('_receipt_sent_date')],
      ['Error',            $meta('_receipt_error')],
    ];

    echo '<table class="widefat striped"><tbody>';
    foreach ($rows as [$label, $value]) {
      echo '<tr><th style="width:150px;">' . esc_html($label) . '</th>';
      echo '<td><code>' . esc_html($value) . '</code></td></tr>';
    }
    echo '</tbody></table>';
  }

  public function admin_columns($cols) {
    $new = [];
    foreach ($cols as $k => $v) {
      $new[$k] = $v;
      if ($k === 'title') {
        $new['receipt_amount'] = 'Amount';
        $new['receipt_customer'] = 'Customer';
        $new['receipt_payment_date'] = 'Payment Date';
        $new['receipt_status'] = 'Status';
      }
    }
    return $new;
  }

  public function render_admin_columns($column, $post_id) {
    switch ($column) {
      case 'receipt_amount':
        echo '$' . esc_html(get_post_meta($post_id, '_receipt_amount', true));
        break;
      case 'receipt_customer':
        $name = get_post_meta($post_id, '_receipt_customer_name', true);
        $email = get_post_meta($post_id, '_receipt_customer_email', true);
        echo esc_html($name ?: $email);
        break;
      case 'receipt_payment_date':
        $date = get_post_meta($post_id, '_receipt_payment_date', true);
        echo esc_html($date ? date('M j, Y', strtotime($date)) : '');
        break;
      case 'receipt_status':
        $status = get_post_meta($post_id, '_receipt_status', true);
        $color = $status === 'sent' ? 'green' : ($status === 'failed' ? 'red' : 'orange');
        echo '<span style="color:' . $color . ';">' . esc_html(ucfirst($status)) . '</span>';
        break;
    }
  }

  public function sortable_columns($cols) {
    $cols['receipt_payment_date'] = 'receipt_payment_date';
    $cols['receipt_status'] = 'receipt_status';
    return $cols;
  }

  /* ---------- Settings ---------- */
  public function register_settings_page() {
    add_options_page(
      'Kodiak Payment Receipts',
      'Payment Receipts',
      'manage_options',
      'kodiak-payment-receipts',
      [$this, 'render_settings_page']
    );
  }

  public function register_settings() {
    register_setting(self::OPTION_GROUP, self::OPTION_SHARED_SECRET);
    register_setting(self::OPTION_GROUP, self::OPTION_FROM_EMAIL);
    register_setting(self::OPTION_GROUP, self::OPTION_FROM_NAME);

    add_settings_section('receipt_main', 'Receipt Settings', function () {
      echo '<p>Configure receipt email settings and API authentication.</p>';
    }, 'kodiak-payment-receipts');

    add_settings_field(self::OPTION_SHARED_SECRET, 'Shared Secret (for REST)', function () {
      $val = esc_attr(get_option(self::OPTION_SHARED_SECRET, ''));
      echo '<input type="password" name="'. self::OPTION_SHARED_SECRET .'" value="'. $val .'" class="regular-text" />';
      echo '<p class="description">Use this value as the X-Kodiak-Secret header when creating receipts.</p>';
    }, 'kodiak-payment-receipts', 'receipt_main');

    add_settings_field(self::OPTION_FROM_EMAIL, 'From Email', function () {
      $val = esc_attr(get_option(self::OPTION_FROM_EMAIL, get_option('admin_email')));
      echo '<input type="email" name="'. self::OPTION_FROM_EMAIL .'" value="'. $val .'" class="regular-text" />';
    }, 'kodiak-payment-receipts', 'receipt_main');

    add_settings_field(self::OPTION_FROM_NAME, 'From Name', function () {
      $val = esc_attr(get_option(self::OPTION_FROM_NAME, 'Kodiak Snow Removal'));
      echo '<input type="text" name="'. self::OPTION_FROM_NAME .'" value="'. $val .'" class="regular-text" />';
    }, 'kodiak-payment-receipts', 'receipt_main');
  }

  public function render_settings_page() {
    if (!current_user_can('manage_options')) return;
    echo '<div class="wrap">';
    echo '<h1>Kodiak Payment Receipts</h1>';
    echo '<form method="post" action="options.php">';
    settings_fields(self::OPTION_GROUP);
    do_settings_sections('kodiak-payment-receipts');
    submit_button();
    echo '</form></div>';
  }

  public function on_activate() {
    $this->register_cpt();
    flush_rewrite_rules();
  }
}

new Kodiak_Payment_Receipts_Plugin();
