<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiat_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('country_id')->nullable()->constrained()->nullOnDelete();
            $table->string('currency', 8);
            $table->decimal('balance', 18, 2)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'currency']);
            $table->index(['user_id', 'country_id']);
        });

        Schema::table('wallet_ledger_entries', function (Blueprint $table) {
            $table->foreignId('fiat_wallet_id')
                ->nullable()
                ->after('user_id')
                ->constrained('fiat_wallets')
                ->nullOnDelete();
        });

        // Move legacy single account_balance into a ZMW fiat wallet.
        $users = DB::table('users')
            ->select('id', 'country_id', 'account_balance')
            ->where('account_balance', '>', 0)
            ->get();

        foreach ($users as $user) {
            $walletId = DB::table('fiat_wallets')->insertGetId([
                'user_id' => $user->id,
                'country_id' => $user->country_id,
                'currency' => 'ZMW',
                'balance' => $user->account_balance,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('wallet_ledger_entries')
                ->where('user_id', $user->id)
                ->where('currency', 'ZMW')
                ->whereNull('fiat_wallet_id')
                ->update(['fiat_wallet_id' => $walletId]);
        }
    }

    public function down(): void
    {
        Schema::table('wallet_ledger_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fiat_wallet_id');
        });
        Schema::dropIfExists('fiat_wallets');
    }
};
