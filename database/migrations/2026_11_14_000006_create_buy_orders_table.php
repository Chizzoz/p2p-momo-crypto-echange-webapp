<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buy_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('buyer_address', 42);
            $table->string('currency', 8);
            $table->decimal('fiat_amount', 18, 2);
            $table->decimal('usdt_amount', 18, 6);
            $table->decimal('unit_price', 18, 6);
            $table->string('status', 32)->default('pending_momo');
            $table->foreignId('momo_transfer_id')->nullable()->constrained('momo_transfers')->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->foreignId('filler_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'currency']);
            $table->index(['user_id', 'status']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('buy_order_id')
                ->nullable()
                ->after('momo_payout_id')
                ->constrained('buy_orders')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('buy_order_id');
        });
        Schema::dropIfExists('buy_orders');
    }
};
