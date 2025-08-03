import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service niet geconfigureerd' },
        { status: 500 }
      );
    }

    console.log('Sending email with Resend:', {
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      apiKey: process.env.RESEND_API_KEY ? 'Configured' : 'Missing'
    });

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `Crystal Services <${process.env.FROM_EMAIL}>`,
      to: [process.env.TO_EMAIL!],
      replyTo: email,
      subject: `Nieuw contactbericht van ${name}`,
      html: `
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
      `,
      text: `
Nieuw contactbericht van Crystal Services website

Contactgegevens:
Naam: ${name}
Email: ${email}
${phone ? `Telefoon: ${phone}` : ''}

Bericht:
${message}

---
Dit bericht is verzonden via het contactformulier op crystal-services.be
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Er is een fout opgetreden bij het verzenden van het bericht' },
        { status: 500 }
      );
    }

    console.log('Email sent successfully via Resend:', data);
    return NextResponse.json(
      { message: 'Bericht succesvol verzonden' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending email via Resend:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het verzenden van het bericht' },
      { status: 500 }
    );
  }
}
