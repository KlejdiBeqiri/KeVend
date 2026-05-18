<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Session;

class Setting extends Model
{
    protected $fillable = ['user_id', 'parking_id', 'key', 'value'];

    /**
     * Get a setting value for the active parking lot
     */
    public static function get($key, $default = null)
    {
        $parkingId = Session::get('active_parking_id');
        if (!$parkingId) return $default;

        return self::getForParking((int) $parkingId, $key, $default);
    }

    public static function getForParking(int $parkingId, string $key, $default = null)
    {
        $setting = self::where('parking_id', $parkingId)->where('key', $key)->first();

        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value for the active parking lot
     */
    public static function set($key, $value)
    {
        $parkingId = Session::get('active_parking_id');
        if (!$parkingId) return null;

        return self::updateOrCreate(
            ['parking_id' => $parkingId, 'key' => $key],
            ['value' => $value]
        );
    }

    public function parking()
    {
        return $this->belongsTo(\App\Models\KevendParking::class, 'parking_id');
    }
}
