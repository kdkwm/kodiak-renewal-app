<?php
/**
 * Title: Kodiak Recurring Payments (WPCode Snippet)
 * Description: Drop-in snippet for WPCode. Registers CPT + secure REST endpoints + daily processor without plugin activation hooks.
 * Run snippet everywhere (Front-end + Admin). Auto-insert: On.
 *
 * IMPORTANT:
 * - Set your credentials below or define them in wp-config.php as constants.
 * - No settings screen is provided. For a full UI and lifecycle hooks, use the plugin version instead.
 */

// 1) Configure credentials (prefer defining these in wp-config.php)
if (!defined('KODIAK_MERCHANT_ID'))     define('KODIAK_MERCHANT_ID', '');
if (!defined('KODIAK_PAYMENT_API_KEY')) define('KODIAK_PAYMENT_API_KEY', '');
if (!defined('KODIAK_SHARED_SECRET'))   define('KODIAK_SHARED_SECRET', '');
if (!defined('KODIAK_MODE'))            define('KODIAK_MODE', 'sandbox'); // not used directly but reserved

// 2) Constants
if (!defined('KODIAK_CPT'))       define('KODIAK_CPT', 'kodiak_payment');
if (!defined('KODIAK_CRON_HOOK')) define('KODIAK_CRON_HOOK', 'kodiak_process_recurring_payments');

// 3) Register CPT
add_action('init', function () {
  register_post_type(KODIAK_CPT, [
    'label' => 'Scheduled Payments',
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => true,
    'supports' => ['title', 'custom-fields'],
    'menu_icon' => 'dashicons-calendar-alt',
  ]);
});

// 4) REST routes (queue, list, process)
add_action('rest_api_init', function () {
  register_rest_route('kodiak/v1', '/queue-payment', [
    'methods' => 'POST',
    'callback' => 'kodiak_rest_queue_payment',
    'permission_callback' => 'kodiak_rest_auth',
  ]);

  register_rest_route('kodiak/v1', '/payments', [
    'methods' => 'GET',
    'callback' => 'kodiak_rest_list_payments',
    'permission_callback' => 'kodiak_rest_auth',
  ]);

  register_rest_route('kodiak/v1', '/process-due', [
    'methods' => 'POST',
    'callback' => 'kodiak_rest_process_due',
    'permission_callback' => 'kodiak_rest_auth',
  ]);
});

function kodiak_rest_auth(WP_REST_Request $request) {
  $header = $request->get_header('x-kodiak-secret');
  return !empty(KODIAK_SHARED_SECRET) && hash_equals(KODIAK_SHARED_SECRET, (string)$header);
}

function kodiak_rest_queue_payment(WP_REST_Request $req) {
  $params = $req->get_json_params();
  $amount = isset($params['amount']) ? floatval($params['amount']) : 0;
  $currency = sanitize_text_field($params['currency'] ?? 'CAD');
  $payment_date = sanitize_text_field($params['payment_date'] ?? '');
  $customer_code = sanitize_text_field($params['customer_code'] ?? '');
  $card_id = intval($params['card_id'] ?? 0);

  $contract_id = sanitize_text_field($params['contract_id'] ?? '');
  $service_address = sanitize_text_field($params['service_address'] ?? '');
  $customer_name = sanitize_text_field($params['customer_name'] ?? '');
  $customer_email = sanitize_email($params['customer_email'] ?? '');
  $customer_phone = sanitize_text_field($params['customer_phone'] ?? '');
  $metadata = is_array($params['metadata'] ?? null) ? $params['metadata'] : [];

  if ($amount <= 0 || empty($payment_date) || empty($customer_code) || $card_id <= 0) {
    return new WP_REST_Response(['error' => 'Invalid payload'], 400);
  }

  $title = sprintf('Payment %s — %s', $payment_date, $customer_name ?: $customer_code);
  $post_id = wp_insert_post([
    'post_type' => KODIAK_CPT,
    'post_status' => 'publish',
    'post_title' => $title,
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

function kodiak_rest_list_payments(WP_REST_Request $req) {
  $status = sanitize_text_field($req->get_param('status') ?? 'pending');
  $meta_query = [];
  if (in_array($status, ['pending','completed','failed'], true)) {
    $meta_query[] = [
      'key' => '_kodiak_status',
      'value' => $status,
      'compare' => '=',
    ];
  }

  $q = new WP_Query([
    'post_type' => KODIAK_CPT,
    'posts_per_page' => 100,
    'post_status' => 'publish',
    'orderby' => 'meta_value',
    'meta_key' => '_kodiak_payment_date',
    'order' => 'ASC',
    'meta_query' => $meta_query ?: null,
  ]);

  $items = [];
  while ($q->have_posts()) {
    $q->the_post();
    $post_id = get_the_ID();
    $items[] = [
      'id' => $post_id,
      'amount' => get_post_meta($post_id, '_kodiak_amount', true),
      'currency' => get_post_meta($post_id, '_kodiak_currency', true),
      'payment_date' => get_post_meta($post_id, '_kodiak_payment_date', true),
      'customer_code' => get_post_meta($post_id, '_kodiak_customer_code', true),
      'card_id' => intval(get_post_meta($post_id, '_kodiak_card_id', true)),
      'status' => get_post_meta($post_id, '_kodiak_status', true),
      'last_error' => get_post_meta($post_id, '_kodiak_last_error', true),
    ];
  }
  wp_reset_postdata();

  return new WP_REST_Response(['items' => $items], 200);
}

function kodiak_rest_process_due(WP_REST_Request $req) {
  $summary = kodiak_process_due_payments(true);
  return new WP_REST_Response($summary, 200);
}

// 5) Cron: schedule daily if missing (since we lack activation hooks in WPCode)
add_action('init', function () {
  if (!wp_next_scheduled(KODIAK_CRON_HOOK)) {
    wp_schedule_event(time() + 300, 'daily', KODIAK_CRON_HOOK);
  }
});
add_action(KODIAK_CRON_HOOK, function () { kodiak_process_due_payments(false); });

function kodiak_bambora_auth_header() {
  if (empty(KODIAK_MERCHANT_ID) || empty(KODIAK_PAYMENT_API_KEY)) return '';
  $encoded = base64_encode(KODIAK_MERCHANT_ID . ':' . KODIAK_PAYMENT_API_KEY);
  return 'Passcode ' . $encoded;
}
function kodiak_bambora_endpoint() {
  return 'https://api.na.bambora.com/v1/payments';
}

function kodiak_process_due_payments($returnSummary = false) {
  $today = current_time('Y-m-d');
  $q = new WP_Query([
    'post_type' => KODIAK_CPT,
    'posts_per_page' => 50,
    'meta_query' => [
      'relation' => 'AND',
      [
        'key' => '_kodiak_status',
        'value' => 'pending',
        'compare' => '=',
      ],
      [
        'key' => '_kodiak_payment_date',
        'value' => $today,
        'compare' => '<=',
        'type' => 'DATE',
      ],
    ],
    'orderby' => 'meta_value',
    'meta_key' => '_kodiak_payment_date',
    'order' => 'ASC',
  ]);

  $processed = [];
  if ($q->have_posts()) {
    while ($q->have_posts()) {
      $q->the_post();
      $post_id = get_the_ID();
      $processed[] = ['id' => $post_id, 'result' => kodiak_process_single_payment($post_id)];
    }
    wp_reset_postdata();
  }

  if ($returnSummary) {
    return ['ok' => true, 'count' => count($processed), 'processed' => $processed];
  }
}

function kodiak_process_single_payment($post_id) {
  $status = get_post_meta($post_id, '_kodiak_status', true);
  if ($status !== 'pending') return 'skipped';

  $amount = floatval(get_post_meta($post_id, '_kodiak_amount', true));
  $customer_code = get_post_meta($post_id, '_kodiak_customer_code', true);
  $card_id = intval(get_post_meta($post_id, '_kodiak_card_id', true));

  if ($amount <= 0 || empty($customer_code) || $card_id <= 0) {
    update_post_meta($post_id, '_kodiak_status', 'failed');
    update_post_meta($post_id, '_kodiak_last_error', 'Invalid payment meta');
    return 'invalid';
  }

  $payload = [
    'amount' => floatval(number_format($amount, 2, '.', '')),
    'payment_method' => 'payment_profile',
    'payment_profile' => [
      'customer_code' => $customer_code,
      'card_id' => $card_id,
      'complete' => true,
    ],
    'recurring_payment' => true,
  ];

  $headers = [
    'Authorization' => kodiak_bambora_auth_header(),
    'Content-Type'  => 'application/json',
  ];
  if (empty($headers['Authorization'])) {
    update_post_meta($post_id, '_kodiak_status', 'failed');
    update_post_meta($post_id, '_kodiak_last_error', 'Missing Bambora credentials (constants)');
    return 'no-creds';
  }

  $resp = wp_remote_post(kodiak_bambora_endpoint(), [
    'headers' => $headers,
    'body' => wp_json_encode($payload),
    'timeout' => 30,
  ]);

  if (is_wp_error($resp)) {
    update_post_meta($post_id, '_kodiak_status', 'failed');
    update_post_meta($post_id, '_kodiak_last_error', $resp->get_error_message());
    return 'wp-error';
  }

  $code = wp_remote_retrieve_response_code($resp);
  $body = wp_remote_retrieve_body($resp);
  $json = json_decode($body, true);
  $approved = isset($json['approved']) && ($json['approved'] === 1 || $json['approved'] === '1' || $json['approved'] === true);

  if ($code >= 200 && $code < 300 && $approved) {
    update_post_meta($post_id, '_kodiak_status', 'completed');
    update_post_meta($post_id, '_kodiak_transaction_id', $json['id'] ?? '');
    update_post_meta($post_id, '_kodiak_gateway_response', $body);
    return 'completed';
  } else {
    $err = is_array($json) && isset($json['message']) ? $json['message'] : ('HTTP ' . $code . ' ' . substr($body, 0, 200));
    update_post_meta($post_id, '_kodiak_status', 'failed');
    update_post_meta($post_id, '_kodiak_last_error', $err);
    update_post_meta($post_id, '_kodiak_gateway_response', $body);
    return 'failed';
  }
}
