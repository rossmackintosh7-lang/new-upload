import { json } from '../../_lib/json.js';

const COUNTRY_CURRENCY = {
  GB: 'GBP',
  GG: 'GBP',
  IM: 'GBP',
  JE: 'GBP',
  IE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD'
};

export async function onRequestGet({ request }) {
  const country = String(request.cf?.country || request.headers.get('CF-IPCountry') || 'GB').toUpperCase();
  const currency = COUNTRY_CURRENCY[country] || 'GBP';
  return json({ ok: true, country, currency, symbol: currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$' });
}
