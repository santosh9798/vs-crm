<?php
/**
 * POSTs a signed JSON payload to VS CRM when a website form is submitted.
 * Called from quick_form_api.php. Failures are logged and never block the form.
 */

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

function vs_crm_notify_lead(array $lead)
{
    $configFile = __DIR__ . '/vs-crm-webhook-config.php';
    if (!is_file($configFile)) {
        error_log('VS CRM webhook: config file missing');
        return false;
    }
    $config = include $configFile;
    $url = trim((string) ($config['url'] ?? ''));
    $secret = (string) ($config['secret'] ?? '');
    $timeout = (int) ($config['timeout'] ?? 8);
    if ($url === '' || $secret === '' || strpos($secret, 'PASTE_') === 0) {
        error_log('VS CRM webhook: url or secret not set');
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
        error_log('VS CRM webhook: could not encode JSON');
        return false;
    }

    $timestamp = (string) time();
    $signature = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $raw, $secret);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $raw,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Timestamp: ' . $timestamp,
                'X-Signature: ' . $signature,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($body === false || $status < 200 || $status >= 300) {
            error_log('VS CRM webhook failed HTTP ' . $status . ' ' . $error . ' ' . substr((string) $body, 0, 300));
            return false;
        }
        return true;
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
    if ($body === false) {
        error_log('VS CRM webhook failed: file_get_contents error');
        return false;
    }
    return true;
}
