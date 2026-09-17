import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { keurToken, keurInhoud, teLang, teVaak, ipVan } from './spam';

// Waar contactberichten naartoe gaan. De env-variabelen mogen dit overschrijven,
// maar zonder die instelling komt de mail nog steeds op het juiste adres aan.
const TO_EMAIL = process.env.TO_EMAIL || 'info@crystal-services.be';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@crystal-services.be';

// Bots krijgen hetzelfde antwoord als een geslaagde verzending. Zo merken ze
// niet dat ze tegengehouden worden en gaan ze niet op zoek naar een omweg.
// Let op: dit moet een functie zijn. Eén gedeeld Response-object werkt niet,
// want de body daarvan kan maar één keer uitgelezen worden.
const doenAlsofOk = () =>
  NextResponse.json({ message: 'Bericht succesvol verzonden' }, { status: 200 });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    // --- Spambescherming ---------------------------------------------------
    // 1. Honeypot: een veld dat onzichtbaar is voor bezoekers. Alleen bots
    //    vullen het in.
    if (typeof body.bedrijfsnaam === 'string' && body.bedrijfsnaam.trim() !== '') {
      console.warn('Spam geweigerd: honeypot ingevuld', { ip: ipVan(request.headers) });
      return doenAlsofOk();
    }

    // 2. Token: wordt door /api/contact-token uitgegeven wanneer de pagina
    //    laadt. Ontbreekt het, is het verzonnen, of kwam het binnen minder dan
    //    drie seconden terug, dan is dit geen mens.
    const oordeel = keurToken(body.token);
    if (oordeel !== 'ok') {
      console.warn('Spam geweigerd: token', oordeel, { ip: ipVan(request.headers) });
      // Bij 'te-snel' en 'verlopen' kan het ook om een echte bezoeker gaan —
      // iemand die autofill gebruikt, of het formulier lang liet openstaan.
      // Die krijgt een duidelijke melding zodat hij opnieuw kan proberen; bij
      // een tweede poging is er genoeg tijd verstreken. Alleen bij een
      // ontbrekend of vervalst token doen we alsof het gelukt is, want daar is
      // geen enkele legitieme verklaring voor.
      if (oordeel === 'te-snel') {
        return NextResponse.json(
          { error: 'Uw bericht kwam wel erg snel binnen. Klik nog eens op versturen.' },
          { status: 400 }
        );
      }
      if (oordeel === 'verlopen') {
        return NextResponse.json(
          { error: 'Uw sessie is verlopen. Herlaad de pagina en probeer opnieuw.' },
          { status: 400 }
        );
      }
      return doenAlsofOk();
    }

    // 3. Niet meer dan een paar berichten per IP binnen tien minuten.
    if (teVaak(ipVan(request.headers))) {
      return NextResponse.json(
        { error: 'U hebt net al een bericht verstuurd. Probeer het over enkele minuten opnieuw.' },
        { status: 429 }
      );
    }
    // -----------------------------------------------------------------------

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

    // 4. Veldlengtes begrenzen.
    const telang = teLang({ name, email, phone, message });
    if (telang) {
      return NextResponse.json(
        { error: `Uw ${telang} is te lang.` },
        { status: 400 }
      );
    }

    // 5. Inhoud met links of bekende spamtermen tegenhouden.
    const inhoud = keurInhoud({ name, email, phone, message });
    if (inhoud.spam) {
      console.warn('Spam geweigerd:', inhoud.reden, { ip: ipVan(request.headers) });
      return doenAlsofOk();
    }


    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service niet geconfigureerd' },
        { status: 500 }
      );
    }

    // Check all environment variables
    console.log('Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasFromEmail: !!process.env.FROM_EMAIL,
      hasToEmail: !!process.env.TO_EMAIL,
      fromEmail: FROM_EMAIL,
      toEmail: TO_EMAIL
    });

    console.log('Sending email with Resend:', {
      from: FROM_EMAIL,
      to: TO_EMAIL,
      apiKey: process.env.RESEND_API_KEY ? 'Configured' : 'Missing'
    });

    // Send email using Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: `Crystal Services <${FROM_EMAIL}>`,
      to: [TO_EMAIL],
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
