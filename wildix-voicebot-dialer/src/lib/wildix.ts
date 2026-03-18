/**
 * Wildix WMS PBX API — client lato server
 *
 * Autenticazione: S2S oppure Basic (username:password)
 * Base URL: https://{pbx-host}/api/v1
 *
 * Flusso outbound con voicebot su interno 777:
 *   POST /Originate/Call → PBX chiama il numero destinatario
 *   La chiamata arriva all'interno 777 → deviazione forzata al voicebot AI
 */

const PBX_HOST   = process.env.WILDIX_PBX_HOST   ?? 'gem.wildixin.com';
const APP_ID     = process.env.WILDIX_APP_ID      ?? 's2s-aidialer-0203489001771497745';
const SECRET_KEY = process.env.WILDIX_SECRET_KEY  ?? 'Fr5dfC*6Ed1Sg#xpmQBzlRsvR2K3yJvmh3*XS*4OL0bEWloqTKCOyGi0D4XSVo58';
const CALLER_ID  = process.env.WILDIX_CALLER_ID   ?? '';

// Interno da cui parte la chiamata outbound (deve avere deviazione → voicebot)
const CALLER_EXTENSION = process.env.WILDIX_CALLER_EXTENSION ?? '777';

function getAuthHeader(): string {
  return `s2s ${APP_ID}:${SECRET_KEY}`;
}

function apiUrl(path: string): string {
  return `https://${PBX_HOST}/api/v1${path}`;
}

// ─── Origina chiamata outbound ────────────────────────────────
// Il PBX chiama il destinatario dalla extension 777
// Il dialplan su 777 devia automaticamente al voicebot AI
export async function makeCall(params: {
  callee:    string;   // numero destinatario E.164
  caller?:   string;   // interno (default: CALLER_EXTENSION)
  callerId?: string;   // CallerID mostrato al destinatario
}): Promise<{ callId: string }> {
  const caller   = params.caller ?? CALLER_EXTENSION;
  const callerId = params.callerId ?? CALLER_ID ?? caller;

  // Prova prima con /Originate/Call (API legacy WMS, ampiamente supportata)
  const body = {
    channel:  `Local/${params.callee}@users`,
    exten:    caller,
    context:  'users',
    callerid: `"VoiceBot" <${callerId}>`,
    async:    'true',
  };

  const res = await fetch(apiUrl('/Originate/Call'), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:  getAuthHeader(),
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    // Fallback: prova con JSON e endpoint alternativo
    return makeCallJson(params);
  }

  const data = await res.text();
  const callId = `wms_${Date.now()}`;
  console.log('[wildix] Originate/Call response:', data);
  return { callId };
}

// ─── Fallback: JSON API (WMS 6.x+) ───────────────────────────
async function makeCallJson(params: {
  callee:    string;
  caller?:   string;
  callerId?: string;
}): Promise<{ callId: string }> {
  const caller   = params.caller ?? CALLER_EXTENSION;
  const callerId = params.callerId ?? CALLER_ID ?? caller;

  const body = {
    caller:   caller,
    callee:   params.callee,
    callerId: callerId,
  };

  const res = await fetch(apiUrl('/calls'), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wildix makeCall failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return { callId: data?.result?.id ?? data?.id ?? data?.callId ?? `call_${Date.now()}` };
}

// ─── Termina chiamata ─────────────────────────────────────────
export async function hangupCall(callId: string): Promise<void> {
  try {
    await fetch(apiUrl(`/calls/${callId}`), {
      method:  'DELETE',
      headers: { Authorization: getAuthHeader() },
    });
  } catch (e) {
    console.warn('[wildix] hangupCall error (ignored):', e);
  }
}

// ─── Trasferimento (non necessario con deviazione 777) ────────
export async function transferCall(_params: {
  callId:      string;
  destination: string;
}): Promise<void> {
  console.log('[wildix] transferCall: gestito dal dialplan su interno 777');
}

// ─── Stato chiamata ───────────────────────────────────────────
export async function getCallStatus(callId: string): Promise<{
  status: string;
  duration?: number;
}> {
  try {
    const res = await fetch(apiUrl(`/calls/${callId}`), {
      headers: { Authorization: getAuthHeader() },
    });
    if (!res.ok) return { status: 'unknown' };
    const data = await res.json();
    return { status: data?.result?.status ?? data?.status ?? 'unknown', duration: data?.result?.duration };
  } catch {
    return { status: 'unknown' };
  }
}
