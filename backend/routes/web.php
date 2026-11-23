<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'LIBRIVO', 'service' => 'Laravel REST API', 'frontend' => config('app.frontend_url'), 'status' => 'ready']));
