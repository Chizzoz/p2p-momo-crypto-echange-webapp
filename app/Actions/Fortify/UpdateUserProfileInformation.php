<?php

namespace App\Actions\Fortify;

use App\Models\PaymentMethod;
use App\Services\WalletService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\UpdatesUserProfileInformation;

class UpdateUserProfileInformation implements UpdatesUserProfileInformation
{
    public function __construct(
        protected WalletService $wallets,
    ) {}

    /**
     * Validate and update the given user's profile information.
     *
     * @param  mixed  $user
     * @param  array  $input
     * @return void
     */
    public function update($user, array $input)
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'mobile_number' => ['nullable', 'string', 'max:32'],
            'country_id' => ['nullable', 'integer', 'exists:countries,id'],
            'payment_method_id' => [
                'nullable',
                'integer',
                'exists:payment_methods,id',
                function ($attribute, $value, $fail) use ($input) {
                    if (! $value) {
                        return;
                    }

                    $method = PaymentMethod::query()->find($value);
                    if (! $method) {
                        $fail('Selected mobile network is invalid.');

                        return;
                    }

                    $countryId = isset($input['country_id']) ? (int) $input['country_id'] : null;
                    if ($countryId && (int) $method->country_id !== $countryId) {
                        $fail('Selected mobile network does not belong to the chosen country.');
                    }
                },
            ],
            'photo' => ['nullable', 'mimes:jpg,jpeg,png', 'max:1024'],
        ])->validateWithBag('updateProfileInformation');

        if (isset($input['photo'])) {
            $user->updateProfilePhoto($input['photo']);
        }

        $mobileNumber = isset($input['mobile_number'])
            ? trim((string) $input['mobile_number'])
            : null;
        $mobileNumber = $mobileNumber === '' ? null : $mobileNumber;

        $countryId = isset($input['country_id']) && $input['country_id'] !== ''
            ? (int) $input['country_id']
            : null;
        $paymentMethodId = isset($input['payment_method_id']) && $input['payment_method_id'] !== ''
            ? (int) $input['payment_method_id']
            : null;

        // Clearing the number also clears country/MNO binding.
        if ($mobileNumber === null) {
            $countryId = null;
            $paymentMethodId = null;
        }

        $profile = [
            'name' => $input['name'],
            'email' => $input['email'] ?? $user->email,
            'mobile_number' => $mobileNumber,
            'country_id' => $countryId,
            'payment_method_id' => $paymentMethodId,
        ];

        if (($input['email'] ?? null) !== $user->email &&
            $user instanceof MustVerifyEmail) {
            $this->updateVerifiedUser($user, $profile);
        } else {
            $user->forceFill($profile)->save();
        }

        // Opening a MoMo number for a country creates that country's currency wallet.
        if ($mobileNumber && $countryId && $paymentMethodId) {
            $this->wallets->ensureWalletForCountry($user->fresh(), $countryId);
        }
    }

    /**
     * Update the given verified user's profile information.
     *
     * @param  mixed  $user
     * @param  array  $profile
     * @return void
     */
    protected function updateVerifiedUser($user, array $profile)
    {
        $user->forceFill(array_merge($profile, [
            'email_verified_at' => null,
        ]))->save();

        $user->sendEmailVerificationNotification();
    }
}
