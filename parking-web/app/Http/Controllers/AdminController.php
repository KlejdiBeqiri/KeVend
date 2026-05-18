<?php

namespace App\Http\Controllers;

use App\Models\KevendParking;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Show admin dashboard with parking registration form
     */
    public function index()
    {
        $parkings = KevendParking::orderBy('id', 'desc')->get();
        $owners = User::where('role', 'OWNER')->get();

        return view('admin.parkings', compact('parkings', 'owners'));
    }

    /**
     * Store a new parking (and owner if specified)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'zone'           => 'required|string|max:255',
            'latitude'       => 'required|numeric',
            'longitude'      => 'required|numeric',
            'total_spots'    => 'required|integer|min:1',
            'price_per_hour' => 'required|numeric|min:0',
            'open_time'      => 'required',
            'close_time'     => 'required',
            'owner_email'    => 'required|email',
            'owner_password' => 'required|string|min:6',
        ]);

        try {
            DB::beginTransaction();

            // 1. Find or Create Owner
            $owner = User::where('email', $validated['owner_email'])->first();
            if (!$owner) {
                $owner = User::create([
                    'name'          => 'Owner of ' . $validated['name'],
                    'email'         => $validated['owner_email'],
                    'password_hash' => Hash::make($validated['owner_password']),
                    'role'          => 'OWNER',
                ]);
            } else {
                // Update password if user exists
                $owner->update([
                    'password_hash' => Hash::make($validated['owner_password']),
                    'role'          => 'OWNER',
                ]);
            }

            // 2. Create Parking linked to Owner
            $parking = new KevendParking();
            $parking->fill([
                'name'           => $validated['name'],
                'zone'           => $validated['zone'],
                'latitude'       => $validated['latitude'],
                'longitude'      => $validated['longitude'],
                'total_spots'    => $validated['total_spots'],
                'price_per_hour' => $validated['price_per_hour'],
                'open_time'      => $validated['open_time'],
                'close_time'     => $validated['close_time'],
                'owner_id'       => $owner->id,
            ]);
            $parking->available_spots = $validated['total_spots'];
            $parking->status = 'OPEN';
            $parking->promotion_rank = 0;
            $parking->save();

            DB::commit();
            return redirect('/admin/parkings')->with('success', 'Parkimi dhe Pronari u regjistruan me sukses!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gabim gjatë regjistrimit: ' . $e->getMessage())->withInput();
        }
    }
}
