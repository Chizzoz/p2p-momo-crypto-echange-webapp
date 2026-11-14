<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ListingCatalog
{
    /**
     * Shared listing rows for marketplace + dashboard.
     */
    public function query(): \Illuminate\Database\Query\Builder
    {
        return DB::table('transactions')
            ->leftJoin('users', 'users.id', '=', 'transactions.user_id')
            ->leftJoin('transaction_tokens', 'transactions.id', '=', 'transaction_tokens.transaction_id')
            ->leftJoin('tokens', 'transaction_tokens.token_id', '=', 'tokens.id')
            ->select(
                'transactions.id as listing_id',
                'transactions.user_id',
                'transactions.transaction_key',
                'transactions.transaction_number',
                'transactions.amount',
                'transactions.status',
                'transactions.recipient',
                'transactions.reserved_buyer',
                'transactions.reservation_id',
                'transactions.created_at',
                'transactions.updated_at',
                'users.name',
                'users.eth_address',
                'transaction_tokens.token_id',
                'transaction_tokens.price',
                'transaction_tokens.currency',
                'tokens.token',
                'tokens.symbol'
            )
            ->orderByDesc('transactions.created_at');
    }

    public function all(): Collection
    {
        return $this->query()->get();
    }

    public function open(): Collection
    {
        // Only surface listings with a real on-chain bytes32 transaction_number.
        return $this->query()
            ->where('transactions.status', 0)
            ->whereRaw("transactions.transaction_number REGEXP '^0x[0-9a-fA-F]{64}$'")
            ->get();
    }

    public function forSeller(int $userId): Collection
    {
        return $this->query()->where('transactions.user_id', $userId)->get();
    }

    public function purchasesForBuyer(?string $ethAddress, ?int $userId = null): Collection
    {
        $query = $this->query();

        if (! $ethAddress && ! $userId) {
            return collect();
        }

        $query->where(function ($inner) use ($ethAddress, $userId) {
            if ($ethAddress) {
                $inner->whereRaw('LOWER(transactions.reserved_buyer) = ?', [strtolower($ethAddress)]);
            }

            if ($userId) {
                $method = $ethAddress ? 'orWhereIn' : 'whereIn';
                $inner->{$method}('transactions.id', function ($sub) use ($userId) {
                    $sub->select('transaction_id')
                        ->from('momo_transfers')
                        ->where('user_id', $userId)
                        ->where('purpose', 'p2p_buy')
                        ->whereNotNull('transaction_id');
                });
            }
        });

        return $query->get();
    }

    public static function statusLabel(int|string|null $status): string
    {
        return match ((int) $status) {
            0 => 'Open',
            1 => 'Processing',
            2 => 'Complete',
            3 => 'Cancelled',
            default => 'Unknown',
        };
    }
}
