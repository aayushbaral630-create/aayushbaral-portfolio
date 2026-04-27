const nodemailer = require('nodemailer');

// Helper function to sanitize input and prevent XSS
const sanitizeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(match) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
};

export default async function handler(req, res) {
  // 1. CORS Headers: Only allow from your domains
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Vercel handles domain restrictions in vercel.json usually, but we allow basic CORS for fetch API
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, email, service, message, _honey } = req.body;

  // 2. Honeypot Validation (Bot Prevention)
  if (_honey) {
    // If the honeypot field is filled out, silently reject it (pretend it succeeded to fool the bot)
    console.log('Bot detected via honeypot field.');
    return res.status(200).json({ message: 'Email sent successfully!' });
  }

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 3. Input Sanitization
  const safeName = sanitizeHTML(name);
  const safeEmail = sanitizeHTML(email);
  const safeService = sanitizeHTML(service);
  const safeMessage = sanitizeHTML(message);

  // Diagnostic Check: Ensure Environment Variables exist on Vercel
  if (!process.env.SMTP_HOST) {
    return res.status(500).json({ 
      message: "Vercel Environment Variables are NOT loaded.", 
      error: "process.env.SMTP_HOST is empty. You must add the variables in Vercel Settings and Redeploy." 
    });
  }

  // Create transporter using SMTP credentials from Environment Variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Fixes SSL errors with cPanel/custom domain emails
    }
  });

  try {
    // Send email
    await transporter.sendMail({
      from: `"${safeName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`, // sender address
      replyTo: safeEmail,
      to: process.env.SMTP_TO || process.env.SMTP_USER, // recipient (you)
      subject: `New Portfolio Enquiry: ${safeService}`, // Subject line
      text: `Name: ${safeName}\nEmail: ${safeEmail}\nService: ${safeService}\nMessage: ${safeMessage}`, // plain text body
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1B2B5E;">New Enquiry from Portfolio Website</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p><strong>Service Requested:</strong> ${safeService}</p>
          <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #C9A84C;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">Reply directly to this email to respond to ${safeName}.</p>
        </div>
      `, // html body
    });

    return res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('SMTP Error:', error);
    return res.status(500).json({ message: 'Failed to send email. Check SMTP settings.', error: error.message });
  }
}
