<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('reserved_buyer')->nullable()->after('recipient');
            $table->string('reservation_id')->nullable()->after('reserved_buyer');
            $table->foreignId('momo_deposit_id')->nullable()->after('reservation_id');
            $table->foreignId('momo_payout_id')->nullable()->after('momo_deposit_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn([
                'reserved_buyer',
                'reservation_id',
                'momo_deposit_id',
                'momo_payout_id',
            ]);
        });
    }
};
