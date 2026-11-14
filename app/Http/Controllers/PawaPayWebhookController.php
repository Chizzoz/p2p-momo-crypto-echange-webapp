<?php

namespace App\Http\Controllers;

use App\Services\MomoSettlementService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PawaPayWebhookController extends Controller
{
    public function __construct(
        protected MomoSettlementService $settlement,
    ) {}

    public function deposits(Request $request): Response
    {
        $this->settlement->applyWebhookPayload('deposits', $request->all());

        return response('ok', 200);
    }

    public function payouts(Request $request): Response
    {
        $this->settlement->applyWebhookPayload('payouts', $request->all());

        return response('ok', 200);
    }
}
