import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ipVan } from '../contact/spam';
import { moment, systeemPrompt } from './kennis';
import { regelAntwoord } from './regels';

/**
 * De chatbot op de website. Vragen gaan naar Claude met onze prijslijst en
 * werkwijze als achtergrond (zie kennis.ts). Zonder ANTHROPIC_API_KEY, of als
 * de AI even niet bereikbaar is, antwoorden we met de eenvoudige regels uit
 * regels.ts, zodat de chat altijd iets zinnigs zegt.
 */

const MODEL = 'claude-opus-5-5';

// Grenzen zodat niemand de chat kan misbruiken om op onze kosten te praten.
const MAX_BERICHTEN = 12;
const MAX_TEKENS = 800;
const VENSTER_MS = 10 * 60 * 1000;
const MAX_PER_VENSTER = 20;

const PAGINAS: Record<string, string> = {
  '/': 'de startpagina',
  '/schoenen': 'de pagina over schoenreiniging',
  '/motorkleding': 'de pagina over motorkleding',
  '/wassalon': 'de pagina over het zelfbedieningswassalon',
  '/zakelijk': 'de pagina voor zakelijke klanten',
  '/contact': 'de contactpagina',
};

type Bericht = { rol: 'klant' | 'bot'; tekst: string };

const vragen = new Map<string, number[]>();

function teVaak(ip: string, nu = Date.now()): boolean {
  const recent = (vragen.get(ip) || []).filter((t) => nu - t < VENSTER_MS);
  recent.push(nu);
  vragen.set(ip, recent);
  if (vragen.size > 1000) {
    for (const [k, v] of vragen) {
      if (v.every((t) => nu - t >= VENSTER_MS)) vragen.delete(k);
    }
  }
  return recent.length > MAX_PER_VENSTER;
}

/** Zet de geschiedenis uit de browser om naar berichten voor Claude. */
function naarBerichten(invoer: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (!Array.isArray(invoer) || invoer.length === 0) return null;
  const berichten: Anthropic.Beta.BetaMessageParam[] = [];
  for (const b of invoer.slice(-MAX_BERICHTEN) as Bericht[]) {
    if (!b || (b.rol !== 'klant' && b.rol !== 'bot') || typeof b.tekst !== 'string') return null;
    const tekst = b.tekst.trim().slice(0, MAX_TEKENS);
    if (!tekst) continue;
    berichten.push({ role: b.rol === 'klant' ? 'user' : 'assistant', content: tekst });
  }
  // Het gesprek moet met de klant beginnen en eindigen.
  while (berichten.length && berichten[0].role !== 'user') berichten.shift();
  if (!berichten.length || berichten[berichten.length - 1].role !== 'user') return null;
  return berichten;
}

function hostVan(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function antwoord(tekst: string, bron: 'ai' | 'regels') {
  return NextResponse.json({ antwoord: tekst, bron });
}

export async function POST(request: NextRequest) {
  // Enkel vanaf onze eigen pagina's, niet vanaf andere websites.
  const herkomst = request.headers.get('origin');
  if (herkomst && hostVan(herkomst) !== request.headers.get('host')) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 403 });
  }

  let body: { berichten?: unknown; pagina?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 });
  }

  const berichten = naarBerichten(body.berichten);
  if (!berichten) {
    return NextResponse.json({ error: 'Ongeldig gesprek' }, { status: 400 });
  }
  const laatsteVraag = berichten[berichten.length - 1].content as string;

  if (teVaak(ipVan(request.headers))) {
    return NextResponse.json(
      { error: 'U stelde heel wat vragen na elkaar. Probeer het over enkele minuten opnieuw, of bel ons op 0494 40 38 41.' },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return antwoord(regelAntwoord(laatsteVraag), 'regels');
  }

  const nu = new Date();
  const pagina = typeof body.pagina === 'string' ? PAGINAS[body.pagina.replace(/\.html$/, '')] : undefined;
  const context = moment(nu) + (pagina ? ` De bezoeker zit op ${pagina}.` : '');

  try {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: systeemPrompt(nu), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: context },
      ],
      messages: berichten,
    });

    const tekst = res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();

    if (res.stop_reason === 'refusal' || !tekst) {
      return antwoord(regelAntwoord(laatsteVraag), 'regels');
    }
    return antwoord(tekst, 'ai');
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Chat: fout van Claude', error.status, error.message);
    } else {
      console.error('Chat: onverwachte fout', error);
    }
    return antwoord(regelAntwoord(laatsteVraag), 'regels');
  }
}
