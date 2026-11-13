<?php

namespace Database\Seeders;

use App\Models\Token;
use Illuminate\Database\Seeder;

class TokenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Token::updateOrCreate(
            ['token_slug' => 'usdt'],
            [
                'token' => 'Tether USD',
                'symbol' => 'USDT',
            ]
        );
    }
}
