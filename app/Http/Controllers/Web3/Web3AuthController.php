<?php

namespace App\Http\Controllers\Web3;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Http\Controllers\Controller;
use App\Models\User;
use kornrunner\Keccak;
use Elliptic\EC;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class Web3AuthController extends Controller
{
    public function authenticate(Request $request)
    {
        $nonce = session()->get('login_nonce');
        $message = $this->getSignatureMessage($nonce);
        $this->verifySignature(
            $message,
            $request->signature,
            $request->address
        );

        Log::debug("eth address in request: {$request->address}");
        $user = User::firstOrCreate(
            [
                'eth_address' => $request->address
            ],
            [
                "name" => $request->address,
                "password" => Hash::make(Str::random()),
                "eth_address" => $request->address,
            ]
        );
        auth()->login($user);
        session()->forget('login_nonce');

        return true;
    }

    public function signature(Request $request)
    {
        $code = Str::random();
        session()->put('login_nonce', $code);
        return $this->getSignatureMessage($code);
    }

    private function getSignatureMessage($code)
    {
        return __("You are going to sign in on e-Mpiya P2P MoMo Crypto eXchange.\n\nNonce: :nonce", [
            'nonce' => $code
        ]);
    }

    public static function verifySignature($message, $signature, $address): bool
    {
        $hash = Keccak::hash(sprintf("\x19Ethereum Signed Message:\n%s%s", strlen($message), $message), 256);

        $sign = [
            "r" => substr($signature, 2, 64),
            "s" => substr($signature, 66, 64)
        ];

        $recId = ord(hex2bin(substr($signature, 130, 2))) - 27;

        if ($recId !== ($recId & 1)) {
            throw new \RuntimeException("Invalid Hex");
        }

        $publicKey = (new EC('secp256k1'))->recoverPubKey($hash, $sign, $recId);
        $derived_address = '0x' . substr(Keccak::hash(substr(hex2bin($publicKey->encode('hex')), 1), 256), 24);

        if (Str::lower($address) != $derived_address) {
            throw new \RuntimeException("Invalid Signature Hash");
        }

        return true;
    }
}
