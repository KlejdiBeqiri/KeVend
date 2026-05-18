<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'surname',
        'email',
        'phone',
        'password_hash',
        'role',
        'anonymized',
        'email_verified',
        'failed_login_attempts',
    ];

    protected $attributes = [
        'anonymized' => false,
        'email_verified' => false,
        'failed_login_attempts' => 0,
    ];

    /**
     * Check if the user is a superadmin.
     * Since the shared database only allows 'OWNER', 'DRIVER', 'GUEST',
     * we identify the superadmin by their specific email.
     */
    public function isAdmin(): bool
    {
        return $this->email === 'admin@kevend.com';
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    /**
     * Specify the password column name for Laravel auth
     */
    public function getAuthPasswordName()
    {
        return 'password_hash';
    }

    /**
     * Map auth password to password_hash
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Alias for password_hash to satisfy some Laravel underlying logic
     */
    public function getPasswordAttribute()
    {
        return $this->password_hash;
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password_hash'] = $value;
    }

    public $timestamps = false;

    public function parkingRecords()
    {
        return $this->hasMany(ParkingRecord::class);
    }

    public function settings()
    {
        return $this->hasMany(Setting::class);
    }

    public function reservations()
    {
        return $this->hasMany(KevendReservation::class, 'driver_id');
    }

    public function ownedParkings()
    {
        return $this->hasMany(KevendParking::class, 'owner_id');
    }

    /**
     * Full name accessor.
     */
    public function getFullNameAttribute(): string
    {
        return trim(($this->name ?? '') . ' ' . ($this->surname ?? ''));
    }
}
