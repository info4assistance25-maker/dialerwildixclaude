/**
 * Wildix WMS API — client lato server
 *
 * Usa solo fetch nativo — nessuna dipendenza esterna.
 *
 * Flusso outbound con voicebot su 2323:
 *  1. makeCall()           → POST /Originate/Call/ → PBX chiama 777 (Collaboration)
 *  2. 777 risponde         → PBX chiama il numero esterno
 *  3. getActiveCalls()     → lista chiamate attive → trova channelId
 *  4. transferToVoicebot() → BlindTransfer REST a 2323
 */

const PBX_HOST     = process.env.WILDIX_PBX_HOST          ?? 'gem.wildixin.com';
const API_KEY      = process.env.WILDIX_API_KEY            ?? 'access_DOIhBCRY9wWpBgMl0yf4JUNS4orIeJeE9MIcBnfhoC3tdegD1Hi2dh7sJbVcoiM0';
const VOICEBOT_EXT = process.env.WILDIX_VOICEBOT_EXTENSION ?? '2323';

function authHeader() {
  return { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' };
}

function apiUrl(path: string) {
  return `https://${PBX_HOST}/api/v1${path}`;
}

// ─── Origina chiamata outbound ────────────────────────────────
export async function makeCall(params: {
  callee:    string;
  caller?:   string;
  callerId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ callId: string }> {
  console.log('[wildix] makeCall ->', params.callee);

  const res = await fetch(apiUrl('/Originate/Call/'), {
    method:  'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: params.callee,
      name:   params.metadata?.contactName ?? 'VoiceBot',
    }),
  });

  const text = await res.text();
  console.log('[wildix] Originate/Call:', res.status, text);

  if (!res.ok) throw new Error(`makeCall failed [${res.status}]: ${text}`);

  let data: any = {};
  try { data = JSON.parse(text); } catch {}

  const callId = data?.result?.id ?? data?.id ?? data?.callId ?? `wms_${Date.now()}`;
  console.log('[wildix] callId:', callId);
  return { callId };
}

// ─── Lista chiamate attive dell'utente ────────────────────────
export async function getActiveCalls(): Promise<any[]> {
  try {
    const res = await fetch(apiUrl('/calls'), {
      headers: authHeader(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    console.log('[wildix] activeCalls:', JSON.stringify(data));
    return data?.result ?? data?.calls ?? data ?? [];
  } catch (e) {
    console.warn('[wildix] getActiveCalls error:', e);
    return [];
  }
}

// ─── Trasferisci al voicebot 2323 ────────────────────────────
// channelId = ID canale attivo dalla chiamata in corso
export async function transferToVoicebot(channelId: string): Promise<void> {
  console.log('[wildix] transferToVoicebot', channelId, '→', VOICEBOT_EXT);

  // Prova 1: endpoint BlindTransfer WMS
  const res1 = await fetch(apiUrl(`/calls/${channelId}/blind-transfer`), {
    method:  'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: VOICEBOT_EXT, context: 'users' }),
  });
  const text1 = await res1.text();
  console.log('[wildix] blind-transfer:', res1.status, text1);
  if (res1.ok) return;

  // Prova 2: endpoint transfer generico
  const res2 = await fetch(apiUrl(`/calls/${channelId}/transfer`), {
    method:  'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: VOICEBOT_EXT }),
  });
  const text2 = await res2.text();
  console.log('[wildix] transfer:', res2.status, text2);
  if (res2.ok) return;

  // Prova 3: endpoint redirect
  const res3 = await fetch(apiUrl(`/calls/${channelId}/redirect`), {
    method:  'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: VOICEBOT_EXT }),
  });
  const text3 = await res3.text();
  console.log('[wildix] redirect:', res3.status, text3);
}

// ─── Termina chiamata ─────────────────────────────────────────
export async function hangupCall(callId: string): Promise<void> {
  console.log('[wildix] hangupCall ->', callId);
  try {
    await fetch(apiUrl(`/calls/${callId}`), {
      method:  'DELETE',
      headers: authHeader(),
    });
  } catch (e) {
    console.warn('[wildix] hangupCall error (ignored):', e);
  }
}

// ─── Stato chiamata ───────────────────────────────────────────
export async function getCallStatus(callId: string): Promise<{
  status: string;
  duration?: number;
}> {
  try {
    const res = await fetch(apiUrl(`/calls/${callId}`), {
      headers: authHeader(),
    });
    if (!res.ok) return { status: 'unknown' };
    const data = await res.json();
    return {
      status:   data?.result?.status ?? data?.status ?? 'unknown',
      duration: data?.result?.duration,
    };
  } catch {
    return { status: 'unknown' };
  }
}

// ─── Compatibilità con codice esistente ──────────────────────
export async function transferCall(params: {
  callId:      string;
  destination: string;
}): Promise<void> {
  await transferToVoicebot(params.callId);
}
