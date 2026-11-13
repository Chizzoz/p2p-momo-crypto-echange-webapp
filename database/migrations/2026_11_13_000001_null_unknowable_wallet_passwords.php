<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Wallet-only users previously received a random bcrypt hash they never knew,
     * which blocked setting a first password. Clear those so Set Password works.
     */
    public function up()
    {
        DB::table('users')
            ->whereNotNull('eth_address')
            ->whereNull('email')
            ->update(['password' => null]);
    }

    /**
     * @return void
     */
    public function down()
    {
        // Irreversible: original random hashes were unknowable.
    }
};
