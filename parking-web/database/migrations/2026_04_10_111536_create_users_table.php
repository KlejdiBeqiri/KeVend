<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'remember_token')) {
                    $table->rememberToken();
                }
                if (!Schema::hasColumn('users', 'email_verified_at')) {
                    $table->timestamp('email_verified_at')->nullable();
                }
            });
        } else {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('surname')->nullable();
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password_hash');
                $table->string('role')->default('DRIVER');
                $table->rememberToken();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
