<?php

namespace App\Console\Commands;

use App\Services\MomoSettlementService;
use Illuminate\Console\Command;

class RetryEmpiyaOperatorSettlement extends Command
{
    protected $signature = 'empiya:retry-release
                            {--transfer= : Optional momo_transfers.id to retry}
                            {--dry-run : List stuck transfers without calling the operator}';

    protected $description = 'Retry on-chain release/settle for MoMo-completed transfers stuck without operator settlement';

    public function handle(MomoSettlementService $settlement): int
    {
        $transferId = $this->option('transfer')
            ? (int) $this->option('transfer')
            : null;

        if ($this->option('dry-run')) {
            $this->warn('Dry run — no operator calls.');
        }

        if ($this->option('dry-run')) {
            $stuck = \App\Models\MomoTransfer::query()
                ->where('status', \App\Models\MomoTransfer::STATUS_COMPLETED)
                ->whereIn('purpose', [
                    \App\Models\MomoTransfer::PURPOSE_P2P_BUY,
                    \App\Models\MomoTransfer::PURPOSE_PAY_REDEEM,
                ])
                ->when($transferId, fn ($q) => $q->where('id', $transferId))
                ->orderBy('id')
                ->get()
                ->filter(function ($transfer) {
                    $meta = is_array($transfer->metadata) ? $transfer->metadata : [];
                    if ($transfer->purpose === \App\Models\MomoTransfer::PURPOSE_P2P_BUY) {
                        return empty($meta['released']);
                    }

                    return empty($meta['settled']);
                });

            if ($stuck->isEmpty()) {
                $this->info('No stuck transfers found.');

                return self::SUCCESS;
            }

            foreach ($stuck as $transfer) {
                $this->line(sprintf(
                    '#%d purpose=%s amount=%s %s payment/tx=%s',
                    $transfer->id,
                    $transfer->purpose,
                    $transfer->amount,
                    $transfer->currency,
                    $transfer->payment_id ?: $transfer->transaction_id,
                ));
            }
            $this->info('Stuck count: '.$stuck->count());

            return self::SUCCESS;
        }

        $result = $settlement->retryStuckOperatorSettlements($transferId);

        $this->info("Retried: {$result['retried']}");
        $this->info("Skipped (already settled): {$result['skipped']}");

        foreach ($result['errors'] as $error) {
            $this->error($error);
        }

        return $result['errors'] === [] ? self::SUCCESS : self::FAILURE;
    }
}
