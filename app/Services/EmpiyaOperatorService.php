<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class EmpiyaOperatorService
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function releaseToBuyer(
        string $depositor,
        int|string $transactionKey,
        string $transactionNumber,
        string $buyer,
        int|string $reservationId,
    ): array {
        return $this->run('releaseToBuyer', [
            'depositor' => $depositor,
            'transactionKey' => $transactionKey,
            'transactionNumber' => $transactionNumber,
            'buyer' => $buyer,
            'reservationId' => $reservationId,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function refundSeller(
        string $depositor,
        int|string $transactionKey,
        string $transactionNumber,
        int|string $reservationId,
    ): array {
        return $this->run('refundSeller', [
            'depositor' => $depositor,
            'transactionKey' => $transactionKey,
            'transactionNumber' => $transactionNumber,
            'reservationId' => $reservationId,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function settlePayment(string $paymentId): array
    {
        return $this->run('settlePayment', [
            'paymentId' => $paymentId,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function refundPayment(string $paymentId): array
    {
        return $this->run('refundPayment', [
            'paymentId' => $paymentId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function run(string $action, array $payload): array
    {
        if (! config('empiya.operator_private_key')) {
            throw new RuntimeException('EMPIYA_OPERATOR_PRIVATE_KEY is not configured.');
        }

        $script = base_path('scripts/empiya-operator.mjs');
        $env = [
            'EMPIYA_RPC_URL' => (string) config('empiya.rpc_url'),
            'EMPIYA_OPERATOR_PRIVATE_KEY' => (string) config('empiya.operator_private_key'),
            'EMPIYA_P2P_ADDRESS' => (string) config('empiya.p2p_address'),
            'EMPIYA_PAYMENTS_ADDRESS' => (string) config('empiya.payments_address'),
            'PATH' => getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin',
        ];

        $result = Process::env($env)
            ->timeout(120)
            ->run([
                'node',
                $script,
                $action,
                json_encode($payload, JSON_THROW_ON_ERROR),
            ]);

        $output = trim($result->output() ?: $result->errorOutput());
        $decoded = json_decode($output, true);

        if (! is_array($decoded)) {
            Log::error('Empiya operator script returned invalid JSON', [
                'action' => $action,
                'output' => $output,
                'exit' => $result->exitCode(),
            ]);
            throw new RuntimeException('Operator script failed: invalid response.');
        }

        if (! ($decoded['ok'] ?? false)) {
            throw new RuntimeException($decoded['error'] ?? 'Operator script failed.');
        }

        return $decoded['result'] ?? [];
    }
}
