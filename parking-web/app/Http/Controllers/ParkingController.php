<?php

namespace App\Http\Controllers;

use App\Models\ParkingRecord;
use App\Models\KevendReservation;
use App\Models\KevendParking;
use App\Models\User;
use App\Models\Setting;
use App\Services\KeVendBackendClient;
use App\Support\ParkingFeeCalculator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;

class ParkingController extends Controller
{
    /**
     * Show the main dashboard with parked vehicles and recent departures
     */
    public function index(Request $request, KeVendBackendClient $backend)
    {
        $user = Auth::user();
        $parkingId = Session::get('active_parking_id');
        $search = $request->get('search');

        // If no active parking, we cannot show the dashboard properly
        if (!$parkingId) {
            return view('index', [
                'parked'              => collect(),
                'departures'          => collect(),
                'available'           => 0,
                'totalCapacity'       => 0,
                'search'              => $search,
                'springParkings'      => [],
                'pricingForJs'        => ['samePricePerHour' => true, 'hourlyRate' => 100, 'tiers' => []],
                'pendingReservations' => collect(),
                'parkedReservations'  => [],
                'reservationCount'    => 0,
                'no_parking'          => true
            ]);
        }

        $parkedQuery = ParkingRecord::where('parking_id', $parkingId)
            ->where('status', 'parked')
            ->orderBy('entry_time', 'desc');

        if ($search) {
            $parkedQuery->where('license_plate', 'like', "%{$search}%");
        }

        $parked = $parkedQuery->get();

        $departures = ParkingRecord::where('parking_id', $parkingId)
            ->whereIn('status', ['pending_payment', 'paid'])
            ->orderBy('exit_time', 'desc')
            ->limit(10)
            ->get();

        // -----------------------------------------------------------------
        // Reservations from the shared PostgreSQL database
        // -----------------------------------------------------------------
        $pendingReservations = collect();
        $parkedReservations  = [];

        try {
            // All active reservations for CURRENT parking
            $allReservations = KevendReservation::with('driver')
                ->where('parking_id', $parkingId)
                ->active()
                ->orderBy('id', 'desc')
                ->get();

            $parkedPlates = $parked->pluck('license_plate')->map(fn($p) => strtoupper($p))->toArray();

            foreach ($allReservations as $res) {
                $plate = strtoupper($res->vehicle_plate);
                if (in_array($plate, $parkedPlates)) {
                    $parkedReservations[$plate] = $res;
                } else {
                    $pendingReservations->push($res);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('KeVend PgSQL integration error: ' . $e->getMessage());
        }

        $activeReservationCount = $pendingReservations->count();
        $reservationCount = $activeReservationCount + count($parkedReservations);

        $totalCapacity = (int) Setting::get('total_capacity', 50);
        $occupied = ParkingRecord::where('parking_id', $parkingId)->where('status', 'parked')->count();
        // Vende te lira = Total - Parked - Active Reservations (not yet parked)
        $available = max(0, $totalCapacity - $occupied - $activeReservationCount);

        // Update KevendParking available_spots in shared DB
        try {
            $kp = KevendParking::find($parkingId);
            if ($kp) {
                $kp->available_spots = $available;
                $kp->save();
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to sync available spots to KevendParking: ' . $e->getMessage());
        }

        $samePrice = Setting::get('same_price_per_hour', '1') === '1';
        $hourlyRate = (float) Setting::get('hourly_rate', 100);
        $tiersJson = Setting::get('pricing_tiers', '[]');
        $tiers = is_string($tiersJson) ? json_decode($tiersJson, true) : $tiersJson;
        if (! is_array($tiers)) {
            $tiers = [];
        }
        $pricingForJs = [
            'samePricePerHour' => $samePrice,
            'hourlyRate' => $hourlyRate,
            'tiers' => array_values($tiers),
        ];

        return view('index', [
            'parked'              => $parked,
            'departures'          => $departures,
            'available'           => $available,
            'totalCapacity'       => $totalCapacity,
            'search'              => $search,
            'pricingForJs'        => $pricingForJs,
            'pendingReservations' => $pendingReservations,
            'parkedReservations'  => $parkedReservations,
            'reservationCount'    => $reservationCount,
            'active_parking_name' => Session::get('active_parking_name'),
        ]);
    }

    /**
     * Create a new parking record (check-in)
     */
    public function checkIn(Request $request)
    {
        $user = Auth::user();
        $parkingId = Session::get('active_parking_id');

        if (!$parkingId) {
            return back()->with('error', 'Asnjë parkim i përzgjedhur.');
        }

        $validated = $request->validate([
            'license_plate' => 'required|string|max:20|uppercase',
        ], [
            'license_plate.required' => 'Ju lutem shënoni targën e automjetit.',
        ]);

        // Check if vehicle is already parked in THIS parking
        $existing = ParkingRecord::where('parking_id', $parkingId)
            ->where('license_plate', $validated['license_plate'])
            ->where('status', 'parked')
            ->first();

        if ($existing) {
            return redirect('/')->with('error', "Automjeti {$validated['license_plate']} është i parkuar aktualisht në këtë parkim.");
        }

        $now = Carbon::now();

        ParkingRecord::create([
            'user_id' => $user->id,
            'parking_id' => $parkingId,
            'license_plate' => $validated['license_plate'],
            'entry_time' => $now,
            'status' => 'parked',
        ]);

        // When a vehicle checks in, change any active reservation for this plate in THIS parking to "COMPLETED"
        try {
            KevendReservation::where('parking_id', $parkingId)
                ->where('vehicle_plate', $validated['license_plate'])
                ->active()
                ->update(['status' => 'COMPLETED', 'start_time' => $now]);
        } catch (\Throwable $e) {
            Log::warning('KeVend PgSQL check-in completion error: ' . $e->getMessage());
        }

        return redirect('/')
            ->with('success', "Automjeti {$validated['license_plate']} u regjistrua me sukses!");
    }

    /**
     * Complete checkout and payment in a single step
     */
    public function finalizeCheckout(Request $request, $id)
    {
        $parkingId = Session::get('active_parking_id');
        $record = ParkingRecord::where('parking_id', $parkingId)->findOrFail($id);

        if (!in_array($record->status, ['parked', 'pending_payment'])) {
            return redirect('/')->with('error', 'Ky veprim nuk mund të kryhet.');
        }

        $now = Carbon::now();
        $durationMinutes = max(1, (int) ceil($record->entry_time->diffInSeconds($now) / 60));
        
        // Fee calculation based on parking_id settings
        $fee = ParkingFeeCalculator::compute((int) $parkingId, $durationMinutes);

        $record->update([
            'exit_time' => $now,
            'duration_minutes' => $durationMinutes,
            'fee' => $fee,
            'status' => 'paid',
        ]);

        return redirect('/')
            ->with('success', "Mjeti {$record->license_plate} u largua dhe pagesa u krye me sukses!");
    }
}
