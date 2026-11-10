<?php
/**
 * Copy to vs-crm-webhook-config.php on vospaces.com.
 * Secret must match Vercel env WEBSITE_WEBHOOK_SECRET.
 */
return [
    'url' => 'https://vs-crm-psi.vercel.app/api/webhooks/website',
    'secret' => 'PASTE_VERCEL_WEBSITE_WEBHOOK_SECRET',
    'timeout' => 8,
];
