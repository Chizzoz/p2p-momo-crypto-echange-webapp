<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->foreignId('country_id')->nullable()->after('id')->constrained('countries')->nullOnDelete();
            $table->string('pawapay_provider')->nullable()->unique()->after('method_slug');
            $table->unique('method_slug');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropUnique(['pawapay_provider']);
            $table->dropUnique(['method_slug']);
            $table->dropConstrainedForeignId('country_id');
            $table->dropColumn('pawapay_provider');
        });
    }
};
