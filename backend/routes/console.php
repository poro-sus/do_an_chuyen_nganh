<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('library:expire-holds')->everyMinute()->withoutOverlapping();
