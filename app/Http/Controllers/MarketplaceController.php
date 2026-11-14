<?php

namespace App\Http\Controllers;

use App\Services\ListingCatalog;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function __construct(
        protected ListingCatalog $listings,
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

        $myListings = $this->listings->forSeller((int) $user->id);
        $purchases = $this->listings->purchasesForBuyer(
            $user->eth_address,
            (int) $user->id,
        );

        $openListedUsdt = $myListings
            ->where('status', 0)
            ->sum(fn ($row) => (float) $row->amount);

        return Inertia::render('Dashboard', [
            'my_listings' => $myListings->values(),
            'purchases' => $purchases->values(),
            'stats' => [
                'open_listed_usdt' => round((float) $openListedUsdt, 6),
                'open_count' => $myListings->where('status', 0)->count(),
                'sold_count' => $myListings->where('status', 2)->count(),
                'purchase_count' => $purchases->count(),
            ],
        ]);
    }
}
