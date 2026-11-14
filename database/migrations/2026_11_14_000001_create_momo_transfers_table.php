<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('momo_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->string('direction'); // deposit|payout|refund
            $table->string('purpose'); // p2p_buy|p2p_seller_payout|pay_redeem
            $table->string('status')->default('PENDING');
            $table->uuid('pawapay_id')->unique();
            $table->string('provider');
            $table->string('phone');
            $table->string('currency', 8)->default('ZMW');
            $table->decimal('amount', 27, 8);
            $table->string('payment_id')->nullable(); // EmpiyaPayments bytes32 hex
            $table->string('depositor_address')->nullable();
            $table->unsignedBigInteger('onchain_transaction_key')->nullable();
            $table->string('onchain_transaction_number')->nullable();
            $table->string('buyer_address')->nullable();
            $table->string('reservation_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['purpose', 'status']);
            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('momo_transfers');
    }
};
