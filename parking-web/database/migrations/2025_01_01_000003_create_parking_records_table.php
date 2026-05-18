<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parking_records', function (Blueprint $table) {
            $table->id();
            $table->string('license_plate')->index();
            $table->dateTime('entry_time');
            $table->dateTime('exit_time')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->decimal('fee', 8, 2)->default(0);
            $table->enum('status', ['parked', 'pending_payment', 'paid', 'cancelled'])->default('parked');
            $table->timestamps();
            $table->index('status');
            $table->index('entry_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parking_records');
    }
};
