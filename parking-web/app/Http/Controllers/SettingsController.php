<?php

namespace App\Http\Controllers;

use App\Models\ParkingRecord;
use App\Models\Setting;
use App\Models\KevendParking;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class SettingsController extends Controller
{
    /**
     * Show settings page
     */
    public function index()
    {
        $parkingId = Session::get('active_parking_id');
        if (!$parkingId) {
            return redirect('/')->with('error', 'Ju lutem përzgjidhni një parkim së pari.');
        }

        $hourly_rate = Setting::get('hourly_rate', 100);
        $total_capacity = Setting::get('total_capacity', 50);
        $same_price_per_hour = Setting::get('same_price_per_hour', '1') === '1';
        $tiersRaw = Setting::get('pricing_tiers', '[]');
        $pricing_tiers = is_string($tiersRaw) ? json_decode($tiersRaw, true) : $tiersRaw;
        if (! is_array($pricing_tiers)) {
            $pricing_tiers = [];
        }

        return view('settings', compact('hourly_rate', 'total_capacity', 'same_price_per_hour', 'pricing_tiers'));
    }

    /**
     * Update settings
     */
    public function update(Request $request)
    {
        $parkingId = Session::get('active_parking_id');
        if (!$parkingId) {
            return redirect('/')->with('error', 'Gabim sessioni.');
        }

        $same = $request->boolean('same_price_per_hour');

        $validated = $request->validate([
            'total_capacity' => 'required|integer|min:1',
            'hourly_rate' => array_merge(
                $same ? ['required'] : ['nullable'],
                ['numeric', 'min:0']
            ),
            'pricing_tiers' => ['nullable', 'string', 'max:20000'],
        ]);

        Setting::set('same_price_per_hour', $same ? '1' : '0');
        Setting::set('total_capacity', $validated['total_capacity']);

        if ($same) {
            Setting::set('hourly_rate', (float) $validated['hourly_rate']);
        } else {
            $decoded = json_decode((string) ($validated['pricing_tiers'] ?? '[]'), true);
            if (! is_array($decoded)) {
                return redirect('/settings')->withInput()->withErrors(['pricing_tiers' => 'Formati i gabuar.']);
            }
            Setting::set('pricing_tiers', json_encode(array_values($decoded)));
            Setting::set('hourly_rate', (float) $request->input('hourly_rate', Setting::get('hourly_rate', 100)));
        }

        // Sync with KevendParking in shared DB
        try {
            $kp = KevendParking::find($parkingId);
            if ($kp) {
                $kp->total_spots = (int) $validated['total_capacity'];
                $kp->price_per_hour = (float) Setting::get('hourly_rate', 100);
                $kp->save();
            }
        } catch (\Throwable $e) {
            // Log error
        }

        return redirect('/settings')->with('success', 'Cilësimet u përditësuan me sukses!');
    }

    /**
     * Show daily reports
     */
    public function reports(Request $request)
    {
        $parkingId = Session::get('active_parking_id');
        if (!$parkingId) {
            return redirect('/')->with('error', 'Asnjë parkim i përzgjedhur.');
        }

        $date = $request->get('date', Carbon::today()->toDateString());
        $carbonDate = Carbon::parse($date);

        $records = ParkingRecord::where('parking_id', $parkingId)
            ->whereDate('exit_time', $carbonDate)
            ->where('status', 'paid')
            ->get();

        $stats = [
            'date' => $carbonDate->format('d M Y'),
            'total_vehicles' => $records->count(),
            'total_revenue' => $records->sum('fee'),
            'avg_fee' => $records->count() > 0 ? $records->avg('fee') : 0,
        ];

        return view('reports', compact('stats', 'date', 'records'));
    }
}
