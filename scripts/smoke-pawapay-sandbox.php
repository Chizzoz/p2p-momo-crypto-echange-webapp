<?php

/**
 * Live sandbox MoMo smoke using PawaPay test MSISDNs (Zambia).
 * Docs: https://docs.pawapay.io/v2/docs/test_numbers
 *
 * Does NOT touch Empiya contracts — only PawaPay + local momo_transfers rows.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\MomoTransfer;
use App\Services\MomoSettlementService;
use Chizzoz\PawaPay\Facades\PawaPay;
use Illuminate\Support\Str;

$fail = 0;

function line(string $msg): void
{
    echo $msg . PHP_EOL;
}

function pass(string $msg): void
{
    line('PASS  ' . $msg);
}

function failMsg(string $msg): void
{
    global $fail;
    $fail++;
    line('FAIL  ' . $msg);
}

if (config('pawapay.mode') !== 'sandbox') {
    failMsg('PAWAPAY_MODE must be sandbox for test numbers');
    exit(1);
}

// Zambia COMPLETED numbers from https://docs.pawapay.io/v2/docs/test_numbers
$depositPhone = '260763456789'; // MTN_MOMO_ZMB deposit COMPLETED
$payoutPhone = '260763456789';  // MTN_MOMO_ZMB payout COMPLETED
$provider = 'MTN_MOMO_ZMB';
$currency = 'ZMW';
$amount = '10.00';

$depositId = (string) Str::uuid();
$payoutId = (string) Str::uuid();

line('=== Sandbox deposit (COMPLETED MSISDN) ===');
line("provider={$provider} phone={$depositPhone} amount={$amount} {$currency}");
line("depositId={$depositId}");

try {
    $created = PawaPay::deposit(
        $depositId,
        $amount,
        $depositPhone,
        $provider,
        $currency,
        'Empiya smoke deposit',
        ['purpose' => 'smoke'],
    );
    line('create: ' . substr((string) json_encode($created), 0, 300));
} catch (Throwable $e) {
    failMsg('deposit create: ' . $e->getMessage());
    exit(1);
}

$depositTransfer = MomoTransfer::query()->create([
    'direction' => MomoTransfer::DIRECTION_DEPOSIT,
    'purpose' => 'smoke_deposit',
    'status' => MomoTransfer::STATUS_PENDING,
    'pawapay_id' => $depositId,
    'provider' => $provider,
    'phone' => $depositPhone,
    'currency' => $currency,
    'amount' => $amount,
    'metadata' => ['smoke' => true],
]);

$finalDeposit = null;
for ($i = 0; $i < 12; $i++) {
    sleep(2);
    try {
        $status = PawaPay::checkDepositStatus($depositId);
    } catch (Throwable $e) {
        failMsg('deposit poll: ' . $e->getMessage());
        break;
    }
    $envelope = strtoupper((string) ($status['status'] ?? 'UNKNOWN'));
    $state = strtoupper((string) (data_get($status, 'data.status') ?? $envelope));
    line("poll#{$i} deposit envelope={$envelope} status={$state}");
    if (in_array($state, ['COMPLETED', 'FAILED', 'REJECTED'], true)) {
        $finalDeposit = $state;
        break;
    }
}

if ($finalDeposit === 'COMPLETED') {
    pass('deposit reached COMPLETED');
} else {
    failMsg('deposit did not COMPLETE (got ' . ($finalDeposit ?? 'unknown') . ')');
}

line('');
line('=== Settlement poller on deposit row ===');
try {
    /** @var MomoSettlementService $settlement */
    $settlement = app(MomoSettlementService::class);
    $synced = $settlement->syncTransferStatus($depositTransfer->fresh());
    if ($synced->status === MomoTransfer::STATUS_COMPLETED) {
        pass('MomoSettlementService::syncTransferStatus → COMPLETED');
    } else {
        failMsg('syncTransferStatus status=' . $synced->status);
    }
} catch (Throwable $e) {
    failMsg('settlement poller: ' . $e->getMessage());
}

line('');
line('=== Sandbox payout (COMPLETED MSISDN) ===');
line("provider={$provider} phone={$payoutPhone} amount={$amount} {$currency}");
line("payoutId={$payoutId}");

try {
    $createdPayout = PawaPay::payout(
        $payoutId,
        $amount,
        $payoutPhone,
        $provider,
        $currency,
        'Empiya smoke payout',
        ['purpose' => 'smoke'],
    );
    line('create: ' . substr((string) json_encode($createdPayout), 0, 300));
} catch (Throwable $e) {
    failMsg('payout create: ' . $e->getMessage());
    exit(1);
}

$payoutTransfer = MomoTransfer::query()->create([
    'direction' => MomoTransfer::DIRECTION_PAYOUT,
    'purpose' => 'smoke_payout',
    'status' => MomoTransfer::STATUS_PENDING,
    'pawapay_id' => $payoutId,
    'provider' => $provider,
    'phone' => $payoutPhone,
    'currency' => $currency,
    'amount' => $amount,
    'metadata' => ['smoke' => true],
]);

$finalPayout = null;
for ($i = 0; $i < 12; $i++) {
    sleep(2);
    try {
        $status = PawaPay::checkPayoutStatus($payoutId);
    } catch (Throwable $e) {
        failMsg('payout poll: ' . $e->getMessage());
        break;
    }
    $envelope = strtoupper((string) ($status['status'] ?? 'UNKNOWN'));
    $state = strtoupper((string) (data_get($status, 'data.status') ?? $envelope));
    line("poll#{$i} payout envelope={$envelope} status={$state}");
    if (in_array($state, ['COMPLETED', 'FAILED', 'REJECTED'], true)) {
        $finalPayout = $state;
        break;
    }
}

if ($finalPayout === 'COMPLETED') {
    pass('payout reached COMPLETED');
} else {
    failMsg('payout did not COMPLETE (got ' . ($finalPayout ?? 'unknown') . ')');
}

try {
    $settlement = app(MomoSettlementService::class);
    $syncedPayout = $settlement->syncTransferStatus($payoutTransfer->fresh());
    if ($syncedPayout->status === MomoTransfer::STATUS_COMPLETED) {
        pass('MomoSettlementService::syncTransferStatus payout → COMPLETED');
    } else {
        failMsg('payout sync status=' . $syncedPayout->status);
    }
} catch (Throwable $e) {
    failMsg('payout settlement poller: ' . $e->getMessage());
}

line('');
line('Zambia quick reference (COMPLETED):');
line('  MTN    deposit/payout  260763456789');
line('  Airtel deposit/payout  260973456789');
line('  Zamtel deposit/payout  260953456700');
line('');
line($fail === 0 ? 'ALL SANDBOX MOMO CHECKS PASSED' : "FINISHED WITH {$fail} FAILURE(S)");
exit($fail > 0 ? 1 : 0);
