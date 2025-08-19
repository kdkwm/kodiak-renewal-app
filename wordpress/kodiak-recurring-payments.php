<?php
/**
 * Plugin Name: Kodiak Recurring Payments (Bambora)
 * Description: Registers a CPT for scheduled payments, exposes secure REST endpoints to queue/list/process them, and processes due payments using Bambora Payment Profiles.
 * Version: 1.1.0
 * Author: Kodiak
 */

if (!defined('ABSPATH')) { exit; }

class Kodiak_Recurring_Payments_Plugin {
  const CPT = 'kodiak_payment';
  const REST_NS = 'kodiak/v1';
  const ROUTE_QUEUE = '/queue-payment';
  const ROUTE_LIST = '/payments';
  const ROUTE_PROCESS = '/process-due';
  const CRON_HOOK = 'kodiak_process_recurring_payments';

  const OPTION_GROUP = 'kodiak_recurring_payments';
  const OPTION_MERCHANT_ID = 'kodiak_merchant_id';
  const OPTION_PAYMENT_API_KEY = 'kodiak_payment_api_key';
  const OPTION_SHARED_SECRET = 'kodiak_shared_secret';
  const OPTION_MODE = 'kodiak_mode'; // sandbox|production

  public function __construct() {
    add_action('init', [$this, 'register_cpt']);
    add_action('rest_api_init', [$this, 'register_rest_routes']);

    add_action('admin_menu', [$this, 'register_settings_page']);
    add_action('admin_init', [$this, 'register_settings']);

    add_action('init', [$this, 'maybe_schedule_cron']);
    add_action(self::CRON_HOOK, [$this, 'cron_entry']);

    register_activation_hook(__FILE__, [$this, 'on_activate']);
    register_deactivation_hook(__FILE__, [$this, 'on_deactivate']);

    add_action('add_meta_boxes', [$this, 'kodiak_add_meta_boxes']);
    add_filter('manage_edit-' . self::CPT . '_columns', [$this, 'kodiak_admin_columns']);
    add_action('manage_' . self::CPT . '_posts_custom_column', [$this, 'kodiak_render_admin_columns'], 10, 2);
    add_filter('manage_edit-' . self::CPT . '_sortable_columns', [$this, 'kodiak_sortable_columns']);

    add_action('admin_post_kodiak_retry_payment', [$this, 'admin_retry_payment']);
    add_filter('post_row_actions', [$this, 'add_retry_row_action'], 10, 2);
  }

  /* ---------- CPT ---------- */
  public function register_cpt() {
    register_post_type(self::CPT, [
      'label'       => 'Scheduled Payments',
      'public'      => false,
      'show_ui'     => true,
      'show_in_menu'=> true,
      'show_in_rest'=> true, // enable block editor REST + easier inspection
      'supports'    => ['title', 'custom-fields'],
      'menu_icon'   => 'dashicons-calendar-alt',
    ]);
  }

  /* ---------- REST ---------- */
  public function register_rest_routes() {
    register_rest_route(self::REST_NS, self::ROUTE_QUEUE, [
      'methods'             => 'POST',
      'callback'            => [$this, 'rest_queue_payment'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);

    register_rest_route(self::REST_NS, self::ROUTE_LIST, [
      'methods'             => 'GET',
      'callback'            => [$this, 'rest_list_payments'],
      'permission_callback' => [$this, 'rest_auth'],
      'args'                => [
        'status' => [
          'required' => false,
          'type'     => 'string',
          'enum'     => ['pending','completed','failed','all'],
          'default'  => 'pending',
        ],
        'limit' => [
          'required' => false,
          'type'     => 'integer',
          'default'  => 100,
        ],
      ],
    ]);

    register_rest_route(self::REST_NS, self::ROUTE_PROCESS, [
      'methods'             => 'POST',
      'callback'            => [$this, 'rest_process_due'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);

    register_rest_route(self::REST_NS, '/auth-check', [
      'methods'             => 'GET',
      'callback'            => [$this, 'rest_auth_check'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);

    register_rest_route(self::REST_NS, '/retry-payment', [
      'methods'             => 'POST',
      'callback'            => [$this, 'rest_retry_payment'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);
  }

  public function rest_auth(WP_REST_Request $req) {
    $shared = (string) get_option(self::OPTION_SHARED_SECRET, '');
    $header = (string) $req->get_header('x-kodiak-secret');
    return !empty($shared) && hash_equals($shared, $header);
  }

  public function rest_queue_payment(WP_REST_Request $req) {
    $p = $req->get_json_params();

    $amount        = isset($p['amount']) ? floatval($p['amount']) : 0;
    $currency      = sanitize_text_field($p['currency'] ?? 'CAD');
    $payment_date  = sanitize_text_field($p['payment_date'] ?? '');
    $customer_code = sanitize_text_field($p['customer_code'] ?? '');
    $card_id       = intval($p['card_id'] ?? 0);

    $contract_id     = sanitize_text_field($p['contract_id'] ?? '');
    $service_address = sanitize_text_field($p['service_address'] ?? '');
    $customer_name   = sanitize_text_field($p['customer_name'] ?? '');
    $customer_email  = sanitize_email($p['customer_email'] ?? '');
    $customer_phone  = sanitize_text_field($p['customer_phone'] ?? '');
    $metadata        = is_array($p['metadata'] ?? null) ? $p['metadata'] : [];

    if ($amount <= 0 || empty($payment_date) || empty($customer_code) || $card_id <= 0) {
      return new WP_REST_Response(['error' => 'Invalid payload'], 400);
    }

    $title = sprintf('Payment %s — %s', $payment_date, $customer_name ?: $customer_code);
    $post_id = wp_insert_post([
      'post_type'   => self::CPT,
      'post_status' => 'publish',
      'post_title'  => $title,
    ], true);

    if (is_wp_error($post_id)) {
      return new WP_REST_Response(['error' => $post_id->get_error_message()], 500);
    }

    update_post_meta($post_id, '_kodiak_amount', number_format($amount, 2, '.', ''));
    update_post_meta($post_id, '_kodiak_currency', $currency);
    update_post_meta($post_id, '_kodiak_payment_date', $payment_date);
    update_post_meta($post_id, '_kodiak_customer_code', $customer_code);
    update_post_meta($post_id, '_kodiak_card_id', $card_id);
    update_post_meta($post_id, '_kodiak_status', 'pending');

    update_post_meta($post_id, '_kodiak_contract_id', $contract_id);
    update_post_meta($post_id, '_kodiak_service_address', $service_address);
    update_post_meta($post_id, '_kodiak_customer_name', $customer_name);
    update_post_meta($post_id, '_kodiak_customer_email', $customer_email);
    update_post_meta($post_id, '_kodiak_customer_phone', $customer_phone);
    update_post_meta($post_id, '_kodiak_metadata', wp_json_encode($metadata));

    return new WP_REST_Response(['ok' => true, 'post_id' => $post_id], 200);
  }

  public function rest_list_payments(WP_REST_Request $req) {
    $status = $req->get_param('status') ?: 'pending';
    $limit  = intval($req->get_param('limit') ?? 100);

    $meta_query = [];
    if ($status !== 'all') {
      $meta_query[] = [
        'key'     => '_kodiak_status',
        'value'   => $status,
        'compare' => '=',
      ];
    }

    $q = new WP_Query([
      'post_type'      => self::CPT,
      'posts_per_page' => $limit,
      'meta_query'     => $meta_query ?: null,
      'orderby'        => 'meta_value',
      'meta_key'       => '_kodiak_payment_date',
      'order'          => 'ASC',
      'no_found_rows'  => true,
    ]);

    $items = [];
    if ($q->have_posts()) {
      while ($q->have_posts()) {
        $q->the_post();
        $pid = get_the_ID();
        $items[] = [
          'id'            => $pid,
          'title'         => get_the_title(),
          'amount'        => get_post_meta($pid, '_kodiak_amount', true),
          'currency'      => get_post_meta($pid, '_kodiak_currency', true),
          'payment_date'  => get_post_meta($pid, '_kodiak_payment_date', true),
          'customer_code' => get_post_meta($pid, '_kodiak_customer_code', true),
          'card_id'       => intval(get_post_meta($pid, '_kodiak_card_id', true)),
          'status'        => get_post_meta($pid, '_kodiak_status', true),
          'last_error'    => get_post_meta($pid, '_kodiak_last_error', true),
        ];
      }
      wp_reset_postdata();
    }

    return new WP_REST_Response(['ok' => true, 'items' => $items], 200);
  }

  public function rest_process_due(WP_REST_Request $req) {
    $summary = $this->process_due_payments(true);
    return new WP_REST_Response(array_merge(['ok' => true], $summary), 200);
  }

  public function rest_auth_check(WP_REST_Request $req) {
    $auth = $this->get_payment_auth_header();
    if (empty($auth)) {
      return new WP_REST_Response([
        'ok' => false,
        'auth_ok' => false,
        'error' => 'Missing Bambora credentials in plugin settings (Merchant ID or Payment API Passcode).'
      ], 200);
    }

    // Harmless probe: a GET to a non-existent profile should return 404 if auth is valid, 401 if auth fails.
    $resp = wp_remote_get('https://api.na.bambora.com/v1/profiles/0', [
      'headers' => [
        'Authorization' => $auth,
        'Accept'        => 'application/json',
      ],
      'timeout' => 20,
    ]);

    if (is_wp_error($resp)) {
      return new WP_REST_Response([
        'ok' => false,
        'auth_ok' => false,
        'error' => $resp->get_error_message(),
      ], 200);
    }

    $code = wp_remote_retrieve_response_code($resp);
    $body = wp_remote_retrieve_body($resp);
    $json = json_decode($body, true);

    if ($code === 401) {
      return new WP_REST_Response([
        'ok' => true,
        'auth_ok' => false,
        'http_code' => $code,
        'message' => 'Authentication failed. Verify Merchant ID and PAYMENT API Passcode.',
        'gateway' => $json,
      ], 200);
    }

    if ($code === 404) {
      return new WP_REST_Response([
        'ok' => true,
        'auth_ok' => true,
        'http_code' => $code,
        'message' => 'Credentials valid (profile not found is expected for ID 0).',
        'gateway' => $json,
      ], 200);
    }

    return new WP_REST_Response([
      'ok' => true,
      'auth_ok' => ($code >= 200 && $code < 300),
      'http_code' => $code,
      'message' => 'See gateway payload for details.',
      'gateway' => $json ?: $body,
    ], 200);
  }

  /* ---------- Activation / Cron ---------- */
  public function on_activate() {
    $this->register_cpt();
    flush_rewrite_rules();
    $this->maybe_schedule_cron(true);
  }

  public function on_deactivate() {
    wp_clear_scheduled_hook(self::CRON_HOOK);
    flush_rewrite_rules();
  }

  public function maybe_schedule_cron($force = false) {
    if ($force || !wp_next_scheduled(self::CRON_HOOK)) {
      $timestamp = strtotime('tomorrow 05:15');
      if ($timestamp === false || $timestamp <= time()) {
        $timestamp = time() + 300;
      }
      wp_schedule_event($timestamp, 'daily', self::CRON_HOOK);
    }
  }

  public function cron_entry() {
    $this->process_due_payments(false);
  }

  /* ---------- Processing ---------- */
  private function get_payment_auth_header() {
    $merchant_id     = trim(get_option(self::OPTION_MERCHANT_ID, ''));
    $payment_api_key = trim(get_option(self::OPTION_PAYMENT_API_KEY, ''));
    if (empty($merchant_id) || empty($payment_api_key)) {
      return '';
    }
    $encoded = base64_encode($merchant_id . ':' . $payment_api_key);
    return 'Passcode ' . $encoded;
  }

  private function bambora_endpoint() {
    return 'https://api.na.bambora.com/v1/payments';
  }

  /**
   * Charge all items with payment_date <= today and status = pending
   */
  public function process_due_payments($collectStats = false) {
    $today = current_time('Y-m-d');

    $q = new WP_Query([
      'post_type'      => self::CPT,
      'posts_per_page' => 50,
      'meta_query'     => [
        'relation' => 'AND',
        [
          'key'     => '_kodiak_status',
          'value'   => 'pending',
          'compare' => '=',
        ],
        [
          'key'     => '_kodiak_payment_date',
          'value'   => $today,
          'compare' => '<=',
          'type'    => 'DATE',
        ],
      ],
      'orderby'        => 'meta_value',
      'meta_key'       => '_kodiak_payment_date',
      'order'          => 'ASC',
    ]);

    $auth = $this->get_payment_auth_header();
    if (empty($auth)) {
      if ($collectStats) {
        return ['count' => 0, 'processed' => [], 'failed' => [], 'error' => 'Missing Bambora credentials in plugin settings'];
      }
      return [];
    }

    $processed = [];
    $failed    = [];

    if ($q->have_posts()) {
      while ($q->have_posts()) {
        $q->the_post();
        $pid = get_the_ID();

        $amount        = floatval(get_post_meta($pid, '_kodiak_amount', true));
        $currency      = get_post_meta($pid, '_kodiak_currency', true) ?: 'CAD';
        $customer_code = get_post_meta($pid, '_kodiak_customer_code', true);
        $card_id       = intval(get_post_meta($pid, '_kodiak_card_id', true));

        if ($amount <= 0 || empty($customer_code) || $card_id <= 0) {
          update_post_meta($pid, '_kodiak_status', 'failed');
          update_post_meta($pid, '_kodiak_last_error', 'Invalid payment meta');
          $failed[] = ['id' => $pid, 'error' => 'Invalid meta'];
          continue;
        }

        $payload = [
          'amount'          => floatval(number_format($amount, 2, '.', '')),
          'payment_method'  => 'payment_profile',
          'payment_profile' => [
            'customer_code' => $customer_code,
            'card_id'       => $card_id,
            'complete'      => true,
          ],
          'recurring_payment' => true,
        ];

        $resp = wp_remote_post($this->bambora_endpoint(), [
          'headers' => [
            'Authorization' => $auth,
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
          ],
          'body'    => wp_json_encode($payload),
          'timeout' => 30,
        ]);

        if (is_wp_error($resp)) {
          update_post_meta($pid, '_kodiak_status', 'failed');
          update_post_meta($pid, '_kodiak_last_error', $resp->get_error_message());
          $failed[] = ['id' => $pid, 'error' => $resp->get_error_message()];
          continue;
        }

        $code = wp_remote_retrieve_response_code($resp);
        $body = wp_remote_retrieve_body($resp);
        $json = json_decode($body, true);

        $approved = isset($json['approved']) && (intval($json['approved']) === 1 || $json['approved'] === '1');
        if ($code >= 200 && $code < 300 && $approved) {
          update_post_meta($pid, '_kodiak_status', 'completed');
          update_post_meta($pid, '_kodiak_transaction_id', $json['id'] ?? '');
          update_post_meta($pid, '_kodiak_gateway_response', $body);
          $processed[] = ['id' => $pid, 'transaction_id' => $json['id'] ?? null];
          
          $this->send_payment_to_crm($pid, $amount);
          
          do_action('kodiak_scheduled_payment_completed', $pid, $json);
        } else {
          $err = is_array($json) && isset($json['message']) ? $json['message'] : ('HTTP ' . $code . ' ' . substr($body, 0, 200));
          update_post_meta($pid, '_kodiak_status', 'failed');
          update_post_meta($pid, '_kodiak_last_error', $err);
          update_post_meta($pid, '_kodiak_gateway_response', $body);
          $failed[] = ['id' => $pid, 'error' => $err];
        }
      }
      wp_reset_postdata();
    }

    if ($collectStats) {
      return ['count' => count($processed), 'processed' => $processed, 'failed' => $failed];
    }
    return [];
  }

  public function process_single_payment($pid) {
    $pid = intval($pid);
    if ($pid <= 0 || get_post_type($pid) !== self::CPT) {
      return ['ok' => false, 'error' => 'Invalid payment ID'];
    }

    $auth = $this->get_payment_auth_header();
    if (empty($auth)) {
      return ['ok' => false, 'error' => 'Missing Bambora credentials in plugin settings'];
    }

    $amount        = floatval(get_post_meta($pid, '_kodiak_amount', true));
    $currency      = get_post_meta($pid, '_kodiak_currency', true) ?: 'CAD';
    $customer_code = get_post_meta($pid, '_kodiak_customer_code', true);
    $card_id       = intval(get_post_meta($pid, '_kodiak_card_id', true));

    if ($amount <= 0 || empty($customer_code) || $card_id <= 0) {
      update_post_meta($pid, '_kodiak_status', 'failed');
      update_post_meta($pid, '_kodiak_last_error', 'Invalid payment meta');
      return ['ok' => false, 'error' => 'Invalid payment meta'];
    }

    $payload = [
      'amount'            => floatval(number_format($amount, 2, '.', '')),
      'payment_method'    => 'payment_profile',
      'payment_profile'   => [
        'customer_code' => $customer_code,
        'card_id'       => $card_id,
        'complete'      => true,
      ],
      'recurring_payment' => true,
    ];

    $resp = wp_remote_post($this->bambora_endpoint(), [
      'headers' => [
        'Authorization' => $auth,
        'Content-Type'  => 'application/json',
        'Accept'        => 'application/json',
      ],
      'body'    => wp_json_encode($payload),
      'timeout' => 30,
    ]);

    if (is_wp_error($resp)) {
      update_post_meta($pid, '_kodiak_status', 'failed');
      update_post_meta($pid, '_kodiak_last_error', $resp->get_error_message());
      return ['ok' => false, 'error' => $resp->get_error_message()];
    }

    $code = wp_remote_retrieve_response_code($resp);
    $body = wp_remote_retrieve_body($resp);
    $json = json_decode($body, true);

    $approved = isset($json['approved']) && (intval($json['approved']) === 1 || $json['approved'] === '1');

    // Store raw gateway response for audit
    update_post_meta($pid, '_kodiak_gateway_response', $body);

    if ($code >= 200 && $code < 300 && $approved) {
      update_post_meta($pid, '_kodiak_status', 'completed');
      update_post_meta($pid, '_kodiak_transaction_id', $json['id'] ?? '');
      
      do_action('kodiak_scheduled_payment_completed', $pid, $json);
      
      return ['ok' => true, 'approved' => true, 'id' => $json['id'] ?? null, 'gateway' => $json];
    }

    $err = is_array($json) && isset($json['message']) ? $json['message'] : ('HTTP ' . $code . ' ' . substr($body, 0, 200));
    update_post_meta($pid, '_kodiak_status', 'failed');
    update_post_meta($pid, '_kodiak_last_error', $err);

    return ['ok' => false, 'approved' => false, 'error' => $err, 'gateway' => $json ?: $body, 'http_code' => $code];
  }

  public function rest_retry_payment(WP_REST_Request $req) {
    $p = $req->get_json_params();
    $post_id = intval($p['post_id'] ?? 0);
    if ($post_id <= 0) {
      return new WP_REST_Response(['ok' => false, 'error' => 'Missing post_id'], 400);
    }
    $result = $this->process_single_payment($post_id);
    return new WP_REST_Response(array_merge(['post_id' => $post_id], $result), 200);
  }

  public function add_retry_row_action($actions, $post) {
    if ($post->post_type !== self::CPT) return $actions;
    if (!current_user_can('manage_options')) return $actions;
    $url = wp_nonce_url(
      admin_url('admin-post.php?action=kodiak_retry_payment&post_id=' . $post->ID),
      'kodiak_retry_' . $post->ID
    );
    $actions['kodiak_retry'] = '<a href="' . esc_url($url) . '">Retry now</a>';
    return $actions;
  }

  public function admin_retry_payment() {
    if (!current_user_can('manage_options')) {
      wp_die('Insufficient permissions.');
    }
    $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
    check_admin_referer('kodiak_retry_' . $post_id);
    if ($post_id <= 0 || get_post_type($post_id) !== self::CPT) {
      wp_safe_redirect(admin_url('edit.php?post_type=' . self::CPT . '&kodiak_notice=invalid'));
      exit;
    }
    $result = $this->process_single_payment($post_id);
    $status = $result['ok'] ? 'success' : 'failed';
    $qs = 'kodiak_notice=' . $status . '&post_id=' . $post_id;
    if (!$result['ok'] && !empty($result['error'])) {
      $qs .= '&kodiak_error=' . urlencode($result['error']);
    }
    wp_safe_redirect(admin_url('edit.php?post_type=' . self::CPT . '&' . $qs));
    exit;
  }

  /* ---------- Settings UI ---------- */
  public function register_settings_page() {
    add_options_page(
      'Kodiak Recurring Payments',
      'Kodiak Payments',
      'manage_options',
      'kodiak-recurring-payments',
      [$this, 'render_settings_page']
    );
  }

  public function register_settings() {
    register_setting(self::OPTION_GROUP, self::OPTION_MERCHANT_ID);
    register_setting(self::OPTION_GROUP, self::OPTION_PAYMENT_API_KEY);
    register_setting(self::OPTION_GROUP, self::OPTION_SHARED_SECRET);
    register_setting(self::OPTION_GROUP, self::OPTION_MODE);

    add_settings_section('kodiak_main', 'Bambora Settings', function () {
      echo '<p>Enter your Bambora credentials and shared secret for secure queueing.</p>';
    }, 'kodiak-recurring-payments');

    add_settings_field(self::OPTION_MODE, 'Mode', function () {
      $val = esc_attr(get_option(self::OPTION_MODE, 'sandbox'));
      echo '<select name="'. self::OPTION_MODE .'">
              <option value="sandbox" '. selected($val, 'sandbox', false) .'>Sandbox</option>
              <option value="production" '. selected($val, 'production', false) .'>Production</option>
            </select>';
    }, 'kodiak-recurring-payments', 'kodiak_main');

    add_settings_field(self::OPTION_MERCHANT_ID, 'Merchant ID', function () {
      $val = esc_attr(get_option(self::OPTION_MERCHANT_ID, ''));
      echo '<input type="text" name="'. self::OPTION_MERCHANT_ID .'" value="'. $val .'" class="regular-text" />';
    }, 'kodiak-recurring-payments', 'kodiak_main');

    add_settings_field(self::OPTION_PAYMENT_API_KEY, 'Payment API Passcode', function () {
      $val = esc_attr(get_option(self::OPTION_PAYMENT_API_KEY, ''));
      echo '<input type="password" name="'. self::OPTION_PAYMENT_API_KEY .'" value="'. $val .'" class="regular-text" />';
    }, 'kodiak-recurring-payments', 'kodiak_main');

    add_settings_field(self::OPTION_SHARED_SECRET, 'Shared Secret (for REST)', function () {
      $val = esc_attr(get_option(self::OPTION_SHARED_SECRET, ''));
      echo '<input type="password" name="'. self::OPTION_SHARED_SECRET .'" value="'. $val .'" class="regular-text" />';
      echo '<p class="description">Use this value as the X-Kodiak-Secret header when queueing and processing.</p>';
    }, 'kodiak-recurring-payments', 'kodiak_main');
  }

  public function render_settings_page() {
    if (!current_user_can('manage_options')) return;
    echo '<div class="wrap">';
    echo '<h1>Kodiak Recurring Payments</h1>';
    echo '<form method="post" action="options.php">';
    settings_fields(self::OPTION_GROUP);
    do_settings_sections('kodiak-recurring-payments');
    submit_button();
    echo '</form></div>';
  }

  public function kodiak_add_meta_boxes() {
    add_meta_box(
      'kodiak_payment_details',
      'Kodiak Payment Details',
      [$this, 'kodiak_mb_details'],
      self::CPT,
      'normal',
      'high'
    );

    add_meta_box(
      'kodiak_gateway_response',
      'Gateway Response (raw)',
      [$this, 'kodiak_mb_gateway_raw'],
      self::CPT,
      'normal',
      'default'
    );
  }

  public function kodiak_mb_details($post) {
    $meta = function(string $key, $default = '') use ($post) {
      $v = get_post_meta($post->ID, $key, true);
      return $v !== '' && $v !== null ? $v : $default;
    };

    $rows = [
      ['Amount',           $meta('_kodiak_amount')],
      ['Currency',         $meta('_kodiak_currency', 'CAD')],
      ['Payment Date',     $meta('_kodiak_payment_date')],
      ['Customer Code',    $meta('_kodiak_customer_code')],
      ['Card ID',          $meta('_kodiak_card_id')],
      ['Status',           $meta('_kodiak_status', 'pending')],
      ['Last Error',       $meta('_kodiak_last_error')],
      ['Transaction ID',   $meta('_kodiak_transaction_id')],
    ];

    echo '<table class="widefat striped">';
    echo '<tbody>';
    foreach ($rows as [$label, $value]) {
      echo '<tr>';
      echo '<th style="width:180px;">' . esc_html($label) . '</th>';
      echo '<td><code>' . esc_html(is_scalar($value) ? (string)$value : wp_json_encode($value)) . '</code></td>';
      echo '</tr>';
    }
    echo '</tbody>';
    echo '</table>';

    echo '<p style="margin-top:8px;" class="description">';
    echo 'These fields are read-only and reflect what the processor stored. ';
    echo 'To edit raw meta, enable “Custom fields” in the editor preferences.';
    echo '</p>';
  }

  public function kodiak_mb_gateway_raw($post) {
    $raw = get_post_meta($post->ID, '_kodiak_gateway_response', true);
    if (empty($raw)) {
      echo '<p>No gateway response is stored for this entry.</p>';
      return;
    }
    // Pretty-print JSON if possible
    $out = $raw;
    $decoded = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE) {
      $out = wp_json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }
    echo '<textarea readonly style="width:100%;min-height:280px;">' . esc_textarea($out) . '</textarea>';
    echo '<p class="description">Stored raw gateway response (success or failure). Sensitive fields may be masked by the gateway.</p>';
  }

  public function kodiak_admin_columns($cols) {
    // Keep the checkbox and title, then add our fields
    $new = [];
    foreach ($cols as $k => $v) {
      $new[$k] = $v;
      if ($k === 'title') {
        $new['kodiak_payment_date'] = 'Payment Date';
        $new['kodiak_amount'] = 'Amount';
        $new['kodiak_customer'] = 'Customer Code';
        $new['kodiak_card'] = 'Card ID';
        $new['kodiak_status'] = 'Status';
        $new['kodiak_error'] = 'Error';
      }
    }
    return $new;
  }

  public function kodiak_render_admin_columns($column, $post_id) {
    switch ($column) {
      case 'kodiak_payment_date':
        echo esc_html(get_post_meta($post_id, '_kodiak_payment_date', true));
        break;
      case 'kodiak_amount':
        $amt = get_post_meta($post_id, '_kodiak_amount', true);
        $ccy = get_post_meta($post_id, '_kodiak_currency', true) ?: 'CAD';
        echo esc_html($amt !== '' ? ($amt . ' ' . $ccy) : '');
        break;
      case 'kodiak_customer':
        echo '<code>' . esc_html(get_post_meta($post_id, '_kodiak_customer_code', true)) . '</code>';
        break;
      case 'kodiak_card':
        echo esc_html(get_post_meta($post_id, '_kodiak_card_id', true));
        break;
      case 'kodiak_status':
        echo esc_html(get_post_meta($post_id, '_kodiak_status', true));
        break;
      case 'kodiak_error':
        $err = get_post_meta($post_id, '_kodiak_last_error', true);
        if ($err) {
          echo '<span title="' . esc_attr($err) . '">' . esc_html(mb_strimwidth($err, 0, 60, '…')) . '</span>';
        }
        break;
    }
  }

  public function kodiak_sortable_columns($cols) {
    $cols['kodiak_payment_date'] = 'kodiak_payment_date';
    $cols['kodiak_status'] = 'kodiak_status';
    return $cols;
  }

  private function send_payment_to_crm($payment_id, $amount) {
    // CRM integration temporarily disabled for scheduled payments
    error_log("CRM integration disabled for scheduled payment {$payment_id}");
  }
}

new Kodiak_Recurring_Payments_Plugin();
