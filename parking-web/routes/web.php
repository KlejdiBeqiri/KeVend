<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ParkingController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\AdminController;
use Illuminate\Support\Facades\Auth;

// Authentication Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Protected Routes
Route::middleware('auth')->group(function () {
    
    // Dashboard & Owner Actions
    Route::get('/', function() {
        if (Auth::user()->isAdmin()) {
            return redirect('/admin/parkings');
        }
        return app(ParkingController::class)->index(request(), app(\App\Services\KeVendBackendClient::class));
    });

    // Middlewares to prevent Admin from accessing Owner panels
    Route::middleware('owner')->group(function() {
        Route::post('/vehicles', [ParkingController::class, 'checkIn']);
        Route::post('/vehicles/{id}/finalize', [ParkingController::class, 'finalizeCheckout']);
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::post('/settings', [SettingsController::class, 'update']);
        Route::get('/reports', [SettingsController::class, 'reports']);

        // AJAX API endpoints
        Route::prefix('api/reservations')->group(function () {
            Route::get('/',            [ReservationController::class, 'index']);
            Route::get('/search',      [ReservationController::class, 'search']);
            Route::get('/check-plate', [ReservationController::class, 'checkPlate']);
            Route::get('/stats',       [ReservationController::class, 'stats']);
        });
    });

    // Admin Routes (Admin only)
    Route::middleware('admin')->group(function() {
        Route::get('/admin/parkings', [AdminController::class, 'index']);
        Route::post('/admin/parkings', [AdminController::class, 'store']);
    });
});
