<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var string[]
     */
    protected $fillable = [
        'currency',
        'symbol',
        'rate',
        'currency_slug',
    ];

    public function countries(): HasMany
    {
        return $this->hasMany(Country::class);
    }
}
