<?php
/**
 * Plugin Name: Kodiak Email Sender
 * Description: Handles email sending via wp_mail for the Kodiak system
 * Version: 1.0.0
 * Author: Kodiak
 */

if (!defined('ABSPATH')) { exit; }

class Kodiak_Email_Sender {
  const REST_NS = 'kodiak/v1';
  const ROUTE_SEND_EMAIL = '/send-email';
  
  public function __construct() {
    add_action('rest_api_init', [$this, 'register_rest_routes']);
  }

  public function register_rest_routes() {
    register_rest_route(self::REST_NS, self::ROUTE_SEND_EMAIL, [
      'methods'             => 'POST',
      'callback'            => [$this, 'rest_send_email'],
      'permission_callback' => [$this, 'rest_auth'],
    ]);
  }

  public function rest_auth(WP_REST_Request $req) {
    $shared = (string) get_option('kodiak_receipt_shared_secret', '');
    $header = (string) $req->get_header('x-kodiak-secret');
    return !empty($shared) && hash_equals($shared, $header);
  }

  public function rest_send_email(WP_REST_Request $req) {
    $p = $req->get_json_params();

    $to = sanitize_email($p['to'] ?? '');
    $subject = sanitize_text_field($p['subject'] ?? '');
    $html = wp_kses_post($p['html'] ?? '');
    $from_name = sanitize_text_field($p['from_name'] ?? 'Kodiak Snow Removal');
    $from_email = sanitize_email($p['from_email'] ?? get_option('admin_email'));

    if (empty($to) || empty($subject) || empty($html)) {
      return new WP_REST_Response(['error' => 'Missing required fields'], 400);
    }

    $headers = [
      'Content-Type: text/html; charset=UTF-8',
      'From: ' . $from_name . ' <' . $from_email . '>',
    ];

    $sent = wp_mail($to, $subject, $html, $headers);

    if ($sent) {
      return new WP_REST_Response(['success' => true, 'message' => 'Email sent successfully'], 200);
    } else {
      return new WP_REST_Response(['success' => false, 'error' => 'Failed to send email via wp_mail'], 500);
    }
  }
}

new Kodiak_Email_Sender();
