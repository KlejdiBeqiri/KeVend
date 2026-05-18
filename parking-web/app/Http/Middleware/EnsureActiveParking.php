<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveParking
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // If superadmin (ADMIN role), maybe they handle everything or we auto-select one.
            // But user said "The admin should be the one that adds the cars" (referring to Superadmin).
            // Actually, based on previous turn, the role is OWNER for the dashboard users.

            if (!Session::has('active_parking_id')) {
                $firstParking = $user->ownedParkings()->first();
                if ($firstParking) {
                    Session::put('active_parking_id', $firstParking->id);
                    Session::put('active_parking_name', $firstParking->name);
                }
            }
        }

        return $next($request);
    }
}
