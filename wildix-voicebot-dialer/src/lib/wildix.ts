/**
 * Wildix WMS PBX API — client lato server
 *
 * Autenticazione: Bearer API Key
 * Base URL: https://{pbx-host}/api/v1
 *
 * Flusso outbound con voicebot su interno 777:
 *   1. POST /Originate/Call/ → PBX chiama il numero destinatario
 *   2. Webhook call.answered → app trasferisce a interno 777
 *   3. Voicebot gestisce la conversazione
 */

const PBX_HOST         = process.env.WILDIX_PBX_HOST          ?? 'gem.wildixin.com';
const API_KEY          = process.env.WILDIX_API_KEY            ?? 'access_l6ATnhGjrRtuAz9rSd7SB9j7Put52YgswIgueSQ6mReSFIkS37cC6yMaGlUUoyp9';
const VOICEBOT_EXT     = process.env.WILDIX_VOICEBOT_EXTENSION ?? '777';

function getAuthHeader(): string {
  return `Bearer ${API_KEY}`;
}

function apiUrl(path: string): string {
  return `https://${PBX_HOST}/api/v1${path}`;
}

// ─── Origina chiamata outbound ────────────────────────────────
// Il PBX chiama il numero esterno; alla risposta viene trasferito a 777
export async function makeCall(params: {
  callee:    string;                   // numero destinatario E.164
  caller?:   string;                   // non usato con Bearer, lasciato per compatibilità
  callerId?: string;                   // non usato con questo endpoint
  metadata?: Record<string, unknown>;  // dati arbitrari (non inviati al PBX)
}): Promise<{ callId: string }> {
  console.log('[wildix] makeCall ->', params.callee);

  const body = {
    number: params.callee,
    name:   'VoiceBot',
  };

  console.log('[wildix] POST', apiUrl('/Originate/Call/'), JSON.stringify(body));

  const res = await fetch(apiUrl('/Originate/Call/'), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      Authorization:  getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log('[wildix] Originate/Call response:', res.status, responseText);

  if (!res.ok) {
    throw new Error(`Wildix makeCall failed [${res.status}]: ${responseText}`);
  }

  let data: any = {};
  try { data = JSON.parse(responseText); } catch {}

  const callId = data?.result?.id
    ?? data?.result?.callId
    ?? data?.id
    ?? data?.callId
    ?? `wms_${Date.now()}`;

  console.log('[wildix] callId:', callId);
  return { callId };
}

// ─── Trasferisci chiamata all'interno 777 (voicebot) ─────────
// Chiamato dal webhook wildix-webhook quando arriva call.answered
export async function transferToVoicebot(callId: string): Promise<void> {
  console.log('[wildix] transferToVoicebot ->', callId, '→', VOICEBOT_EXT);

  const res = await fetch(apiUrl(`/calls/${callId}/transfer`), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      Authorization:  getAuthHeader(),
    },
    body: JSON.stringify({ destination: VOICEBOT_EXT }),
  });

  const responseText = await res.text();
  console.log('[wildix] transfer response:', res.status, responseText);

  if (!res.ok) {
    console.warn('[wildix] transfer failed, trying redirect fallback...');
    await transferCallFallback(callId, VOICEBOT_EXT);
  }
}

// ─── Fallback: redirect ───────────────────────────────────────
async function transferCallFallback(callId: string, destination: string): Promise<void> {
  console.log('[wildix] transferCallFallback ->', callId, '→', destination);

  const res = await fetch(apiUrl(`/calls/${callId}/redirect`), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      Authorization:  getAuthHeader(),
    },
    body: JSON.stringify({ number: destination }),
  });

  const responseText = await res.text();
  console.log('[wildix] redirect response:', res.status, responseText);

  if (!res.ok) {
    console.warn('[wildix] transferCallFallback also failed (ignored):', responseText);
  }
}

// ─── Termina chiamata ─────────────────────────────────────────
export async function hangupCall(callId: string): Promise<void> {
  console.log('[wildix] hangupCall ->', callId);
  try {
    const res = await fetch(apiUrl(`/calls/${callId}`), {
      method:  'DELETE',
      headers: {
        Authorization: getAuthHeader(),
        'Accept':      'application/json',
      },
    });
    console.log('[wildix] hangup response:', res.status);
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
      headers: {
        Authorization: getAuthHeader(),
        'Accept':      'application/json',
      },
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

// ─── Trasferimento generico (compatibilità con route.ts) ──────
export async function transferCall(params: {
  callId:      string;
  destination: string;
}): Promise<void> {
  await transferToVoicebot(params.callId);
}
