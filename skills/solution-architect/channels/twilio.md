# Channel: SMS via Twilio

## Setup

```bash
npm install twilio
```

Get your Account SID, Auth Token, and a Twilio phone number from https://console.twilio.com.

Set environment variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` — your Twilio sender number (e.g., `+15551234567`)

## Send a Single SMS

```typescript
import twilio from 'twilio';

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
);

async function sendSMS(to: string, body: string) {
    const message = await twilioClient.messages.create({
        to,                                        // e.g., '+15559876543'
        from: process.env.TWILIO_PHONE_NUMBER!,
        body,                                      // max 1600 chars (concatenated)
    });
    console.log(`SMS sent: ${message.sid}`);
    return message.sid;
}
```

## Format for SMS

SMS should be concise. Truncate AI-generated content:

```typescript
function formatForSMS(content: string, maxLength: number = 160): string {
    // Strip markdown formatting
    const plain = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n+/g, ' ')
        .trim();

    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength - 3) + '...';
}
```

## Generate SMS-Appropriate Content

When using the AI to generate SMS content, add constraints in the instruction:

```typescript
const result = await client.ai.prompt({
    context: assembledContext,
    instructions: [
        {
            prompt: 'Write an SMS message for this contact. Rules: (1) Under 160 characters. (2) One clear action or piece of information. (3) Include a short link or next step. (4) No greetings or sign-offs — get straight to the point.',
            maxSteps: 3,
        },
    ],
});

const sms = formatForSMS(String(result.data));
await sendSMS(contact.phone, sms);
```

## Send Batch SMS

Twilio rate limits vary by number type:
- Long code: 1 message/second
- Toll-free: 3 messages/second
- Short code: 30 messages/second

```typescript
async function sendBatchSMS(messages: Array<{ to: string; body: string }>) {
    for (const msg of messages) {
        try {
            await sendSMS(msg.to, msg.body);
        } catch (err: any) {
            console.error(`Failed to send to ${msg.to}:`, err.message);
        }
        // Respect rate limits — 1 msg/sec for long codes
        await new Promise(r => setTimeout(r, 1100));
    }
}
```

## WhatsApp via Twilio

Same API, different `from` format:

```typescript
async function sendWhatsApp(to: string, body: string) {
    const message = await twilioClient.messages.create({
        to: `whatsapp:${to}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        body,
    });
    console.log(`WhatsApp sent: ${message.sid}`);
}
```

Requires a Twilio WhatsApp sender (sandbox for testing, approved number for production).

## Phone Number Formatting

Twilio requires E.164 format (`+[country code][number]`):

```typescript
function toE164(phone: string, defaultCountryCode: string = '1'): string | null {
    // Strip non-digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return null;

    // Already has country code (11+ digits starting with country code)
    if (digits.length >= 11) return '+' + digits;
    // US/CA 10-digit
    if (digits.length === 10) return '+' + defaultCountryCode + digits;

    return null; // invalid
}
```

## Cost

- US SMS: ~$0.0079 per message
- International: varies by country
- Check pricing at https://www.twilio.com/sms/pricing
