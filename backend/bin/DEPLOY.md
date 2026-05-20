# Deployment Guide

Covers NFR-07 (uptime), NFR-08 (recovery), NFR-10 (TLS).

## Prerequisites

- JDK 21 (Temurin recommended)
- PostgreSQL 14+
- Reverse proxy (nginx, Caddy, or a managed load balancer)
- Domain name with DNS pointed at the server
- TLS certificate — Let's Encrypt is fine

## Environment variables

The app reads these at startup. None are baked into source.

| Variable | Purpose | Required |
|---|---|---|
| `DB_URL` | JDBC URL, e.g. `jdbc:postgresql://localhost:5432/kevend` | yes |
| `DB_USERNAME` / `DB_PASSWORD` | Postgres creds | yes |
| `JWT_SECRET` | ≥32-byte secret for signing access tokens | yes |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP creds (Gmail app-password by default) | yes |
| `APP_CORS_ALLOWED_ORIGINS` | comma-separated origins | yes |
| `PLATFORM_COMMISSION_RATE` | default global commission (0.15 = 15%) | no |
| `RETENTION_RESERVATION_MONTHS` | overrides 24-month NFR-21 floor | no |
| `RETENTION_NOTIFICATION_MONTHS` | default 6 | no |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | enables real SMS | no |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | enables card payments | no |
| `PAYBY_MERCHANT_ID`, `PAYBY_API_KEY` | enables PayBY adapter | no |
| `POK_MERCHANT_ID`, `POK_API_KEY` | enables POK adapter | no |
| `DRIVER_PREMIUM_MONTHLY_EUR`, `OWNER_MONTHLY_EUR` | subscription pricing | no |
| `ENFORCE_OWNER_LISTING_GATE` | when true, hides lots from owners without an active subscription | no |
| `WELCOME_FIRST_N`, `WELCOME_PERCENT_OFF` | welcome promo (default 5 / 50) | no |
| `LOG_DIR` | where rolling audit log files live | no |

## Build + run

```bash
./mvnw -DskipTests clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

The app listens on :8080 by default. `/actuator/health` should return 200 within 30 s.

## TLS termination (NFR-10) — nginx

The app speaks plain HTTP; terminate TLS at nginx so cert rotation and HTTP/2 are out-of-process.

```nginx
server {
    listen 443 ssl http2;
    server_name api.kevend.al;

    ssl_certificate     /etc/letsencrypt/live/api.kevend.al/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kevend.al/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_set_header   X-Correlation-Id  $request_id;
    }
}
server {
    listen 80;
    server_name api.kevend.al;
    return 301 https://$host$request_uri;
}
```

Renew certs with `certbot renew --post-hook "systemctl reload nginx"` on a daily cron.

## Process supervisor (systemd)

```ini
# /etc/systemd/system/kevend.service
[Unit]
Description=KeVend backend
After=network.target postgresql.service

[Service]
EnvironmentFile=/etc/kevend/env
WorkingDirectory=/srv/kevend
ExecStart=/usr/bin/java -jar /srv/kevend/backend-0.0.1-SNAPSHOT.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
User=kevend

[Install]
WantedBy=multi-user.target
```

`systemctl enable kevend && systemctl start kevend`.

## Health probes

- Liveness: `GET /actuator/health/liveness`
- Readiness: `GET /actuator/health/readiness`
- Aggregate: `GET /actuator/health`

Wire your load balancer / orchestrator to readiness; restart on persistent liveness failure.

## Rollout strategy

- Stage env mirrors prod credentials (sandbox keys for Stripe/Twilio).
- Run smoke tests against `/actuator/health`, `POST /api/v1/auth/register` (test account), and one happy-path reservation flow before flipping DNS.
- Roll back by re-launching the previous jar — Postgres schema changes done via `ddl-auto=update` are additive only; downtime restores cleanly.

## Restart-time guarantees (NFR-08)

- All confirmed reservations + payments live in Postgres; nothing is in-memory.
- Pending soft-holds are restored from the `reservations` table — the cleanup scheduler picks them up on the next minute boundary.
- Targeted restart time: under 30 minutes from outage detection to traffic restored.
