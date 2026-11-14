# Laravel PawaPay Package

A Laravel package for simple and elegant integration with the **PawaPay v2 API**, supporting collections (deposits), disbursements (payouts), refunds, status checks, and balance lookups.

## Installation

You can install the package via Composer:

```bash
composer require chizzoz/laravel-pawapay
```

The package will automatically register its service provider and facade.

### Publish Configuration

You can publish the configuration file using:

```bash
php artisan vendor:publish --provider="Chizzoz\PawaPay\PawaPayServiceProvider" --tag="pawapay-config"
```

This will create a `config/pawapay.php` file in your application.

## Configuration

Add the following environment variables to your `.env` file:

```env
PAWAPAY_API_KEY="your-api-key"
PAWAPAY_BASE_URL="https://api.sandbox.pawapay.io/v2" # or live url
PAWAPAY_MODE="sandbox" # sandbox or live
PAWAPAY_KEY_ID="1"
PAWAPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..." # Required for signatures in live mode
```

## Usage

You can use the `PawaPay` facade or inject `Chizzoz\PawaPay\PawaPayService` directly.

### Available Methods

---

#### 1. Initiate a Deposit (Collection)
Request a mobile money payment from a customer.

```php
use Chizzoz\PawaPay\Facades\PawaPay;

$response = PawaPay::deposit(
    depositId: 'unique-deposit-uuid',
    amount: '10.00',
    phoneNumber: '0971234567',
    provider: 'MTN_MOMO_ZMB', // e.g. MTN_MOMO_ZMB, AIRTEL_OAPI_ZMB, ZAMTEL_ZMB
    currency: 'ZMW',          // Optional, default: 'ZMW'
    description: 'Payment description', // Optional, max 22 chars (alphanumeric/spaces)
    metadata: ['order_id' => '123'] // Optional
);
```

#### 2. Initiate a Payout (Disbursement)
Send money to a customer's mobile money account.

```php
$response = PawaPay::payout(
    payoutId: 'unique-payout-uuid',
    amount: '50.00',
    phoneNumber: '0971234567',
    provider: 'AIRTEL_OAPI_ZMB',
    currency: 'ZMW',          // Optional, default: 'ZMW'
    description: 'Payout description',  // Optional, max 22 chars
    metadata: ['user_id' => '456']      // Optional
);
```

#### 3. Initiate a Refund
Refund a successful deposit back to the customer.

```php
$response = PawaPay::refund(
    refundId: 'unique-refund-uuid',
    depositId: 'original-deposit-uuid',
    amount: '10.00',
    currency: 'ZMW', // Optional, default: 'ZMW'
    metadata: ['reason' => 'user_request'] // Optional
);
```

#### 4. Check Deposit Status
Query the status of an initiated deposit transaction.

```php
$status = PawaPay::checkDepositStatus('unique-deposit-uuid');
// Returns array containing transaction status (e.g. COMPLETED, FAILED, PENDING)
```

#### 5. Check Payout Status
Query the status of an initiated payout transaction.

```php
$status = PawaPay::checkPayoutStatus('unique-payout-uuid');
```

#### 6. Check Refund Status
Query the status of an initiated refund transaction.

```php
$status = PawaPay::checkRefundStatus('unique-refund-uuid');
```

#### 7. Get Wallet Balance
Fetch the current wallet balances for a specific country.

```php
$balance = PawaPay::getBalance(country: 'ZMB'); // Optional, default: 'ZMB'
```

#### 8. Predict Provider
Automatically predict the mobile money provider/operator from a phone number.

```php
$prediction = PawaPay::predictProvider('0971234567');
```

#### 9. Get Public Keys
Fetch PawaPay's current public ECDSA keys used for verifying HTTP signatures.

```php
$keys = PawaPay::getPublicKeys();
```

#### 10. Check Provider Availability
Fetch mobile money provider status and availability for deposits/payouts.

```php
$availability = PawaPay::getAvailability(
    country: 'ZMB',       // Optional, default: 'ZMB'
    operationType: 'DEPOSIT' // Optional, e.g. 'DEPOSIT' or 'PAYOUT'
);
```

#### 11. Get Active Configuration
Fetch the active PawaPay merchant configurations (countries, operators, rules).

```php
$config = PawaPay::getActiveConf(
    country: 'ZMB', 
    operationType: 'DEPOSIT'
);
```

#### 12. Get Provider Code (Helper Method)
Map simple network names (`MTN`, `AIRTEL`, `ZAMTEL`) to their full PawaPay provider code strings.

```php
$code = PawaPay::getProviderCode('MTN'); // returns 'MTN_MOMO_ZMB'
$code = PawaPay::getProviderCode('AIRTEL'); // returns 'AIRTEL_OAPI_ZMB'
$code = PawaPay::getProviderCode('ZAMTEL'); // returns 'ZAMTEL_ZMB'
```
