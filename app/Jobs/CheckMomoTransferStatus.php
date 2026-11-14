<?php

namespace App\Jobs;

use App\Models\MomoTransfer;
use App\Services\MomoSettlementService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CheckMomoTransferStatus implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 12;

    public function __construct(public int $momoTransferId) {}

    public function handle(MomoSettlementService $settlement): void
    {
        $transfer = MomoTransfer::query()->find($this->momoTransferId);
        if (! $transfer || $transfer->isTerminal()) {
            return;
        }

        $settlement->syncTransferStatus($transfer);

        $fresh = $transfer->fresh();
        if ($fresh && ! $fresh->isTerminal()) {
            self::dispatch($this->momoTransferId)->delay(now()->addSeconds(20));
        }
    }
}
