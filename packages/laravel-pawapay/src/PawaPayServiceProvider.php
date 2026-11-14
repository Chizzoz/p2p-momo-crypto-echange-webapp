<?php

namespace Chizzoz\PawaPay;

use Illuminate\Support\ServiceProvider;

class PawaPayServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Merge package configuration
        $this->mergeConfigFrom(
            __DIR__ . '/../config/pawapay.php', 'pawapay'
        );

        // Bind the service as a singleton
        $this->app->singleton(PawaPayService::class, function ($app) {
            return new PawaPayService();
        });

        // Register alias for helper container resolves
        $this->app->alias(PawaPayService::class, 'pawapay');
    }

    /**
     * Bootstrap any package services.
     */
    public function boot(): void
    {
        // Publish configuration file
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/pawapay.php' => config_path('pawapay.php'),
            ], 'pawapay-config');
        }
    }
}
