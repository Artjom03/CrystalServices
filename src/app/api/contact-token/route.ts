import { NextResponse } from 'next/server';
import { maakToken } from '../contact/spam';

/**
 * Geeft een kortlevend, ondertekend token uit dat het contactformulier
 * meestuurt. Een bot die rechtstreeks naar /api/contact post zonder eerst hier
 * langs te komen, wordt geweigerd.
 */
export async function GET() {
  return NextResponse.json(
    { token: maakToken() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
