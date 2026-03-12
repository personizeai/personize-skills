# Webhook Destinations

Webhooks are the primary way to receive results and events from Personize. When an agent execution completes, a memorization finishes, or any subscribed event fires, Personize delivers the payload directly to your HTTPS endpoint — your app's API, a CRM writeback endpoint, Zapier, Make, n8n, or any system that accepts HTTP requests.

Delivery is handled by a dedicated infrastructure (SQS + Lambda), so your results arrive reliably even under load. Events are logged for 30 days.

---

## Creating a Webhook

Go to **Integrations > Destinations** in the Personize dashboard and click **+ Add Destination**.

Fill in:

| Field | Description |
|-------|-------------|
| **Name** | A label for this destination (e.g. "Production Webhook") |
| **Endpoint URL** | The HTTPS URL that will receive events |
| **HTTP Method** | POST (default) or PUT |
| **Custom Headers** | Optional headers sent with every delivery (e.g. `Authorization: Bearer ...`) |
| **Subscribed Events** | Which events trigger delivery to this endpoint |

A **signing secret** is generated automatically when you create the destination. Save it immediately — it is shown only once. You'll use it to verify that incoming requests are genuinely from Personize.

Under **Advanced Settings** you can configure retry behavior.

---

## Subscribable Events

| Event | Description |
|-------|-------------|
| **Execution Completed** `execution.completed` | An agent execution finishes successfully |
| **Execution Failed** `execution.failed` | An agent execution fails |
| **Memorization Completed** `memorization.completed` | A memorize operation completes |
| **Test Event** `destination.test` | Fired manually via the Test button |

Select any combination when creating or editing a destination.

---

## What Your Endpoint Receives

Every delivery is an HTTPS POST (or PUT) to your endpoint URL.

### Body

The HTTP body is the **event payload** — the actual result data as a JSON object. For example, an `execution.completed` event might deliver:

```json
{
    "runId": "run-abc",
    "status": "completed",
    "agentId": "agent-1",
    "result": { ... }
}
```

The exact shape depends on the event type and what produced it.

### Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Personize-Signature` | HMAC-SHA256 hex digest of the raw body (if signing secret is set) |
| `X-Personize-Signature-Alg` | `HMAC-SHA256` |

Plus any custom headers you configured on the destination.

**Important:** Your endpoint should respond with a 2xx status quickly. Personize does not wait long for a response (~1.5 seconds), so do any heavy processing asynchronously after responding.

---

## Verifying Signatures

Every delivery is signed with the signing secret from creation. Verify the `X-Personize-Signature` header to confirm the request came from Personize.

### Node.js (Express)

```typescript
import crypto from 'crypto';
import express from 'express';

const SIGNING_SECRET = process.env.PERSONIZE_WEBHOOK_SECRET!;

function verifySignature(rawBody: string, secret: string, signatureHeader: string): boolean {
    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'hex'),
        Buffer.from(expected, 'hex'),
    );
}

// Middleware: capture raw body for signature verification
app.use('/webhooks/personize', express.raw({ type: 'application/json' }), (req, res, next) => {
    (req as any).rawBody = req.body.toString('utf8');
    try { req.body = JSON.parse((req as any).rawBody); } catch { req.body = {}; }
    next();
});

app.post('/webhooks/personize', (req, res) => {
    const sig = req.headers['x-personize-signature'] as string;
    const alg = req.headers['x-personize-signature-alg'] as string;

    if (!sig || alg !== 'HMAC-SHA256' || !verifySignature((req as any).rawBody, SIGNING_SECRET, sig)) {
        return res.status(401).send('Invalid signature');
    }

    const payload = req.body;
    // handle the payload...

    res.json({ received: true });
});
```

### Python (Flask)

```python
import hmac, hashlib, os
from flask import Flask, request

app = Flask(__name__)

def verify_signature(body_bytes: bytes, signature: str, secret: str) -> bool:
    if not signature:
        return False
    expected = hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route("/webhooks/personize", methods=["POST"])
def webhook():
    body = request.get_data()
    sig = request.headers.get("X-Personize-Signature", "")
    if not verify_signature(body, sig, os.environ["PERSONIZE_WEBHOOK_SECRET"]):
        return "", 401
    payload = request.get_json()
    # handle the payload...
    return {"received": True}
```

---

## Managing Destinations

All management happens through the Personize dashboard at **Integrations > Destinations**:

- **Edit** a destination to change its URL, headers, subscribed events, or retry settings
- **Deactivate** a destination to pause delivery (reactivate anytime)
- **Delete** to remove it
- **Test** to send a sample `destination.test` event and confirm your endpoint is reachable
- **View Logs** to see delivery history — status, HTTP response code, latency, and errors. Logs are kept for 30 days.

---

## Common Patterns

### Forward to Zapier / Make / n8n

Create a destination with the webhook URL from your automation platform. The JSON payload arrives ready to route — no transformation needed.

### CRM Writeback

Your endpoint receives execution results and writes them back to your CRM:

```typescript
app.post('/webhooks/personize', async (req, res) => {
    const payload = req.body;

    if (payload.status === 'completed' && payload.result) {
        await hubspotClient.crm.contacts.basicApi.update(payload.contactId, {
            properties: { last_ai_insight: payload.result.summary },
        });
    }

    res.json({ ok: true });
});
```

### In-App Notifications

```typescript
app.post('/webhooks/personize', async (req, res) => {
    const payload = req.body;

    await notificationService.send({
        userId: payload.userId,
        title: 'Processing complete',
        body: `${payload.recordCount} records processed`,
    });

    res.json({ ok: true });
});
```

---

## Receiver Checklist

- [ ] Accept POST (or PUT if configured) with `Content-Type: application/json`
- [ ] Capture the **raw body** before JSON parsing (needed for signature verification)
- [ ] Verify `X-Personize-Signature` using HMAC-SHA256 with constant-time comparison
- [ ] Respond with 2xx quickly — Personize waits ~1.5 seconds before moving on
- [ ] Do heavy processing asynchronously after responding

---

## Limits

| Constraint | Value |
|------------|-------|
| Destinations per organization | 25 |
| Webhook URL protocol | HTTPS only |
| Events per destination | 20 |
| Delivery log retention | 30 days |
| Max retries | 10 |
