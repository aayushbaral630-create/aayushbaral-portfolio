const { google } = require('googleapis');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, email, phone, service, message, _honey } = req.body;

    // Honeypot check
    if (_honey) {
      return res.status(200).json({ message: 'Success' });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    const date = new Date().toISOString();

    // 1. Google Sheets Setup
    const sheetId = process.env.GOOGLE_SHEET_ID ? process.env.GOOGLE_SHEET_ID.replace(/[\s,"]/g, '') : null;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL ? process.env.GOOGLE_CLIENT_EMAIL.replace(/[\s,"]/g, '') : null;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    
    // Clean up private key formatting issues
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/",$/, '').replace(/^"|"$/g, '');

    if (sheetId && clientEmail && privateKey) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'Sheet1!A:F', // Adjust if your sheet name is different
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[date, name, email, phone || 'N/A', service || 'N/A', message]],
          },
        });
        console.log('Appended to Google Sheets successfully.');
      } catch (sheetError) {
        console.error('Google Sheets Error:', sheetError);
        // Continue even if Sheets fail so email still sends
      }
    } else {
      console.warn('Google Sheets credentials missing or incomplete.');
    }

    // 2. Nodemailer Email Setup
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s/g, ''), // remove spaces from app password
        },
      });

      // Notification Email to You
      const notificationMail = {
        from: `"Portfolio Contact" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: `New Lead: ${name} - ${service}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Inquiry Received</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #C9A84C;">
              ${message.replace(/\n/g, '<br>')}
            </blockquote>
          </div>
        `,
      };

      // Auto-responder to Client
      const autoResponderMail = {
        from: `"Aayush Baral" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Thank you for your inquiry, ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
            <p>Hi ${name},</p>
            <p>Thank you for reaching out! I have received your inquiry regarding <strong>${service || 'my services'}</strong>.</p>
            <p>I typically review and respond to all inquiries within 24-48 hours. I'll get back to you shortly with the next steps.</p>
            <p>If you have any immediate questions, feel free to reply directly to this email or reach out on WhatsApp.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>Aayush Baral</strong></p>
          </div>
        `,
      };

      await transporter.sendMail(notificationMail);
      await transporter.sendMail(autoResponderMail);
    }

    return res.status(200).json({ message: 'Inquiry processed successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Failed to process inquiry', error: error.message });
  }
}
