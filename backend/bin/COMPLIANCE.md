# Compliance Notes

## NFR-11 — PCI-DSS

KeVend never handles raw card data. Strategy:

1. **Frontend captures the card** via Stripe Elements / PayBY-hosted form / POK-hosted form. The card touches the provider's iframe directly, never our servers.
2. **Backend only ever sees provider IDs** — `payment_intent_id`, `intent_client_secret`, `transaction_reference`. None of these are PAN/CVV/expiry.
3. **Webhook secrets** are configured per-environment and verified before any state change.

This puts us in **SAQ-A** scope (the smallest PCI questionnaire — for merchants who fully outsource card handling). Annual self-assessment is required; no QSA audit needed at our scale.

### What to audit annually

- Confirm no log line includes anything matching `\d{13,19}` outside provider IDs.
- Confirm `application.properties` contains zero card-related fields.
- Confirm Stripe / PayBY / POK dashboards still show our integration as Elements / hosted-form based.

## NFR-12 — GDPR

- **Right to erasure** is implemented via `DELETE /api/v1/users/me`. We anonymize rather than hard-delete so reservations / payments stay intact for owner accounting (NFR-22).
- **Anonymization wipes** name, surname, phone; rewrites email to `deleted-{id}@anon.kevend.local`; clears password hash; sets `anonymized=true`.
- **Data retention** is enforced by `RetentionService`:
  - Reservations + payments + reviews + notifications: 24 months (NFR-21)
  - Notifications independent: 6 months (operational data)
  - Tokens: deleted on expiry
- **Driver IDs in owner views are anonymous tokens** (NFR-14).
- **Logs** carry user IDs but no PII. Audit log captures email on login events — review whether to hash this for stricter GDPR posture.
- **Subject access requests**: implement a CSV export of all rows referencing a given user ID (TODO).

## NFR-14 — Anonymous driver IDs

Implemented via `OwnerSessionView.anonymize(driverId)`. The token is `drv-<hex>` derived from the driver ID. It's stable for the same driver so an owner can recognise repeat customers without identifying them, but unlinkable from KeVend's user database without service access.

For stricter unlinkability across owners, swap the implementation to HMAC with a per-owner key.
