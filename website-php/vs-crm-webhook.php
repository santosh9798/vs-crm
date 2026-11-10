<?php
/**
 * POSTs a signed JSON payload to VS CRM after the website form has already
 * returned success. Failures are logged and never block the visitor.
 */

function vs_crm_log($message)
{
    $line = date('c') . ' ' . $message . "\n";
    @file_put_contents(__DIR__ . '/vs-crm-webhook.log', $line, FILE_APPEND | LOCK_EX);
    error_log('VS CRM webhook: ' . $message);
}

function vs_crm_reply_now(array $response)
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    $json = json_encode($response);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Length: ' . strlen($json));
        header('Connection: close');
    }
    echo $json;
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } elseif (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        flush();
    }
    ignore_user_abort(true);
    if (function_exists('set_time_limit')) {
        @set_time_limit(90);
    }
}

function vs_crm_self_url($script)
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (string) ($_SERVER['SERVER_PORT'] ?? '') === '443'
        || (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
    $host = $_SERVER['HTTP_HOST'] ?? 'vospaces.com';
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    $dir = rtrim($dir, '/');
    return ($https ? 'https' : 'http') . '://' . $host . ($dir ? $dir : '') . '/' . ltrim($script, '/');
}

function vs_crm_kick_after(array $lead)
{
    $dir = __DIR__ . '/vs-crm-jobs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $id = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) ($lead['enquiry_id'] ?? uniqid('job', true)));
    $jobFile = $dir . '/' . $id . '.json';
    @file_put_contents($jobFile, json_encode($lead, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

    $url = vs_crm_self_url('vs-crm-after.php');
    $configFile = __DIR__ . '/vs-crm-webhook-config.php';
    $config = is_file($configFile) ? include $configFile : [];
    $token = (string) ($config['secret'] ?? '');
    $payload = json_encode(['token' => $token, 'job' => $id, 'lead' => $lead]);

    if (function_exists('exec')) {
        $cmd = 'curl -sS -m 45 -H ' . escapeshellarg('Content-Type: application/json') . ' -d ' . escapeshellarg($payload) . ' ' . escapeshellarg($url) . ' > /dev/null 2>&1 &';
        @exec($cmd);
        vs_crm_log('kicked after.php via exec job ' . $id);
        return;
    }

    if (!function_exists('curl_init')) {
        vs_crm_log('cannot kick after.php (no curl/exec) job ' . $id);
        return;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT_MS => 250,
        CURLOPT_NOSIGNAL => 1,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    ]);
    curl_exec($ch);
    curl_close($ch);
    vs_crm_log('kicked after.php via curl job ' . $id);
}

function vs_crm_plan_from_purpose($raw)
{
    $value = strtolower(trim((string) $raw));
    $map = [
        'gst_registration' => 'GST Registration',
        'gst registration' => 'GST Registration',
        'gst' => 'GST Registration',
        'mailing_address' => 'Mailing Address',
        'mailing address' => 'Mailing Address',
        'business_registration' => 'Business Registration',
        'business registration' => 'Business Registration',
        'bank_account_opening' => 'Business Registration',
        'transferring_address' => 'Mailing Address',
        'ecommerce_registration' => 'GST Registration',
    ];
    return $map[$value] ?? '';
}

function vs_crm_utm_from_url($url)
{
    $utm = [];
    $query = parse_url((string) $url, PHP_URL_QUERY);
    if (!$query) {
        return null;
    }
    parse_str($query, $parts);
    foreach (['utm_source' => 'source', 'utm_campaign' => 'campaign', 'utm_medium' => 'medium'] as $from => $to) {
        if (!empty($parts[$from])) {
            $utm[$to] = (string) $parts[$from];
        }
    }
    return $utm ?: null;
}

function vs_crm_http_post($url, $raw, $timestamp, $signature, $timeout)
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $headers = [
            'Content-Type: application/json',
            'X-Timestamp: ' . $timestamp,
            'X-Signature: ' . $signature,
        ];
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $raw,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        return [$status, $body, $error];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nX-Timestamp: {$timestamp}\r\nX-Signature: {$signature}\r\n",
            'content' => $raw,
            'timeout' => $timeout,
            'ignore_errors' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body !== false && strpos((string) $body, '"received"') !== false) {
        return [202, $body, ''];
    }
    return [0, $body, $body === false ? 'file_get_contents failed' : 'unexpected response'];
}

function vs_crm_notify_lead(array $lead)
{
    $configFile = __DIR__ . '/vs-crm-webhook-config.php';
    if (!is_file($configFile)) {
        vs_crm_log('config file missing');
        return false;
    }
    $config = include $configFile;
    $url = trim((string) ($config['url'] ?? ''));
    $secret = (string) ($config['secret'] ?? '');
    $timeout = (int) ($config['timeout'] ?? 20);
    if ($timeout < 10) {
        $timeout = 20;
    }
    if ($url === '' || $secret === '' || strpos($secret, 'PASTE_') === 0) {
        vs_crm_log('url or secret not set');
        return false;
    }

    $enquiryId = trim((string) ($lead['enquiry_id'] ?? ''));
    $submissionId = $enquiryId !== '' ? ('web-' . $enquiryId) : ('web-' . date('YmdHis') . '-' . bin2hex(random_bytes(3)));
    $pageUrl = trim((string) ($lead['page_url'] ?? ''));
    $location = trim((string) ($lead['location'] ?? ''));
    $requirement = trim((string) ($lead['requirement'] ?? ''));
    $planType = vs_crm_plan_from_purpose($requirement);
    $submittedAt = (new DateTime('now', new DateTimeZone('Asia/Kolkata')))->format('c');
    $payload = [
        'submission_id' => $submissionId,
        'submitted_at' => $submittedAt,
        'name' => trim((string) ($lead['name'] ?? '')),
        'mobile' => trim((string) ($lead['mobile'] ?? '')),
        'email' => trim((string) ($lead['email'] ?? '')),
        'state' => trim((string) ($lead['state'] ?? '')),
        'city' => $location,
        'message' => $requirement,
        'page_url' => $pageUrl,
        'preferred_location' => $location,
        'plan_type' => $planType,
        'company' => $location,
        'form_source' => trim((string) ($lead['source'] ?? 'Website Form')),
    ];
    $utm = vs_crm_utm_from_url($pageUrl);
    if ($utm) {
        $payload['utm'] = $utm;
    }

    $raw = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($raw === false) {
        vs_crm_log('could not encode JSON');
        return false;
    }

    for ($attempt = 1; $attempt <= 2; $attempt++) {
        $timestamp = (string) time();
        $signature = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $raw, $secret);
        [$status, $body, $error] = vs_crm_http_post($url, $raw, $timestamp, $signature, $timeout);
        if ($status >= 200 && $status < 300) {
            vs_crm_log("ok HTTP {$status} {$submissionId} attempt {$attempt}");
            return true;
        }
        vs_crm_log("fail HTTP {$status} {$submissionId} attempt {$attempt} {$error} " . substr((string) $body, 0, 300));
        if ($attempt === 1) {
            usleep(400000);
        }
    }
    return false;
}
