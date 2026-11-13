import { timingSafeEqual, createHash } from 'node:crypto';

const sha = s => createHash('sha256').update(String(s)).digest();
export const beheerWachtwoord = () => Netlify.env.get('BEHEER_WACHTWOORD') || '';

/** Wachtwoord uit de header vergelijken zonder tijdslek. */
export function isBeheerder(req) {
  const secret = beheerWachtwoord();
  if (secret.length < 8) return false;
  return timingSafeEqual(sha(req.headers.get('x-beheer-wachtwoord') || ''), sha(secret));
}

/** Aparte sleutel voor het agenda-abonnement: verraadt het wachtwoord niet. */
export function feedSleutel() {
  const secret = beheerWachtwoord();
  return secret.length < 8 ? '' : sha('agenda-feed:' + secret).toString('hex').slice(0, 32);
}

export function isGeldigeFeedSleutel(given) {
  const key = feedSleutel();
  return !!key && timingSafeEqual(sha(given || ''), sha(key));
}
