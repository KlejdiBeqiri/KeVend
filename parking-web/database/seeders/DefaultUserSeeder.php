<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DefaultUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@kevend.com'],
            [
                'name' => 'Admin KeVend',
                'password_hash' => Hash::make('password'),
                'role' => 'OWNER',
            ]
        );
    }
}
