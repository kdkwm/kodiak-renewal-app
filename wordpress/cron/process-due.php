<?php
declare(strict_types=1);

/**
 * Cron wrapper to call the WordPress processor with POST and secret header.
 * Place this file inside your WP app, e.g. public_html/cron/process-due.php
 * Then schedule it from Cloudways Cron Job Management with Type=PHP.
 */

// CONFIG: set your domain and secret.
$domain = getenv('KODIAK_DOMAIN') ?: 'kodiaksnowremoval.ca';

// Prefer environment variable if you set it in Cloudways; otherwise fallback.
$secret = getenv('KODIAK_SHARED_SECRET');
if ($secret === false || $secret === '') {
  // Fallback to your current shared secret. You can change this value if you rotate the secret.
  $secret = 'REPLACE_WITH_YOUR_SHARED_SECRET'; // same as WP_KODIAK_SHARED_SECRET
}

$url = "https://{$domain}/wp-json/kodiak/v1/process-due";

// Use cURL to POST with header
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'x-kodiak-secret: ' . $secret,
    'Accept: application/json',
  ],
  CURLOPT_TIMEOUT => 45,
  CURLOPT_FAILONERROR => false, // We want to capture any response for logging
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error    = curl_error($ch);
curl_close($ch);

// Basic logging to PHP error log so you can see runs in Cloudways logs.
if ($response === false || $httpCode >= 400) {
  error_log('[kodiak-cron] process-due FAILED: HTTP ' . $httpCode . ' error=' . ($error ?: 'none'));
  if ($response !== false) {
    error_log('[kodiak-cron] body: ' . substr($response, 0, 500));
  }
  http_response_code(500);
  echo "FAIL {$httpCode} " . ($error ?: '');
  exit(1);
}

error_log('[kodiak-cron] process-due OK: HTTP ' . $httpCode . ' resp=' . substr((string)$response, 0, 500));
echo "OK {$httpCode}";
exit(0);
