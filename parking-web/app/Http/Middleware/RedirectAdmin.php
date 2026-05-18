<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check() && Auth::user()->isAdmin()) {
            return redirect('/admin/parkings')->with('error', 'Administratorët nuk mund të aksesojnë panelin e pronarëve.');
        }

        return $next($request);
    }
}
