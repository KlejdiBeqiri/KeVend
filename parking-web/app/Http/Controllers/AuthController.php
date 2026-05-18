<?php

namespace App\Http\Controllers;

use App\Services\KeVendBackendClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Show login form
     */
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect('/');
        }
        return view('auth.login');
    }

    /**
     * Handle login request
     */
    public function login(Request $request, KeVendBackendClient $backend)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $backendUrl = $backend->baseUrl();
        if ($backendUrl !== null) {
            $auth = $backend->authLogin($credentials['email'], $credentials['password']);
            if ($auth === null) {
                return back()->withErrors([
                    'email' => 'Të dhënat nuk përputhen me rekordet tona ose shërbimi Spring Boot nuk u përgjigj.',
                ])->onlyInput('email');
            }
            $request->session()->put('kevend_access_token', (string) ($auth['accessToken'] ?? ''));
            $request->session()->put('kevend_refresh_token', (string) ($auth['refreshToken'] ?? ''));
        }

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();
            return redirect()->intended('/');
        }

        $request->session()->forget(['kevend_access_token', 'kevend_refresh_token']);

        return back()->withErrors([
            'email' => 'Të dhënat nuk përputhen me rekordet tona.',
        ])->onlyInput('email');
    }

    /**
     * Handle logout
     */
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->forget(['kevend_access_token', 'kevend_refresh_token']);
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/login');
    }
}
