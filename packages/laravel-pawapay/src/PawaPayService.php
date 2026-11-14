<?php

namespace Chizzoz\PawaPay;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PawaPayService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected string $privateKey; // ECDSA PEM
    protected string $keyId;
    protected bool $isSandbox;

    public const PROVIDERS = [
        'MTN' => 'MTN_MOMO_ZMB',
        'AIRTEL' => 'AIRTEL_OAPI_ZMB',
        'ZAMTEL' => 'ZAMTEL_ZMB',
    ];

    public function __construct()
    {
        $this->baseUrl = config('pawapay.base_url') ?? config('services.pawapay.base_url') ?? '';
        $this->apiKey = config('pawapay.api_key') ?? config('services.pawapay.api_key') ?? '';
        $this->privateKey = config('pawapay.private_key') ?? config('services.pawapay.private_key') ?? '';
        $this->keyId = (string)(config('pawapay.key_id') ?? config('services.pawapay.key_id') ?? '1');
        $this->isSandbox = (config('pawapay.mode') ?? config('services.pawapay.mode') ?? 'sandbox') === 'sandbox';

        // Clean private key formatting if coming from single-line env
        if ($this->privateKey) {
            $this->privateKey = str_replace(['\n', '\r'], "\n", $this->privateKey);
        }
    }

    /**
     * Initiate a Deposit (Collection).
     */
    public function deposit(string $depositId, string $amount, string $phoneNumber, string $provider, string $currency = 'ZMW', string $description = 'Payment', array $metadata = []): array
    {
        $endpoint = '/deposits';
        $payload = [
            'amount' => $amount,
            'currency' => $currency,
            'depositId' => $depositId,
            'payer' => [
                'type' => 'MMO',
                'accountDetails' => [
                    'provider' => $provider, // e.g., MTN_MOMO_ZMB
                    'phoneNumber' => $this->normalizePhoneNumber($phoneNumber),
                ],
            ],
            'clientReferenceId' => $depositId,
            'customerMessage' => $this->sanitizeCustomerMessage($description),
            'metadata' => $this->formatMetadata($metadata)
        ];

        return $this->sendRequest('POST', $endpoint, $payload);
    }

    /**
     * Initiate a Payout (Disbursement).
     */
    public function payout(string $payoutId, string $amount, string $phoneNumber, string $provider, string $currency = 'ZMW', string $description = 'Payout', array $metadata = []): array
    {
        $endpoint = '/payouts';
        $payload = [
            'amount' => $amount,
            'currency' => $currency,
            'payoutId' => $payoutId,
            'recipient' => [
                'type' => 'MMO',
                'accountDetails' => [
                    'provider' => $provider,
                    'phoneNumber' => $this->normalizePhoneNumber($phoneNumber),
                ],
            ],
            'customerMessage' => $this->sanitizeCustomerMessage($description),
            'metadata' => $this->formatMetadata($metadata)
        ];

        return $this->sendRequest('POST', $endpoint, $payload);
    }

    /**
     * Initiate a Refund.
     */
    public function refund(string $refundId, string $depositId, string $amount, string $currency = 'ZMW', array $metadata = []): array
    {
        $endpoint = '/refunds';
        $payload = [
            'amount' => $amount,
            'currency' => $currency,
            'depositId' => $depositId,
            'refundId' => $refundId,
            'metadata' => $this->formatMetadata($metadata)
        ];

        return $this->sendRequest('POST', $endpoint, $payload);
    }

    /**
     * Check Deposit Status.
     */
    public function checkDepositStatus(string $depositId): array
    {
        return $this->sendRequest('GET', "/deposits/{$depositId}");
    }

    /**
     * Check Payout Status.
     */
    public function checkPayoutStatus(string $payoutId): array
    {
        return $this->sendRequest('GET', "/payouts/{$payoutId}");
    }

    /**
     * Check Refund Status.
     */
    public function checkRefundStatus(string $refundId): array
    {
        return $this->sendRequest('GET', "/refunds/{$refundId}");
    }

    /**
     * Get account balance
     */
    public function getBalance(string $country = 'ZMB'): array
    {
        return $this->sendRequest('GET', "/wallet-balances?country={$country}");
    }

    /**
     * Predict Provider from Phone Number
     */
    public function predictProvider(string $phoneNumber): array
    {
        return $this->sendRequest('POST', '/predict-provider', ['phoneNumber' => $phoneNumber]);
    }

    /**
     * Get Public Keys for Signature Verification
     */
    public function getPublicKeys(): array
    {
        return $this->sendRequest('GET', '/public-key/http');
    }

    /**
     * Check Provider Availability
     */
    public function getAvailability(string $country = 'ZMB', string $operationType = 'DEPOSIT'): array
    {
        return $this->sendRequest('GET', "/availability?country={$country}&operationType={$operationType}");
    }

    /**
     * Get active configuration
     */
    public function getActiveConf(string $country = 'ZMB', string $operationType = 'DEPOSIT'): array
    {
        return $this->sendRequest('GET', "/active-conf?country={$country}&operationType={$operationType}");
    }

    /**
     * Main request handler with HTTP Signatures.
     */
    protected function sendRequest(string $method, string $endpoint, array $data = []): array
    {
        $url = $this->baseUrl . $endpoint;
        $body = ($method === 'POST') ? json_encode($data) : '';

        // Generate Headers
        $headers = [
            'Authorization' => "Bearer {$this->apiKey}",
            'Accept' => 'application/json',
            'Accept-Signature' => 'ecdsa-p256-sha256',
            'Accept-Digest' => 'sha-256',
        ];

        if ($method === 'POST' && $body) {
            $headers['Content-Type'] = 'application/json';

            // 1. Content-Digest
            $digest = 'sha-256=:' . base64_encode(hash('sha256', $body, true)) . ':';
            $headers['Content-Digest'] = $digest;

            // 2. Mock or Real Signature
            if ($this->isSandbox) {
                $signatureValue = 'mock-signature-for-sandbox';
            } else {
                $signatureValue = $this->generateEcdsaSignature($method, $endpoint, $digest);
            }

            $sigInput = 'sig1=("@method" "@path" "content-digest" "content-type");created=' . time() . ';keyid="' . $this->keyId . '"';

            if (!$this->isSandbox && $this->privateKey) {
                $signatureValue = $this->generateEcdsaSignature($method, $endpoint, $digest);
            }

            $headers['Signature'] = 'sig1=:' . $signatureValue . ':';
            $headers['Signature-Input'] = $sigInput;
        }

        // Send Request
        try {
            $client = Http::withHeaders($headers);

            $response = match ($method) {
                'POST' => $client->post($url, $data),
                'GET' => $client->get($url),
                default => throw new Exception("Method $method not supported"),
            };

            if ($response->successful()) {
                Log::info("PawaPay Success [{$method} {$endpoint}]", ['response' => $response->json()]);
                return $response->json();
            }

            Log::error("PawaPay Error [{$method} {$endpoint}]", [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new Exception("PawaPay API Error: " . $response->body());

        } catch (Exception $e) {
            Log::error("PawaPay Request Failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate ECDSA-P256-SHA256 signature.
     */
    protected function generateEcdsaSignature(string $method, string $endpoint, string $digest): string
    {
        $signingString =
            "\"@method\": " . strtoupper($method) . "\n" .
            "\"@path\": " . $endpoint . "\n" .
            "\"content-digest\": " . $digest . "\n" .
            "\"content-type\": application/json";

        $binarySignature = '';
        if (openssl_sign($signingString, $binarySignature, $this->privateKey, OPENSSL_ALGO_SHA256)) {
            return base64_encode($binarySignature);
        }

        Log::error("OpenSSL signing failed: " . openssl_error_string());
        throw new Exception("Failed to generate request signature.");
    }

    /**
     * Resolve provider code (e.g. 'MTN' -> 'MTN_MOMO_ZMB')
     */
    public function getProviderCode(string $shortCode): string
    {
        return self::PROVIDERS[strtoupper($shortCode)] ?? $shortCode;
    }

    /**
     * Format metadata according to PawaPay specs (Array of objects)
     */
    public function formatMetadata(array $metadata): array
    {
        $formatted = [];
        foreach ($metadata as $key => $value) {
            if (is_array($value)) {
                $formatted[] = $value;
            } else {
                $formatted[] = [$key => $value];
            }
        }
        return $formatted;
    }

    /**
     * Sanitize customer message to meet PawaPay requirements:
     * - Only alphanumeric and space characters allowed
     * - Maximum 22 characters
     */
    private function sanitizeCustomerMessage(string $message): string
    {
        $sanitized = preg_replace('/[^a-zA-Z0-9 ]/', '', $message);

        if (strlen($sanitized) > 22) {
            $sanitized = substr($sanitized, 0, 22);
        }

        return $sanitized ?: 'Payment';
    }

    /**
     * Normalize phone number for PawaPay API
     */
    private function normalizePhoneNumber(string $phoneNumber): string
    {
        $digits = preg_replace('/\D/', '', $phoneNumber);

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) == 9 && !str_starts_with($digits, '260')) {
            $digits = '260' . $digits;
        }

        if (str_starts_with($digits, '260') && strlen($digits) > 12) {
            $digits = substr($digits, 0, 12);
        }

        return $digits;
    }
}
