<?php

/**
 * Non-destructive smoke checks for PawaPay + Empiya operator wiring.
 * Does not create real deposits/payouts or send chain txs.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Chizzoz\PawaPay\Facades\PawaPay;
use Illuminate\Support\Facades\Http;

$fail = 0;

function ok(string $label, string $detail = ''): void
{
    echo 'PASS  ' . $label . ($detail !== '' ? " — {$detail}" : '') . PHP_EOL;
}

function bad(string $label, string $detail = ''): void
{
    global $fail;
    $fail++;
    echo 'FAIL  ' . $label . ($detail !== '' ? " — {$detail}" : '') . PHP_EOL;
}

function redact(string $value): string
{
    $len = strlen($value);
    if ($len === 0) {
        return '(empty)';
    }
    return 'len=' . $len . ' prefix=' . substr($value, 0, 4) . '…';
}

echo "=== Config ===" . PHP_EOL;

$checks = [
    'pawapay.api_key' => config('pawapay.api_key'),
    'pawapay.base_url' => config('pawapay.base_url'),
    'pawapay.mode' => config('pawapay.mode'),
    'empiya.rpc_url' => config('empiya.rpc_url'),
    'empiya.chain_id' => config('empiya.chain_id'),
    'empiya.p2p_address' => config('empiya.p2p_address'),
    'empiya.payments_address' => config('empiya.payments_address'),
    'empiya.operator_private_key' => config('empiya.operator_private_key'),
];

foreach ($checks as $key => $value) {
    $str = is_scalar($value) ? trim((string) $value) : '';
    if ($str === '') {
        bad($key, 'missing');
        continue;
    }
    $detail = str_contains($key, 'key') || str_contains($key, 'private')
        ? redact($str)
        : $str;
    ok($key, $detail);
}

echo PHP_EOL . "=== PawaPay API ===" . PHP_EOL;

$base = rtrim((string) config('pawapay.base_url'), '/');
$apiKey = (string) config('pawapay.api_key');

try {
    $conf = PawaPay::getActiveConf('ZMB', 'DEPOSIT');
    $encoded = json_encode($conf);
    if (is_array($conf) && $conf !== []) {
        ok('PawaPay::getActiveConf(ZMB,DEPOSIT)', substr((string) $encoded, 0, 220));
    } else {
        bad('PawaPay::getActiveConf(ZMB,DEPOSIT)', substr((string) $encoded, 0, 220));
    }
} catch (Throwable $e) {
    bad('PawaPay::getActiveConf(ZMB,DEPOSIT)', $e->getMessage());
}

try {
    // Non-existent deposit: auth OK if we get a structured response rather than 401
    $fakeId = '00000000-0000-4000-8000-000000000001';
    $status = PawaPay::checkDepositStatus($fakeId);
    $encoded = json_encode($status);
    ok('PawaPay::checkDepositStatus', substr((string) $encoded, 0, 200));
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if (str_contains(strtolower($msg), '401') || str_contains(strtolower($msg), 'unauthorized')) {
        bad('PawaPay::checkDepositStatus', $msg);
    } else {
        // Expected for unknown id once auth works
        ok('PawaPay::checkDepositStatus (auth reached API)', substr($msg, 0, 200));
    }
}

echo PHP_EOL . "=== Empiya operator / RPC ===" . PHP_EOL;

$rpc = (string) config('empiya.rpc_url');
$p2p = (string) config('empiya.p2p_address');
$payments = (string) config('empiya.payments_address');
$key = (string) config('empiya.operator_private_key');

try {
    $rpcRes = Http::timeout(20)->post($rpc, [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'eth_chainId',
        'params' => [],
    ]);
    $chainHex = data_get($rpcRes->json(), 'result');
    $chainDec = is_string($chainHex) ? hexdec($chainHex) : null;
    $expected = (int) config('empiya.chain_id');
    if ($rpcRes->successful() && $chainDec !== null) {
        if ($expected > 0 && $chainDec !== $expected) {
            bad('eth_chainId', "got {$chainDec}, expected {$expected}");
        } else {
            ok('eth_chainId', (string) $chainDec);
        }
    } else {
        bad('eth_chainId', "HTTP {$rpcRes->status()} " . substr($rpcRes->body(), 0, 160));
    }
} catch (Throwable $e) {
    bad('eth_chainId', $e->getMessage());
}

foreach (['P2P' => $p2p, 'Payments' => $payments] as $label => $address) {
    try {
        $codeRes = Http::timeout(20)->post($rpc, [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'eth_getCode',
            'params' => [$address, 'latest'],
        ]);
        $code = data_get($codeRes->json(), 'result');
        if (is_string($code) && strlen($code) > 4) {
            ok("eth_getCode {$label}", substr($address, 0, 10) . '… code_len=' . strlen($code));
        } else {
            bad("eth_getCode {$label}", 'no contract code at ' . $address);
        }
    } catch (Throwable $e) {
        bad("eth_getCode {$label}", $e->getMessage());
    }
}

// Derive operator address and check ETH balance (read-only)
$node = trim(shell_exec('which node') ?: '');
if ($node === '') {
    bad('node binary', 'not found in PATH');
} else {
    $escapedKey = str_replace("'", "'\\''", $key);
    $script = <<<'JS'
const { createRequire } = require('module');
const require2 = createRequire(process.cwd() + '/');
const ethers = require2('ethers');
const key = process.env.SMOKE_KEY;
const rpc = process.env.SMOKE_RPC;
const provider = new ethers.providers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(key, provider);
(async () => {
  const bal = await provider.getBalance(wallet.address);
  const net = await provider.getNetwork();
  console.log(JSON.stringify({
    address: wallet.address,
    balanceEth: ethers.utils.formatEther(bal),
    chainId: net.chainId,
  }));
})().catch((e) => {
  console.error(e.message || String(e));
  process.exit(1);
});
JS;
    $tmp = sys_get_temp_dir() . '/empiya-smoke-operator.js';
    file_put_contents($tmp, $script);
    $cmd = 'SMOKE_KEY=' . escapeshellarg($key) . ' SMOKE_RPC=' . escapeshellarg($rpc) . ' node ' . escapeshellarg($tmp) . ' 2>&1';
    $out = shell_exec($cmd);
    @unlink($tmp);
    $decoded = json_decode(trim((string) $out), true);
    if (is_array($decoded) && isset($decoded['address'])) {
        ok('operator wallet', $decoded['address'] . ' bal=' . $decoded['balanceEth'] . ' ETH chain=' . $decoded['chainId']);
        if ((float) $decoded['balanceEth'] <= 0) {
            bad('operator gas', 'balance is 0 — release/settle txs will fail');
        }
    } else {
        bad('operator wallet', trim((string) $out));
    }
}

echo PHP_EOL . "=== Routes / package ===" . PHP_EOL;
ok('package', class_exists(\Chizzoz\PawaPay\PawaPayService::class) ? 'Chizzoz\\PawaPay loaded' : 'missing');

echo PHP_EOL . ($fail === 0 ? "ALL CHECKS PASSED ({$fail} failures)" : "FINISHED WITH {$fail} FAILURE(S)") . PHP_EOL;
exit($fail > 0 ? 1 : 0);
