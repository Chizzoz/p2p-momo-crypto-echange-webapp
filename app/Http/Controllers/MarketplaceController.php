<?php

namespace App\Http\Controllers;

use App\Models\FiatWallet;
use App\Models\PaymentMethod;
use App\Models\WalletLedgerEntry;
use App\Services\ListingCatalog;
use App\Services\WalletService;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function __construct(
        protected ListingCatalog $listings,
        protected WalletService $wallets,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Listings', [
            'listings' => $this->listings->open(),
        ]);
    }

    public function dashboard(): Response
    {
        $user = auth()->user();

        // Ensure active MoMo country has a wallet row (even at zero).
        if ($user->hasBoundMomoAccount()) {
            $this->wallets->ensureWalletForCountry($user, (int) $user->country_id);
        }

        $myListings = $this->listings->forSeller((int) $user->id);
        $purchases = $this->listings->purchasesForBuyer(
            $user->eth_address,
            (int) $user->id,
        );

        $openListedUsdt = $myListings
            ->where('status', 0)
            ->sum(fn ($row) => (float) $row->amount);

        $fiatWallets = FiatWallet::query()
            ->with('country:id,name,iso2')
            ->where('user_id', $user->id)
            ->orderBy('currency')
            ->get();

        $ledger = WalletLedgerEntry::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        $walletCountryIds = $fiatWallets->pluck('country_id')->filter()->unique()->values();
        $walletCurrencies = $fiatWallets->pluck('currency')->unique()->values();

        $networks = PaymentMethod::query()
            ->with('country.currency')
            ->whereNotNull('pawapay_provider')
            ->whereNotNull('country_id')
            ->when(
                $walletCountryIds->isNotEmpty() || $walletCurrencies->isNotEmpty(),
                function ($q) use ($walletCountryIds, $walletCurrencies) {
                    $q->where(function ($inner) use ($walletCountryIds, $walletCurrencies) {
                        if ($walletCountryIds->isNotEmpty()) {
                            $inner->whereIn('country_id', $walletCountryIds);
                        }
                        if ($walletCurrencies->isNotEmpty()) {
                            $inner->orWhereHas('country.currency', function ($cq) use ($walletCurrencies) {
                                $cq->whereIn('currency_slug', $walletCurrencies->map(fn ($c) => strtolower($c)));
                            });
                        }
                    });
                },
                fn ($q) => $q->when(
                    $user->country_id,
                    fn ($qq) => $qq->where('country_id', $user->country_id),
                ),
            )
            ->orderBy('method')
            ->get(['id', 'method', 'method_slug', 'pawapay_provider', 'country_id']);

        $withdrawNetworks = $networks->map(function (PaymentMethod $method) {
            return [
                'id' => $method->id,
                'method' => $method->method,
                'method_slug' => $method->method_slug,
                'pawapay_provider' => $method->pawapay_provider,
                'country_id' => $method->country_id,
                'currency' => strtoupper((string) ($method->country?->currency?->currency_slug ?? '')),
                'country_name' => $method->country?->name,
            ];
        });

        return Inertia::render('Dashboard', [
            'my_listings' => $myListings->values(),
            'purchases' => $purchases->values(),
            'fiat_wallets' => $fiatWallets->map(fn (FiatWallet $w) => [
                'id' => $w->id,
                'currency' => $w->currency,
                'balance' => (string) $w->balance,
                'country_id' => $w->country_id,
                'country_name' => $w->country?->name,
            ])->values(),
            'zmw_balance' => (string) ($fiatWallets->firstWhere('currency', 'ZMW')?->balance
                ?? $user->account_balance
                ?? '0'),
            'wallet_ledger' => $ledger->values(),
            'withdraw_networks' => $withdrawNetworks->values(),
            'stats' => [
                'open_listed_usdt' => round((float) $openListedUsdt, 6),
                'open_count' => $myListings->where('status', 0)->count(),
                'sold_count' => $myListings->where('status', 2)->count(),
                'purchase_count' => $purchases->count(),
            ],
        ]);
    }
}
