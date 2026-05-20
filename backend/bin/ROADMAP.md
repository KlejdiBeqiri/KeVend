# KeVend Backend Roadmap

Single source of truth for everything the spec (`Specifikat.docx`) asks for.
Mark items as you go: `[ ]` not started, `[~]` in progress, `[x]` done.

Each item lists the spec IDs it satisfies and the concrete files to touch.

---

## Phase 0 — Already shipped (reference, do not redo)

- [x] `@EnableScheduling` + soft-hold/session sweep jobs (F-02)
- [x] `/api/v1/parking-lots` route + OWNER role gating (F-11, FR-11)
- [x] Lot search by zone / nearby / price filter (FR-01, FR-14, F-09)
- [x] Reservation soft-hold flow + commission split (F-02, F-04, FR-05, FR-19)
- [x] Reservation history endpoint (FR-10 history half)
- [x] Payment recording + check-in confirmation notification (FR-04, FR-05)
- [x] 10-minute expiry warning scheduled job (FR-07 part 1)
- [x] Hourly unpaid reminder scheduled job (FR-08)
- [x] Reviews with ≥5-review public threshold (FR-16, F-10)
- [x] Favorites with 5-item cap (FR-15)
- [x] Owner anonymized session list (FR-13 list half, NFR-14)
- [x] Owner revenue chart endpoint (FR-17)
- [x] Login lockout after 5 failed attempts (NFR-13)
- [x] Multi-currency ALL/EUR enum (NFR-17)
- [x] Error timestamps via `GlobalExceptionHandler` (NFR-24)

---

## Phase 1 — Backend correctness fixes (small, high-impact) — DONE

### 1. GDPR anonymize-instead-of-delete (NFR-12 fix)
- [x] Add `anonymized` boolean + null-out PII (name, surname, email, phone) on `User`
- [x] Replace hard delete in `UserService.deleteAccount` with anonymization
- [x] Email becomes a placeholder like `deleted-<id>@anon.kevend.local` to keep unique constraint
- [x] Revoke refresh tokens, delete email-verification tokens
- [x] Keep historical reservations / payments / reviews intact for owner accounting (NFR-22)
- [x] Update `UserController.deleteMe` Javadoc to reflect anonymization
- Files: `model/User.java`, `service/UserService.java`

### 2. Second notification at exact expiry (FR-07 part 2)
- [x] Add `expiryReachedSent` boolean to `Reservation`
- [x] Renamed `sendExpiryWarnings` to `dispatchExpiryNotifications`; sends both warnings + at-expiry
- [x] Reservation.confirm resets both flags so re-confirmation re-arms notifications
- Files: `model/Reservation.java`, `service/NotificationService.java`, `repository/ReservationRepository.java`, `service/ReservationService.java`

### 3. Albanian + English message bundle (partial NFR-18)
- [x] `messages.properties` (English defaults) — 35 keys
- [x] `messages_sq.properties` (Albanian) — 35 keys
- [x] `MessageConfig` with `ReloadableResourceBundleMessageSource` (UTF-8) + `AcceptHeaderLocaleResolver`
- [x] `I18n` helper bean with shortcut methods for `badRequest`, `notFound`, `conflict`, `forbidden`, `status`
- [x] All services + GlobalExceptionHandler + AuthController refactored — no inline error literals remain
- [x] Per-user push-notification locale — `User.preferredLocale` field + `I18n.tFor(localeTag, key, args)` + `NotificationService.renderFor(user, key, args)`; check-in / expiry-warning / at-expiry / unpaid-reminder all rendered in the driver's language; `PUT /api/v1/users/me/locale` to set
- Files: `config/MessageConfig.java`, `i18n/I18n.java`, `resources/messages*.properties`, all services + `exception/GlobalExceptionHandler.java`, `controller/AuthController.java`

### 4. Health checks + actuator (helps NFR-07, NFR-08)
- [x] Added `spring-boot-starter-actuator` dependency
- [x] Exposed `/actuator/health`, `/actuator/info`, `/actuator/metrics`; health + info are unauthenticated, metrics requires auth
- [x] DB health indicator is auto-configured by actuator (no custom impl needed)
- Files: `pom.xml`, `config/SecurityConfig.java`, `application.properties`

### 5. Retention sweep jobs (NFR-21, NFR-22)
- [x] `RetentionService.purgeOldReservations` runs daily 03:00, hard-deletes reservations + cascading payments / reviews / notifications older than 24 months
- [x] `RetentionService.purgeOperationalData` runs daily 03:30, drops aged notifications, expired refresh tokens, used / expired email verification tokens
- [x] Config props `app.retention.reservation-months=24`, `app.retention.notification-months=6`
- Files: `service/RetentionService.java`, `application.properties`

---

## Phase 2 — Business model — DONE

### 6. Driver premium subscription
- [x] `DriverSubscription` entity (PREMIUM plan, ACTIVE / EXPIRED / CANCELLED)
- [x] `DriverSubscriptionRepository.findActive` / `findExpired`
- [x] `DriverSubscriptionService.subscribe / cancel / active / isPremium` + nightly `expirePastSubscriptions` scheduled job
- [x] `DriverSubscriptionController` — `GET /me`, `POST /`, `DELETE /active`, `GET /pricing`
- [x] Welcome promo armed on subscribe (FR-10 — "first 5 with 50% off")

### 7. Owner monthly subscription
- [x] `OwnerSubscription` entity (TRIALING / ACTIVE / PAST_DUE / CANCELLED)
- [x] Repo, service (`startTrialOrRenew`, `cancel`, `markPastDue` daily job)
- [x] `OwnerSubscriptionController` — `GET / POST / DELETE` + `/pricing`
- [x] Listing visibility gate in `ParkingService.search` — toggled by `app.subscription.enforce-owner-listing-gate` (default off for dev)

### 8. Promo / offer engine
- [x] `Promotion` + `PromotionRedemption` entities (PERCENT_OFF / FREE_RESERVATION, validity window, global + per-user caps)
- [x] `PromotionService` — `resolve / apply / canDriverRedeem / recordRedemption`
- [x] `WelcomePromoService.armForDriver` — auto-creates per-driver welcome code (`WELCOME-<id>`) on subscription
- [x] `PromotionController` — driver self-service check + welcome-code lookup, admin CRUD
- [x] `SoftHoldRequest` extended with `promoCode`; `ReservationService.createSoftHold` applies it and records redemption

### 9. Promoted-listing billing
- [x] `PromotionPurchase` entity (tier + periodEnd + status)
- [x] `PromotedListingService` — purchase + daily expiry sweep (resets `Parking.promotionRank` to 0)
- [x] Wired into `OwnerController` — `POST /api/v1/owner/parkings/{id}/promotion`, `GET /api/v1/owner/promotions`

### 10. Variable commission rate
- [x] `CommissionRule` entity (zone / day-of-week / hour window, priority-ordered)
- [x] `CommissionService.rateFor(parking, time)` — falls back to `app.platform-commission-rate`
- [x] `ReservationService` now resolves the rate per reservation
- [x] `CommissionRuleController` admin CRUD under `/api/v1/admin/commission-rules`

---

## Phase 3 — Owner-facing extras — DONE

### 11. PDF export of owner sessions (FR-13)
- [x] OpenPDF dependency added to `pom.xml`
- [x] `SessionPdfExporter` renders header, anonymized session table, totals
- [x] Endpoint: `GET /api/v1/owner/sessions.pdf?from=&to=` (returns `application/pdf` as attachment)

### 12. Owner analytics / price-optimization tool
- [x] `AnalyticsService.priceSuggestionsFor(ownerId)` — 30-day rolling occupancy → directional price suggestion (±10%)
- [x] `GET /api/v1/owner/analytics/price-suggestions`
- [x] Gated behind active owner subscription — returns HTTP 402 (`error.subscription.required`) without one

---

## Phase 4 — External integrations — DONE (real adapter for Stripe + Twilio; PayBY/POK stubbed)

### 13. Twilio SMS adapter (FR-04 SMS, FR-05 SMS, NFR-04/05/09)
- [x] Twilio SDK dependency added to `pom.xml`
- [x] `SmsGateway` interface + `TwilioSmsGateway` (real, conditional on `twilio.account-sid`) + `LoggingSmsGateway` (default fallback)
- [x] `@EnableRetry` + `@Retryable(maxAttempts=3, backoff=5s)` satisfies NFR-09
- [x] `NotificationService.record` dispatches via `SmsGateway` for SMS channel, marks `DELIVERED` / `FAILED`

### 14. Phone-OTP registration (FR-09, NFR-05)
- [x] `PhoneOtpToken` entity (hashed OTP, attempts counter, used flag, TTL 5 min)
- [x] `PhoneAuthService.requestOtp / verifyOtp` — auto-creates a skeleton DRIVER user on first verify
- [x] `POST /api/v1/auth/phone/request-otp`, `POST /api/v1/auth/phone/verify` whitelisted in SecurityConfig
- [x] Lockout after 5 failed OTP attempts per code

### 15. Stripe adapter (FR-05 card)
- [x] Stripe SDK dependency added
- [x] `StripePaymentGateway` (conditional on `stripe.secret-key`) implements the `PaymentGateway` interface
- [x] `POST /api/v1/payments/intent?reservationId=&provider=STRIPE` mints a PaymentIntent and returns client secret
- [x] `POST /api/v1/payments/stripe/webhook` verifies signature, records the Payment, confirms the reservation (idempotent against duplicates)
- [x] Webhook permitAll'd in SecurityConfig

### 16. PayBY wallet adapter (FR-18)
- [x] `PayByPaymentGateway` stub (conditional on `payby.merchant-id`) implementing `PaymentGateway`
- [x] Provider enum typo fixed: `PAYBÝ` → `PAYBY`
- [ ] Real provider integration — pending PayBY API docs + sandbox credentials

### 17. POK wallet adapter (FR-18)
- [x] `PokPaymentGateway` stub (conditional on `pok.merchant-id`)
- [ ] Real provider integration — pending POK API docs + sandbox credentials

### 18. Camera-feed auto-ingest (FR-12 part 2)
- [x] `ParkingSensor` entity (parking, vendor, hashed API key, lastSeenAt)
- [x] `SensorService.register / reportAvailability` — owner registers sensor (raw key returned once), sensor reports via header auth
- [x] `POST /api/v1/sensors/availability` (header `X-Sensor-Key`) whitelisted in SecurityConfig
- [x] `POST /api/v1/owner/parkings/{id}/sensors` for owner registration
- [x] Per-sensor rate limit — minimum 5-second gap between reports per sensor; HTTP 429 (`error.sensor.rate_limited`) when exceeded

---

## Phase 5 — Hardening & ops — DOCS DONE, EXECUTION BELONGS TO OPS

### 19. HTTPS / TLS 1.2+ (NFR-10)
- [x] `DEPLOY.md` documents nginx termination + sample config + cert renewal cron
- [ ] Actually deploy reverse proxy + Let's Encrypt — ops task

### 20. Performance + load testing (NFR-01/02/06)
- [x] `RUNBOOK.md` includes a sample k6 script and target tuning notes
- [ ] Run k6 scripts against staging — needs staging env

### 21. Uptime monitoring (NFR-07)
- [x] `RUNBOOK.md` documents probe endpoints, alert thresholds
- [ ] Actually configure external pinger — ops task

### 22. PCI-DSS posture (NFR-11)
- [x] `COMPLIANCE.md` documents SAQ-A scope, card-data avoidance, annual audit checklist

### 23. Backup / restore runbook (NFR-08)
- [x] `RUNBOOK.md` includes nightly `pg_dump` script, PITR config, quarterly restore drill checklist

### 24. Structured audit logging (NFR-24 enhancement)
- [x] `logback-spring.xml` adds correlation ID + ISO timestamp to every log line
- [x] `CorrelationIdFilter` reads / generates `X-Correlation-Id` and stores in MDC
- [x] `AuditLog` bean writes auth + payment events to a separate rolling `audit.log` (365-day retention)
- [x] Wired `AuditLog.loginSuccess / loginFailure / accountLocked / accountAnonymized / payment` into `AuthService`, `UserService`, `PaymentService`

---

## Phase 6 — Frontend (separate projects, not in this repo)

These are explicit spec requirements but live outside the backend project. Listed here so nothing is lost.

### 25. Mobile app — Android 8.0+ / iOS 15.0+ (NFR-15)
- [ ] React Native or native (Kotlin + Swift)
- [ ] Driver flows: map, search, soft-hold, payment, timer, history, favorites, rating
- [ ] FR-01..FR-10, FR-14..FR-16, FR-18..FR-20

### 26. Owner web panel (NFR-16)
- [ ] React or Vue, must work in Safari/Chrome/Firefox without install
- [ ] Owner flows: parking CRUD, availability, hours, sessions, revenue chart, PDF download, sensor management
- [ ] FR-11..FR-13, FR-17

### 27. Color-coded map pins (FR-01 visual)
- [ ] Frontend uses `Parking.status` to render green / red / grey
- [ ] Real-time refresh via 60-s polling (matches NFR-03) OR add backend WebSocket later

### 28. UI string localization Albanian + English (NFR-18 visual)
- [ ] i18n library (i18next / react-intl)
- [ ] All strings translated; backend `messages_sq.properties` covers error responses

### 29. ≤3-tap critical-action UX (NFR-19, NFR-20)
- [ ] Information-architecture review of mobile app
- [ ] Onboarding completes in <3 minutes including registration

---

## Open questions / decisions needed

- [ ] Owner subscription pricing tiers — needed before billing job (item 7)
- [ ] Driver premium plan — what discount %? priority booking what does it mean? — needed before promo engine (item 6, 8)
- [ ] PayBY + POK — get sandbox credentials + API docs from providers (items 16, 17)
- [ ] Stripe account — production keys + webhook endpoint URL (item 15)
- [ ] Twilio account + Albanian sender ID (item 13)
- [ ] Camera vendor list + their data feed protocol (item 18)
- [ ] Hosting choice (AWS / GCP / Azure / Hetzner / on-prem) — affects items 19–23

---

## Suggested execution order

1. Phase 1 entirely — quick wins, no external dependencies (items 1–5)
2. Items 6, 7, 9, 10 — subscription + commission scaffolding (these unlock the business model)
3. Item 8 — promo engine (depends on 6)
4. Item 11 — PDF export (small, owner-visible)
5. Items 13, 14 — SMS + phone OTP (unlocks notifications properly)
6. Item 15 — Stripe (single biggest payment provider)
7. Items 16, 17 — PayBY + POK once you have docs
8. Items 18, 12, 24 — camera ingest, analytics, audit logging
9. Phase 5 — infra/ops, parallel with frontend work
10. Phase 6 — frontend in parallel from the start
