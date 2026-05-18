<?php

namespace App\Http\Controllers;

use App\Models\KevendReservation;
use App\Models\KevendParking;
use App\Models\ParkingRecord;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;

/**
 * AJAX controller for live reservation data from the shared PostgreSQL database.
 * Scoped to the active parking lot in session.
 */
class ReservationController extends Controller
{
    /**
     * Helper to get the ID of the parking lot currently being managed in session.
     */
    private function getActiveParkingId(): ?int
    {
        return Session::get('active_parking_id');
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $parkingId = $this->getActiveParkingId();
            if (!$parkingId) {
                return response()->json(['reservations' => [], 'count' => 0]);
            }

            $query = KevendReservation::with(['driver', 'parking'])
                ->where('parking_id', $parkingId)
                ->active()
                ->orderBy('id', 'desc')
                ->limit(50);

            if ($request->filled('since')) {
                $query->where('id', '>', (int) $request->input('since'));
            }

            $reservations = $query->get()->map(function ($r) {
                return [
                    'id'               => $r->id,
                    'driver_name'      => $r->driver ? $r->driver->full_name : '—',
                    'driver_email'     => $r->driver->email ?? '—',
                    'parking_name'     => $r->parking->name ?? '—',
                    'parking_id'       => $r->parking_id,
                    'spots_reserved'   => $r->spots_reserved,
                    'status'           => $r->status,
                    'status_label'     => $r->status_label,
                    'status_color'     => $r->status_color,
                    'hold_expires_at'  => $r->hold_expires_at?->toIso8601String(),
                    'start_time'       => $r->start_time?->toIso8601String(),
                    'end_time'         => $r->end_time?->toIso8601String(),
                    'total_cost'       => $r->total_cost,
                    'vehicle_plate'    => $r->vehicle_plate,
                ];
            });

            return response()->json([
                'reservations' => $reservations,
                'count'        => $reservations->count(),
                'polled_at'    => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function search(Request $request): JsonResponse
    {
        try {
            $plate = strtoupper(trim($request->input('plate', '')));
            if (empty($plate)) {
                return response()->json(['found' => false, 'reservations' => []]);
            }

            $parkingId = $this->getActiveParkingId();
            if (!$parkingId) {
                return response()->json(['found' => false, 'reservations' => []]);
            }

            $query = KevendReservation::with(['driver', 'parking'])
                ->where('parking_id', $parkingId)
                ->active()
                ->where(function($q) use ($plate) {
                    $q->where('vehicle_plate', 'ILIKE', "%{$plate}%")
                      ->orWhereHas('driver', function ($dq) use ($plate) {
                          $dq->where('name', 'ILIKE', "%{$plate}%")
                             ->orWhere('surname', 'ILIKE', "%{$plate}%");
                      });
                })
                ->orderBy('id', 'desc');

            $reservations = $query->limit(20)->get()->map(function ($r) {
                return [
                    'id'               => $r->id,
                    'driver_name'      => $r->driver ? $r->driver->full_name : '—',
                    'parking_name'     => $r->parking->name ?? '—',
                    'status_label'     => $r->status_label,
                    'status_color'     => $r->status_color,
                    'vehicle_plate'    => $r->vehicle_plate,
                ];
            });

            return response()->json([
                'found'        => $reservations->isNotEmpty(),
                'plate'        => $plate,
                'reservations' => $reservations,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function checkPlate(Request $request): JsonResponse
    {
        try {
            $plate = strtoupper(trim($request->input('plate', '')));
            if (strlen($plate) < 2) {
                return response()->json(['reserved' => false]);
            }

            $parkingId = $this->getActiveParkingId();
            if (!$parkingId) {
                return response()->json(['reserved' => false]);
            }

            $reservation = KevendReservation::where('parking_id', $parkingId)
                ->where('vehicle_plate', $plate)
                ->active()
                ->with(['driver', 'parking'])
                ->first();

            if ($reservation) {
                return response()->json([
                    'reserved'     => true,
                    'plate'        => $plate,
                    'status_label' => $reservation->status_label,
                    'driver_name'  => $reservation->driver?->full_name ?? '—',
                    'parking_name' => $reservation->parking->name ?? '—',
                ]);
            }

            return response()->json(['reserved' => false]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): JsonResponse
    {
        try {
            $parkingId = $this->getActiveParkingId();
            if (!$parkingId) {
                return response()->json([
                    'active_reservations' => 0,
                    'confirmed_reservations' => 0,
                    'soft_holds' => 0,
                    'available_spots' => null,
                ]);
            }

            // 1. Get physical occupancy
            $occupiedCount = ParkingRecord::where('parking_id', $parkingId)
                ->where('status', 'parked')
                ->count();

            // 2. Get active reservations from shared PostgreSQL DB
            // (We filter those already parked since they will be in $occupiedCount)
            $parkedPlates = ParkingRecord::where('parking_id', $parkingId)
                ->where('status', 'parked')
                ->pluck('license_plate')
                ->map(fn($p) => strtoupper($p))
                ->toArray();

            $allActiveReservations = KevendReservation::where('parking_id', $parkingId)
                ->active()
                ->get();

            $pendingReservationsCount = 0;
            foreach ($allActiveReservations as $res) {
                if (!in_array(strtoupper($res->vehicle_plate), $parkedPlates)) {
                    $pendingReservationsCount++;
                }
            }

            // 3. Calculate available spots
            $totalCapacity = (int) Setting::getForParking($parkingId, 'total_capacity', 50);
            $availableSpots = max(0, $totalCapacity - $occupiedCount - $pendingReservationsCount);

            // 4. Sync to DB if needed
            try {
                $kp = KevendParking::find($parkingId);
                if ($kp) {
                    $kp->available_spots = $availableSpots;
                    $kp->save();
                }
            } catch (\Throwable $e) {}

            return response()->json([
                'active_reservations'    => $pendingReservationsCount + (count($allActiveReservations) - $pendingReservationsCount), // total active
                'confirmed_reservations' => $allActiveReservations->where('status', 'CONFIRMED')->count(),
                'soft_holds'             => $allActiveReservations->where('status', 'SOFT_HOLD')->count(),
                'available_spots'        => $availableSpots,
                'polled_at'              => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
