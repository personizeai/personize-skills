# Compliance Guidelines

**Description:** Data handling, opt-out rules, and audit requirements for all AI operations.

**Tags:** `compliance`, `privacy`, `legal`

---

## Opt-Out Handling
MUST honor opt-out requests immediately -- because CAN-SPAM and GDPR require it.
MUST NOT contact opted-out individuals under any circumstance.
MUST log opt-out with timestamp and source.

## Data Handling
MUST NOT store sensitive PII (SSN, credit card) in memory properties.
SHOULD anonymize data in logs and session transcripts.
MUST tag all data with source attribution (source:crm, source:manual).

## Email Compliance
MUST include unsubscribe link in every marketing email.
MUST include sender physical address.
MUST NOT use deceptive subject lines.

## Audit Trail
SHOULD log all bulk operations with affected record count.
MUST preserve deletion audit records for 90 days.
