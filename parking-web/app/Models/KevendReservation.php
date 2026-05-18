<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent model for the Java backend's `reservations` table.
 *
 * Uses the shared PostgreSQL connection (pgsql_kevend).
 * The schema is owned by the Spring Boot / Hibernate side —
 * Laravel never runs migrations against this table.
 *
 * Column mapping mirrors Reservation.java (snake_case via Hibernate defaults).
 */
class KevendReservation extends Model
{
    protected $table = 'reservations';

    // Hibernate manages created_at/updated_at differently
    public $timestamps = false;

    protected $fillable = [
        'driver_id',
        'parking_id',
        'spots_reserved',
        'status',
        'hold_expires_at',
        'start_time',
        'end_time',
        'total_cost',
        'platform_commission',
        'owner_revenue',
        'expiry_warning_sent',
        'expiry_reached_sent',
        'vehicle_plate',
    ];

    protected $casts = [
        'spots_reserved'       => 'integer',
        'hold_expires_at'      => 'datetime',
        'start_time'           => 'datetime',
        'end_time'             => 'datetime',
        'total_cost'           => 'decimal:2',
        'platform_commission'  => 'decimal:2',
        'owner_revenue'        => 'decimal:2',
        'expiry_warning_sent'  => 'boolean',
        'expiry_reached_sent'  => 'boolean',
    ];

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                      */
    /* ------------------------------------------------------------------ */

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function parking()
    {
        return $this->belongsTo(KevendParking::class, 'parking_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Status helpers                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Active statuses: reservations that still "count" (occupying a spot).
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['SOFT_HOLD', 'CONFIRMED']);
    }

    /**
     * Human-friendly Albanian status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'SOFT_HOLD'  => 'Në pritje',
            'CONFIRMED'  => 'Konfirmuar',
            'COMPLETED'  => 'Përfunduar',
            'EXPIRED'    => 'Skaduar',
            'CANCELLED'  => 'Anuluar',
            default      => $this->status ?? '—',
        };
    }

    /**
     * CSS class for the badge colour.
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'SOFT_HOLD'  => 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
            'CONFIRMED'  => 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
            'COMPLETED'  => 'bg-blue-500/20 text-blue-400 border-blue-500/40',
            'EXPIRED'    => 'bg-red-500/20 text-red-400 border-red-500/40',
            'CANCELLED'  => 'bg-gray-500/20 text-gray-400 border-gray-500/40',
            default      => 'bg-white/10 text-white/60 border-white/20',
        };
    }
}
