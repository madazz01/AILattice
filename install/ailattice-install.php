<?php
/**
 * AILattice™ Installer
 * Upload this file to your website root, visit it once, enter your certificate ID.
 * It will create all 4 required files then delete itself.
 *
 * Requirements: PHP 7.2+, allow_url_fopen or cURL enabled
 */

define('AIL_API', 'https://ailattice.io/api');
define('AIL_VER', '1.0.0');

session_start();

$root  = rtrim($_SERVER['DOCUMENT_ROOT'], DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
$error = '';
$cert  = null;
$done  = false;

// ── Handle form submit ────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cert_id'])) {
    $cert_id = trim(htmlspecialchars($_POST['cert_id'], ENT_QUOTES, 'UTF-8'));

    if (!$cert_id) {
        $error = 'Please enter your certificate ID.';
    } else {
        // Fetch cert from ailattice.io
        $api_url  = AIL_API . '/cert/' . rawurlencode($cert_id);
        $response = ail_fetch($api_url);

        if (!$response) {
            $error = 'Could not connect to ailattice.io. Please check your server has outbound internet access.';
        } else {
            $cert = json_decode($response, true);

            if (empty($cert['cert_id'])) {
                $error = 'Certificate ID not found. Please double-check your ID from ailattice.io.';
            } else {
                // Verify domain matches
                $cert_host = strtolower(preg_replace('/^www\./', '', parse_url($cert['site_url'], PHP_URL_HOST) ?? ''));
                $this_host = strtolower(preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? ''));

                if ($cert_host !== $this_host && $cert_id !== 'demo') {
                    $error = "This certificate was issued for <strong>{$cert_host}</strong>, not <strong>{$this_host}</strong>. "
                           . "Please use a certificate for this domain.";
                } else {
                    // Write files
                    $write_error = ail_write_files($root, $cert);
                    if ($write_error) {
                        $error = $write_error;
                    } else {
                        $done = true;
                        // Self-delete
                        @unlink(__FILE__);
                    }
                }
            }
        }
    }
}

// ── File writer ───────────────────────────────────────────────────────────────

function ail_write_files($root, $cert) {
    $url  = rtrim($cert['site_url'], '/');
    $host = parse_url($url, PHP_URL_HOST);
    $name = $host;
    $desc = "Website at {$url}.";
    $date = date('Y-m-d');

    if (!is_writable($root)) {
        return 'Cannot write to your site root. Please set the root folder to be writable (755 or 777) and try again.';
    }

    // /llms.txt
    $llms = "# {$name} — llms.txt\n\nname: {$name}\ndescription: {$desc}\nurl: {$url}\nai-entry: {$url}/ai/index.md\n\n## AI Navigation\nStart at /ai/index.md for a full overview.\nSee /ai/sitemap.md for all AI-navigable pages.\n\n## About\n{$desc}\n";
    if (file_put_contents($root . 'llms.txt', $llms) === false) {
        return 'Could not write llms.txt. Please check file permissions.';
    }

    // /ai/ directory
    $ai = $root . 'ai' . DIRECTORY_SEPARATOR;
    if (!is_dir($ai) && !mkdir($ai, 0755, true)) {
        return 'Could not create the /ai/ folder. Please check file permissions.';
    }

    // /ai/index.md
    $index = "---\ntitle: {$name} — AI Overview\ndescription: {$desc}\nlast-updated: {$date}\n---\n\n# {$name}\n\n{$desc}\n\n## Pages\n- [Home](/ai/index.md)\n- [Sitemap](/ai/sitemap.md)\n\n## Links\n- [Home]({$url})\n";
    file_put_contents($ai . 'index.md', $index);

    // /ai/sitemap.md
    $sitemap = "---\ntitle: {$name} — AI Sitemap\ndescription: All AI-navigable pages on {$name}.\nlast-updated: {$date}\n---\n\n# AI Sitemap — {$name}\n\n- [Index](/ai/index.md) — Main overview and entry point\n";
    file_put_contents($ai . 'sitemap.md', $sitemap);

    return null;
}

// ── HTTP fetcher ──────────────────────────────────────────────────────────────

function ail_fetch($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($code === 200) ? $body : false;
    }
    if (ini_get('allow_url_fopen')) {
        $ctx = stream_context_create(['http' => [
            'timeout' => 15,
            'header'  => "Accept: application/json\r\n",
        ]]);
        $body = @file_get_contents($url, false, $ctx);
        return $body ?: false;
    }
    return false;
}

?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AILattice™ Installer</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0c0c0c;
      color: #c2c2c2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 15px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #131313;
      border: 1px solid #242424;
      border-radius: 12px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: monospace;
      font-size: 16px;
      font-weight: 700;
      color: #f0f0f0;
      margin-bottom: 28px;
    }
    .logo img { width: 28px; }
    .logo em  { color: #22c55e; font-style: normal; }
    h1 { font-size: 20px; color: #f0f0f0; font-weight: 700; margin-bottom: 8px; letter-spacing: -.3px; }
    p  { font-size: 14px; color: #777; line-height: 1.6; margin-bottom: 20px; }
    label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
    .input-row { display: flex; gap: 0; margin-bottom: 10px; }
    input[type=text] {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #2e2e2e;
      border-right: none;
      border-radius: 7px 0 0 7px;
      color: #f0f0f0;
      font-family: monospace;
      font-size: 14px;
      padding: 12px 16px;
      outline: none;
      transition: border-color .15s;
    }
    input[type=text]:focus { border-color: #22c55e; }
    input::placeholder { color: #444; }
    button[type=submit] {
      background: #22c55e;
      color: #000;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 22px;
      border: none;
      border-radius: 0 7px 7px 0;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity .15s;
    }
    button[type=submit]:hover { opacity: .88; }
    .hint { font-size: 12px; color: #444; }
    .err {
      background: rgba(239,68,68,.08);
      border: 1px solid rgba(239,68,68,.25);
      border-radius: 8px;
      padding: 12px 16px;
      color: #ef4444;
      font-size: 14px;
      margin-bottom: 18px;
    }
    .steps { list-style: none; margin: 24px 0 0; border-top: 1px solid #242424; padding-top: 20px; }
    .steps li { display: flex; gap: 10px; padding: 7px 0; font-size: 14px; color: #777; }
    .steps li::before { content: '✓'; color: #22c55e; flex-shrink: 0; font-weight: 700; }
    .success-icon { font-size: 40px; margin-bottom: 16px; }
    .success h1 { color: #22c55e; }
    .success p  { color: #c2c2c2; }
    .cert-id { font-family: monospace; background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 5px; padding: 8px 14px; font-size: 13px; color: #22c55e; margin: 12px 0; display: inline-block; }
    a { color: #22c55e; }
    code { font-family: monospace; font-size: 12.5px; background: #1a1a1a; color: #86efac; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
<div class="card">

  <div class="logo">
    <img src="https://ailattice.io/icon.svg" alt="AILattice">
    AI<em>Lattice</em>™ <span style="color:#555;font-size:12px;font-weight:400;margin-left:4px;">Installer</span>
  </div>

  <?php if ($done): ?>

    <div class="success">
      <div class="success-icon">✓</div>
      <h1>Your site is AI-ready</h1>
      <p style="margin-bottom:12px">AILattice files have been created successfully.</p>
      <div class="cert-id"><?php echo htmlspecialchars($cert['cert_id']); ?></div>
      <p>
        <a href="https://ailattice.io/cert/<?php echo rawurlencode($cert['cert_id']); ?>" target="_blank">
          View your certificate →
        </a>
      </p>
    </div>

    <ul class="steps">
      <li><code>llms.txt</code> created in your site root</li>
      <li><code>ai/index.md</code> created</li>
      <li><code>ai/sitemap.md</code> created</li>
      <li>This installer file has been deleted</li>
    </ul>

    <p style="margin-top:20px;font-size:13px;color:#555;">
      Add the <code>&lt;link rel="alternate" type="text/markdown" href="/ai/"&gt;</code>
      tag to your HTML <code>&lt;head&gt;</code> to complete the standard, then
      <a href="https://ailattice.io/validate" target="_blank">validate your site</a>.
    </p>

  <?php else: ?>

    <h1>Activate AILattice™</h1>
    <p>
      Enter your certificate ID from
      <a href="https://ailattice.io" target="_blank">ailattice.io</a>.
      This script will create all required files and then delete itself.
    </p>

    <?php if ($error): ?>
    <div class="err">⚠ <?php echo $error; ?></div>
    <?php endif; ?>

    <form method="post">
      <label for="cert_id">Certificate ID</label>
      <div class="input-row">
        <input type="text" id="cert_id" name="cert_id"
               placeholder="AIL-20260619-XXXX"
               value="<?php echo htmlspecialchars($_POST['cert_id'] ?? ''); ?>"
               autocomplete="off" spellcheck="false" required>
        <button type="submit">Activate →</button>
      </div>
    </form>
    <p class="hint">Your certificate ID was emailed to you after purchase at ailattice.io</p>

    <ul class="steps">
      <li>Creates <code>/llms.txt</code> — AI discovery file</li>
      <li>Creates <code>/ai/index.md</code> and <code>/ai/sitemap.md</code></li>
      <li>Verifies against your official certificate</li>
      <li>Deletes this installer file when done</li>
    </ul>

  <?php endif; ?>

</div>
</body>
</html>
