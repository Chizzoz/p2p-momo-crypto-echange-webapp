<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Re-check non-terminal MoMo transfers every minute as a webhook fallback.
        $schedule->call(function () {
            \App\Models\MomoTransfer::query()
                ->whereNotIn('status', ['COMPLETED', 'FAILED'])
                ->orderBy('id')
                ->limit(25)
                ->pluck('id')
                ->each(function (int $id) {
                    \App\Jobs\CheckMomoTransferStatus::dispatch($id);
                });
        })->everyMinute();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
