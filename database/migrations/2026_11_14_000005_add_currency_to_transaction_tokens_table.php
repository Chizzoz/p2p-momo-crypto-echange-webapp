<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_tokens', function (Blueprint $table) {
            $table->string('currency', 8)->default('ZMW')->after('price');
        });

        // Backfill from seller MoMo country when available.
        DB::statement("
            UPDATE transaction_tokens tt
            INNER JOIN transactions t ON t.id = tt.transaction_id
            INNER JOIN users u ON u.id = t.user_id
            INNER JOIN countries c ON c.id = u.country_id
            INNER JOIN currencies cur ON cur.id = c.currency_id
            SET tt.currency = UPPER(cur.currency_slug)
            WHERE u.country_id IS NOT NULL
        ");
    }

    public function down(): void
    {
        Schema::table('transaction_tokens', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};
