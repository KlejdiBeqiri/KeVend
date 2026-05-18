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
        Schema::table('parking_records', function (Blueprint $table) {
            $table->unsignedBigInteger('parking_id')->nullable()->after('user_id');
            // We link optionally to the shared parkings table
            $table->foreign('parking_id')->references('id')->on('parkings')->onDelete('cascade');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->unsignedBigInteger('parking_id')->nullable()->after('user_id');
            $table->foreign('parking_id')->references('id')->on('parkings')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parking_records', function (Blueprint $table) {
            $table->dropForeign(['parking_id']);
            $table->dropColumn('parking_id');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropForeign(['parking_id']);
            $table->dropColumn('parking_id');
        });
    }
};
