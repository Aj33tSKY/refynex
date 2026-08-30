export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ ok: false, error: 'Email is not configured yet' });
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Refyne Labs <hello@refynelabs.co.uk>',
        to: ['ajeet@refynelabs.co.uk'],
        reply_to: email,
        subject: `New project inquiry from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('Resend API error:', resendRes.status, detail);
      return res.status(502).json({ ok: false, error: 'Failed to send email' });
    }

    // Best-effort confirmation to the visitor — don't fail the request if this errors.
    try {
      const confirmRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Refyne Labs <hello@refynelabs.co.uk>',
          to: [email],
          reply_to: 'ajeet@refynelabs.co.uk',
          subject: "We've received your message — Refyne Labs",
          text: `Hi ${name},\n\nThanks for reaching out to Refyne Labs. We've received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\n— Refyne Labs`,
        }),
      });
      if (!confirmRes.ok) {
        console.error('Confirmation email failed:', confirmRes.status, await confirmRes.text());
      }
    } catch (err) {
      console.error('Confirmation email send failed:', err);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form send failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
}
