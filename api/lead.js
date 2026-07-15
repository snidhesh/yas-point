/**
 * POST /api/lead
 * Receives form submissions from the "Register your interest" form and forwards
 * them to the BlackOak RE CRM intake endpoint.
 *
 * Runs as a Vercel serverless function. Same pattern as the bashayer landing.
 *
 * Env vars:
 *   CRM_TOKEN  — REQUIRED. Bearer token for the CRM intake API.
 *   CRM_URL    — OPTIONAL. Full URL of the CRM intake endpoint.
 *                Defaults to the BlackOak production intake URL.
 *   CRM_SOURCE — OPTIONAL. Source tag written into the lead so CRM can filter
 *                by landing page. Defaults to 'yaspoint-landing'.
 *
 * Expected request body (JSON):
 *   { firstName, lastName, email, phone, city, unitType, consent? }
 * or the already-combined shape:
 *   { name, email, phone, city, unitType }
 */
const DEFAULT_CRM_URL = 'https://studio.blackoak-re.com/api/v1/public/intake/leads';
const DEFAULT_SOURCE  = 'yaspoint-landing';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token  = process.env.CRM_TOKEN;
  const crmUrl = process.env.CRM_URL    || DEFAULT_CRM_URL;
  const source = process.env.CRM_SOURCE || DEFAULT_SOURCE;

  if (!token) {
    console.error('CRM_TOKEN env var is not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const { firstName, lastName, name, email, phone, city, unitType } = req.body || {};

  const fullName =
    (name && String(name).trim()) ||
    [firstName, lastName].filter(Boolean).map((s) => String(s).trim()).join(' ').trim();

  if (!fullName || !phone || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const requirements = [
    unitType && `Interested in: ${unitType}`,
    city     && `City: ${city}`,
  ].filter(Boolean).join(' | ');

  try {
    const resp = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fullName,
        phone,
        email,
        requirements,
        source,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('CRM error', resp.status, text);
      return res.status(502).json({ error: 'CRM rejected the lead' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('CRM fetch failed', err);
    return res.status(502).json({ error: 'CRM unreachable' });
  }
};
