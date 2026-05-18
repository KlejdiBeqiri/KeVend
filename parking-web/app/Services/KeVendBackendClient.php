<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KeVendBackendClient
{
    public function baseUrl(): ?string
    {
        $url = config('services.kevend_backend.url');
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        return rtrim($url, '/');
    }

    public function timeout(): int
    {
        return max(1, (int) config('services.kevend_backend.timeout', 10));
    }

    /**
     * POST /api/v1/auth/login — returns decoded JSON or null on failure.
     *
     * @return array<string, mixed>|null
     */
    public function authLogin(string $email, string $password): ?array
    {
        $base = $this->baseUrl();
        if ($base === null) {
            return null;
        }

        $response = Http::timeout($this->timeout())
            ->acceptJson()
            ->post("{$base}/api/v1/auth/login", [
                'email' => $email,
                'password' => $password,
            ]);

        if ($response->failed()) {
            Log::warning('KeVend Spring Boot auth/login failed', [
                'status' => $response->status(),
            ]);

            return null;
        }

        $data = $response->json();
        if (! is_array($data)) {
            return null;
        }

        return $data;
    }

    /**
     * GET /api/v1/parkings (permitAll in Spring Security).
     *
     * @return list<array<string, mixed>>|null
     */
    public function getParkings(): ?array
    {
        $base = $this->baseUrl();
        if ($base === null) {
            return null;
        }

        $response = Http::timeout($this->timeout())
            ->acceptJson()
            ->get("{$base}/api/v1/parkings");

        if ($response->failed()) {
            Log::warning('KeVend Spring Boot GET /parkings failed', ['status' => $response->status()]);

            return null;
        }

        $data = $response->json();
        if (! is_array($data)) {
            return null;
        }

        return $data;
    }

    /**
     * GET /api/v1/parkings/{id} (requires Bearer JWT).
     *
     * @return array<string, mixed>|null
     */
    public function getParking(int|string $id, string $accessToken): ?array
    {
        $base = $this->baseUrl();
        if ($base === null || $accessToken === '') {
            return null;
        }

        $response = Http::timeout($this->timeout())
            ->acceptJson()
            ->withToken($accessToken)
            ->get("{$base}/api/v1/parkings/{$id}");

        if ($response->failed()) {
            Log::warning('KeVend Spring Boot GET /parkings/{id} failed', [
                'id' => $id,
                'status' => $response->status(),
            ]);

            return null;
        }

        $data = $response->json();
        if (! is_array($data)) {
            return null;
        }

        return $data;
    }

    /**
     * PUT /api/v1/parkings/{id} (requires Bearer JWT).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null
     */
    public function updateParking(int|string $id, array $payload, string $accessToken): ?array
    {
        $base = $this->baseUrl();
        if ($base === null || $accessToken === '') {
            return null;
        }

        $response = Http::timeout($this->timeout())
            ->acceptJson()
            ->withToken($accessToken)
            ->put("{$base}/api/v1/parkings/{$id}", $payload);

        if ($response->failed()) {
            Log::warning('KeVend Spring Boot PUT /parkings/{id} failed', [
                'id' => $id,
                'status' => $response->status(),
            ]);

            return null;
        }

        $data = $response->json();
        if (! is_array($data)) {
            return null;
        }

        return $data;
    }
}
