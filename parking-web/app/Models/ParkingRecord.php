<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ParkingRecord extends Model
{
    protected $table = 'parking_records';
    protected $fillable = [
        'user_id',
        'parking_id',
        'license_plate',
        'entry_time',
        'exit_time',
        'duration_minutes',
        'fee',
        'status',
    ];

    protected $casts = [
        'entry_time' => 'datetime',
        'exit_time' => 'datetime',
        'fee' => 'float',
        'duration_minutes' => 'integer',
    ];

    /**
     * Format duration in minutes to human-readable format (Albanian)
     * Example: 90 -> "1o 30m"
     */
    public static function formatDuration(int $minutes): string
    {
        $hours = (int) floor($minutes / 60);
        $mins = $minutes % 60;

        if ($hours === 0) {
            return $mins . 'm';
        }
        if ($mins === 0) {
            return $hours . 'o';
        }
        return $hours . 'o ' . $mins . 'm';
    }

    /**
     * Get translated status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'parked' => 'I Parkuar',
            'pending_payment' => 'Pagesë e Pritshme',
            'paid' => 'Paguar',
            'cancelled' => 'Anuluar',
            default => $this->status,
        };
    }


    /**
     * Calculate billed hours (rounded up to next full hour)
     * Example: 90 minutes -> 2 hours
     */
    public static function billedHours(int $minutes): int
    {
        return (int) ceil($minutes / 60);
    }

    /**
     * Calculate fee based on duration
     * Rate: 100 ALL per hour (rounded up)
     */
    public static function calculateFee(int $minutes): float
    {
        $hours = self::billedHours($minutes);
        return round($hours * 100, 2);
    }

    public function parking()
    {
        return $this->belongsTo(KevendParking::class, 'parking_id');
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
