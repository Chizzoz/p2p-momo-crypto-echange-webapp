<?php

return [
    /*
    |--------------------------------------------------------------------------
    | PawaPay API Base URL
    |--------------------------------------------------------------------------
    |
    | The default base URL for the PawaPay v2 API endpoints.
    |
    */
    'base_url' => env('PAWAPAY_BASE_URL', 'https://api.sandbox.pawapay.io/v2'),

    /*
    |--------------------------------------------------------------------------
    | PawaPay API Credentials
    |--------------------------------------------------------------------------
    |
    | The authorization token/API key used to authenticate request payloads.
    |
    */
    'api_key' => env('PAWAPAY_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | ECDSA Private Key (PEM)
    |--------------------------------------------------------------------------
    |
    | The Elliptic Curve private key in PEM format used for HTTP Signatures.
    |
    */
    'private_key' => env('PAWAPAY_PRIVATE_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Key ID
    |--------------------------------------------------------------------------
    |
    | The ID representing the private/public keypair registered on PawaPay.
    |
    */
    'key_id' => env('PAWAPAY_KEY_ID', '1'),

    /*
    |--------------------------------------------------------------------------
    | Mode
    |--------------------------------------------------------------------------
    |
    | Specify whether you are running in 'sandbox' or 'live' mode. In sandbox,
    | signature payload signing is bypassed with a mock header value.
    |
    */
    'mode' => env('PAWAPAY_MODE', 'sandbox'),
];
