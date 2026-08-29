/**
 * WhatsApp Business API integration service.
 * Supports WhatsApp Cloud API (Meta) and Twilio.
 * Set WHATSAPP_PROVIDER=meta|twilio in .env to choose.
 * Falls back to console logging when no provider is configured.
 */

const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'log';
const META_API_VERSION = 'v18.0';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

function formatPhone(phone) {
  // Strip non-digits, ensure international format
  return phone.replace(/\D/g, '');
}

async function sendViaMeta(to, body) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: formatPhone(to),
      type: 'text',
      text: { body },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`WhatsApp Meta API error: ${err}`);
  }
  return response.json();
}

async function sendViaTwilio(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams({
    From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
    To: `whatsapp:${formatPhone(to)}`,
    Body: body,
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`WhatsApp Twilio API error: ${err}`);
  }
  return response.json();
}

async function sendLog(to, body) {
  console.log(`[WhatsApp Log] To: ${to} | Body: ${body}`);
  return { status: 'logged', to, body };
}

export async function sendWhatsApp(to, body) {
  if (!to) throw new Error('Phone number is required');
  switch (WHATSAPP_PROVIDER) {
    case 'meta':
      return sendViaMeta(to, body);
    case 'twilio':
      return sendViaTwilio(to, body);
    default:
      return sendLog(to, body);
  }
}

export async function sendOrderNotification(phone, orderNumber, status) {
  const body = `📦 Order #${orderNumber} update: ${status}. Track your order on the B2B Marketplace.`;
  return sendWhatsApp(phone, body);
}

export async function sendShippingUpdate(phone, orderNumber, carrier, trackingNumber) {
  const body = `🚚 Order #${orderNumber} has been shipped via ${carrier}. Tracking: ${trackingNumber || 'N/A'}`;
  return sendWhatsApp(phone, body);
}

export async function sendNewMessageAlert(phone, senderName) {
  const body = `💬 New message from ${senderName} on B2B Marketplace. Check your inbox.`;
  return sendWhatsApp(phone, body);
}

export async function sendRfqNotification(phone, rfqTitle) {
  const body = `📋 New RFQ: "${rfqTitle}" posted on B2B Marketplace. Submit your response.`;
  return sendWhatsApp(phone, body);
}
