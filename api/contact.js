const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, email, service, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
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
  });

  try {
    // Send email
    await transporter.sendMail({
      from: `"${name}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`, // sender address
      replyTo: email,
      to: process.env.SMTP_TO || process.env.SMTP_USER, // recipient (you)
      subject: `New Portfolio Enquiry: ${service}`, // Subject line
      text: `Name: ${name}\nEmail: ${email}\nService: ${service}\nMessage: ${message}`, // plain text body
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1B2B5E;">New Enquiry from Portfolio Website</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Service Requested:</strong> ${service}</p>
          <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #C9A84C;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">Reply directly to this email to respond to ${name}.</p>
        </div>
      `, // html body
    });

    return res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('SMTP Error:', error);
    return res.status(500).json({ message: 'Failed to send email. Check SMTP settings.', error: error.message });
  }
}
