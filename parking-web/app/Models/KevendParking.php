<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent model for the Java backend's `parkings` table.
 *
 * Read-only from Laravel's perspective — the Java backend owns parking CRUD.
 * Uses the shared PostgreSQL connection (pgsql_kevend).
 */
class KevendParking extends Model
{
    protected $table = 'parkings';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'zone',
        'latitude',
        'longitude',
        'total_spots',
        'available_spots',
        'price_per_hour',
        'status',
        'open_time',
        'close_time',
        'promotion_rank',
        'owner_id',
    ];

    protected $casts = [
        'latitude'        => 'double',
        'longitude'       => 'double',
        'total_spots'     => 'integer',
        'available_spots' => 'integer',
        'price_per_hour'  => 'decimal:2',
        'promotion_rank'  => 'integer',
        'open_time'       => 'datetime',
        'close_time'      => 'datetime',
        'created_at'      => 'datetime',
    ];

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                      */
    /* ------------------------------------------------------------------ */

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function reservations()
    {
        return $this->hasMany(KevendReservation::class, 'parking_id');
    }
}
