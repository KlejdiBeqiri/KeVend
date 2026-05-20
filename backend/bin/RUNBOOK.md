# Operations Runbook

## NFR-08 — backups & restore

### Nightly backup

```bash
# /usr/local/bin/kevend-backup.sh
set -euo pipefail
TS=$(date +%F-%H%M)
pg_dump -h $DB_HOST -U $DB_USERNAME -F c kevend > /var/backups/kevend/$TS.dump
aws s3 cp /var/backups/kevend/$TS.dump s3://kevend-backups/$TS.dump --sse AES256
find /var/backups/kevend -mtime +7 -delete
```

Cron: `0 2 * * * kevend /usr/local/bin/kevend-backup.sh >> /var/log/kevend-backup.log 2>&1`.

### Point-in-time recovery (PITR)

Enable `wal_level=replica`, `archive_mode=on`, `archive_command='aws s3 cp %p s3://kevend-wal/%f'` in `postgresql.conf`. Combined with the nightly base backup this lets us roll forward to any minute-resolution timestamp.

### Restore drill (run quarterly)

1. Spin up an empty Postgres instance.
2. `pg_restore -d kevend_restored /path/to/<dump>`.
3. Smoke-check: `psql -c "SELECT count(*) FROM users;"`, `… FROM reservations;`, `… FROM payments;`.
4. Document the restore time. Target ≤30 min (NFR-08).

## NFR-07 — uptime monitoring

Use any external pinger that supports HTTPS + a custom assertion. Targets:

| Endpoint | Interval | Pass condition |
|---|---|---|
| `https://api.kevend.al/actuator/health` | 60 s | HTTP 200 + body contains `"status":"UP"` |
| `https://api.kevend.al/actuator/health/readiness` | 60 s | HTTP 200 |

Page on 3 consecutive failures. Recovery target: 30 min.

## NFR-06 — load testing

Sample k6 scripts (run against staging):

```js
// loadtest/lot-search.js
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 200, duration: '5m' };
export default function () {
  const r = http.get(`${__ENV.BASE_URL}/api/v1/parking-lots?lat=41.32&lng=19.82&radiusKm=2`);
  check(r, { '200': res => res.status === 200, '<2s': res => res.timings.duration < 2000 });
}
```

Run with `k6 run -e BASE_URL=https://staging.kevend.al loadtest/lot-search.js`. Ramp to 2 500 VUs to validate NFR-06; tune `spring.datasource.hikari.maximum-pool-size` and Postgres `max_connections` based on results.

## Common alarms

### "Too many failed logins"

Look in `audit.log` for `type=login.failure` lines. If the same email is hammered from many IPs, consider adding a global rate limit at nginx (`limit_req`) for `/api/v1/auth/login`.

### "Payment webhook not arriving"

1. Stripe dashboard → Developers → Webhooks → check delivery attempts.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches Stripe's signing secret.
3. Verify nginx forwards the raw body without modification (no `proxy_set_header Content-Type`).

### "Soft-holds not releasing"

Confirm scheduled jobs are running:
```bash
journalctl -u kevend | grep -i 'releaseExpiredHolds\|dispatchExpiry'
```
If no log entries appear within 2 minutes of startup, the `@EnableScheduling` annotation may have regressed. Restart and recheck.

### "Out of disk space — audit logs"

`logback-spring.xml` keeps 365 days of `audit.*.log`, rotated at 10 MB each. Adjust `maxHistory` if you need shorter retention; ensure off-host shipping (Loki, S3, etc.) is configured before lowering it.
