<?php

namespace App\Support;

use App\Models\Setting;

class ParkingFeeCalculator
{
    /**
     * Billed hours: at least 1, rounded up from minutes.
     */
    public static function billedHoursFromMinutes(int $durationMinutes): int
    {
        return max(1, (int) ceil(max(0, $durationMinutes) / 60));
    }

    /**
     * @param  array<string, mixed>|null  $tier
     */
    private static function tierAmount(array $tier): float
    {
        return (float) ($tier['amount'] ?? 0);
    }

    /**
     * @param  array<string, mixed>|null  $tier
     */
    private static function tierPerHour(array $tier): bool
    {
        return filter_var($tier['per_hour'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Compute the parking fee
     */
    public static function compute(int $parkingId, int $durationMinutes): float
    {
        $sameRaw = Setting::getForParking($parkingId, 'same_price_per_hour', '1');
        $same = $sameRaw === '1' || $sameRaw === 1 || $sameRaw === true;
        $hourly = (float) Setting::getForParking($parkingId, 'hourly_rate', 100);
        $H = self::billedHoursFromMinutes($durationMinutes);

        if ($same) {
            return round($H * $hourly, 2);
        }

        $raw = Setting::getForParking($parkingId, 'pricing_tiers', '[]');
        $tiers = is_string($raw) ? json_decode($raw, true) : $raw;
        if (! is_array($tiers) || count($tiers) === 0) {
            return round($H * $hourly, 2);
        }

        usort($tiers, fn ($a, $b) => ((int) ($a['from'] ?? 0)) <=> ((int) ($b['from'] ?? 0)));

        $fee = 0.0;
        $coveredUntil = 0;

        foreach ($tiers as $t) {
            if (! is_array($t)) {
                continue;
            }
            $from = (int) ($t['from'] ?? 0);
            $to = (int) ($t['to'] ?? 0);
            if ($to <= $from) {
                continue;
            }
            if ($H <= $from) {
                break;
            }
            $overlapEnd = min($H, $to);
            if ($overlapEnd <= $from) {
                continue;
            }
            $hoursInTier = $overlapEnd - max($coveredUntil, $from);
            if ($hoursInTier <= 0) {
                continue;
            }
            if (self::tierPerHour($t)) {
                $fee += $hoursInTier * self::tierAmount($t);
            } else {
                $fee += self::tierAmount($t);
            }
            $coveredUntil = max($coveredUntil, $overlapEnd);
            if ($coveredUntil >= $H) {
                break;
            }
        }

        if ($coveredUntil < $H) {
            $fee += ($H - $coveredUntil) * $hourly;
        }

        return round(max(0, $fee), 2);
    }
}
