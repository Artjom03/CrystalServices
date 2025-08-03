import { NextRequest, NextResponse } from 'next/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Naam, email en bericht zijn verplicht' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ongeldig email adres' },
        { status: 400 }
      );
    }

    const sentFrom = new Sender(process.env.MAILERSEND_FROM_EMAIL!, "Crystal Services");
    const recipients = [new Recipient(process.env.MAILERSEND_TO_EMAIL!, "Crystal Services")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(new Sender(email, name))
      .setSubject(`Nieuw contactbericht van ${name}`)
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e40af; margin: 0; font-size: 24px;">Crystal Services</h1>
              <p style="color: #64748b; margin: 5px 0;">Nieuw contactbericht</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-bottom: 10px;">Contactgegevens:</h3>
              <p style="margin: 5px 0;"><strong>Naam:</strong> ${name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              ${phone ? `<p style="margin: 5px 0;"><strong>Telefoon:</strong> ${phone}</p>` : ''}
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #1e40af; margin-bottom: 10px;">Bericht:</h3>
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; border-left: 4px solid #1e40af;">
                <p style="margin: 0; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Dit bericht is verzonden via het contactformulier op crystal-services.be
              </p>
            </div>
          </div>
        </div>
      `)
      .setText(`
Nieuw contactbericht van Crystal Services website

Contactgegevens:
Naam: ${name}
Email: ${email}
${phone ? `Telefoon: ${phone}` : ''}

Bericht:
${message}

---
Dit bericht is verzonden via het contactformulier op crystal-services.be
      `);

    await mailerSend.email.send(emailParams);

    return NextResponse.json(
      { message: 'Bericht succesvol verzonden' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het verzenden van het bericht' },
      { status: 500 }
    );
  }
}
