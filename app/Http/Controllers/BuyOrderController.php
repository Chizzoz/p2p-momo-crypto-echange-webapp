<?php

namespace App\Http\Controllers;

use App\Models\BuyOrder;
use App\Services\BuyOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BuyOrderController extends Controller
{
    public function __construct(
        protected BuyOrderService $buyOrders,
    ) {}

    public function index(Request $request): Response
    {
        $open = BuyOrder::query()
            ->with(['user:id,name,eth_address'])
            ->where('status', BuyOrder::STATUS_OPEN)
            ->orderByDesc('id')
            ->get()
            ->map(fn (BuyOrder $o) => $this->serialize($o));

        $mine = $request->user()
            ? BuyOrder::query()
                ->where('user_id', $request->user()->id)
                ->orderByDesc('id')
                ->limit(20)
                ->get()
                ->map(fn (BuyOrder $o) => $this->serialize($o))
            : collect();

        return Inertia::render('BuyOrders', [
            'open_orders' => $open->values(),
            'my_orders' => $mine->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'buyer_address' => ['required', 'string', 'size:42'],
            'fiat_amount' => ['required', 'numeric', 'min:0.01'],
            'usdt_amount' => ['required', 'numeric', 'min:0.000001'],
        ]);

        try {
            $order = $this->buyOrders->createAndCollect(
                $request->user(),
                $data['buyer_address'],
                (string) $data['fiat_amount'],
                (string) $data['usdt_amount'],
            );
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'order' => $this->serialize($order),
            'message' => $order->status === BuyOrder::STATUS_OPEN
                ? 'MoMo received. Your Sell MoMo offer is now open.'
                : 'Approve the MoMo payment prompt on your phone. The offer opens when the deposit clears.',
        ]);
    }

    public function cancel(Request $request, BuyOrder $buyOrder): JsonResponse
    {
        try {
            $order = $this->buyOrders->cancel($buyOrder, $request->user());
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'order' => $this->serialize($order),
            'message' => 'MoMo offer cancelled.',
        ]);
    }

    public function fill(Request $request, BuyOrder $buyOrder): JsonResponse
    {
        $data = $request->validate([
            'depositor' => ['required', 'string', 'size:42'],
            'transaction_key' => ['required'],
            'transaction_number' => ['required', 'string'],
            'reservation_id' => ['required'],
        ]);

        try {
            $order = $this->buyOrders->recordFill($buyOrder, $request->user(), $data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'order' => $this->serialize($order->load(['transaction', 'user', 'filler'])),
            'message' => $order->status === BuyOrder::STATUS_COMPLETE
                ? 'Filled. USDT released to the MoMo buyer; fiat credited to your wallet.'
                : 'Fill recorded. Settlement is in progress.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serialize(BuyOrder $order): array
    {
        return [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'buyer_address' => $order->buyer_address,
            'currency' => $order->currency,
            'fiat_amount' => (string) $order->fiat_amount,
            'usdt_amount' => (string) $order->usdt_amount,
            'unit_price' => (string) $order->unit_price,
            'status' => $order->status,
            'momo_transfer_id' => $order->momo_transfer_id
                ? (int) $order->momo_transfer_id
                : null,
            'transaction_id' => $order->transaction_id,
            'filler_user_id' => $order->filler_user_id,
            'lister_name' => $order->user?->name,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }
}
