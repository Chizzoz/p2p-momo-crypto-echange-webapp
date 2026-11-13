<?php

namespace App\Http\Middleware;

use App\Models\Country;
use App\Models\PaymentMethod;
use App\Models\Token;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Defines the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            // Keep Jetstream React pages working (they read props.user, not only auth.user).
            'user' => fn () => $request->user(),
            // Available to AppLayout create-listing modal on every authenticated page.
            'tokens' => fn () => $request->user()
                ? Token::query()->orderBy('symbol')->get(['id', 'token', 'symbol', 'token_slug'])
                : [],
            // Only markets with at least one seeded MNO (hides LBR/MLI/SSD until providers exist).
            'countries' => fn () => $request->user()
                ? Country::query()
                    ->whereHas('paymentMethods')
                    ->orderBy('name')
                    ->get(['id', 'name', 'iso2', 'iso3'])
                : [],
            'payment_methods' => fn () => $request->user()
                ? PaymentMethod::query()
                    ->whereNotNull('country_id')
                    ->orderBy('method')
                    ->get(['id', 'method', 'method_slug', 'country_id', 'pawapay_provider'])
                : [],
        ];
    }
}
