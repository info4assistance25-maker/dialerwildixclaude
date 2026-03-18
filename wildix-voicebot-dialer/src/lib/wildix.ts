/**
 * Wildix GEM API — client lato server
 *
 * Autenticazione: S2S (Server-to-Server)
 *   Header: Authorization: s2s {APP_ID}:{SECRET_KEY}
 *   Base URL: https://gem.wildixin.com/api/v1
 *
 * Flusso voicebot outbound:
 *   POST /VoiceBots/sessions → avvia sessione voicebot verso numero destinatario
 *   Il voicebot chiama il destinatario e gestisce la conversazione
 *   Al termine → POST webhook → nostra app /api/voicebot-webhook
 */

const GEM_HOST   = process.env.WILDIX_GEM_HOST   ?? 'gem.wildixin.com';
const APP_ID     = process.env.WILDIX_APP_ID      ?? 's2s-aidialer-0203489001771497745';
const SECRET_KEY = process.env.WILDIX_SECRET_KEY  ?? 'Fr5dfC*6Ed1Sg#xpmQBzlRsvR2K3yJvmh3*XS*4OL0bEWloqTKCOyGi0D4XSVo58';
const BOT_ID     = process.env.WILDIX_BOT_ID      ?? '5jiEMW3bfAVk';

function getAuthHeader(): string {
  return `s2s ${APP_ID}:${SECRET_KEY}`;
}

function apiUrl(path: string): string {
  return `https://${GEM_HOST}/api/v1${path}`;
}

// ─── Avvia sessione voicebot outbound ────────────────────────
// Il voicebot chiama direttamente il destinatario
export async function makeCall(params: {
  callee: string;        // numero destinatario E.164 (es. "+393331234567")
  callerId?: string;     // CallerID mostrato al destinatario
  caller?: string;       // non usato in modalità voicebot
  metadata?: Record<string, string>; // dati extra passati al bot
}): Promise<{ callId: string }> {
  const body: Record<string, unknown> = {
    botId:  BOT_ID,
    callee: params.callee,
    ...(params.callerId ? { callerId: params.callerId } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  const res = await fetch(apiUrl('/VoiceBots/sessions'), {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wildix VoiceBot session failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  // Risposta attesa: { id: "session-id", ... } o { sessionId: "..." }
  const sessionId = data?.result?.id ?? data?.id ?? data?.sessionId ?? `session_${Date.now()}`;
  return { callId: sessionId };
}

// ─── Termina sessione voicebot ────────────────────────────────
export async function hangupCall(sessionId: string): Promise<void> {
  const res = await fetch(apiUrl(`/VoiceBots/sessions/${sessionId}`), {
    method:  'DELETE',
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Wildix hangupSession failed [${res.status}]: ${text}`);
  }
}

// ─── Leggi stato sessione ─────────────────────────────────────
export async function getCallStatus(sessionId: string): Promise<{
  status: string;
  duration?: number;
}> {
  const res = await fetch(apiUrl(`/VoiceBots/sessions/${sessionId}`), {
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok) {
    throw new Error(`Wildix getSessionStatus failed [${res.status}]`);
  }

  const data = await res.json();
  return {
    status:   data?.result?.status ?? data?.status ?? 'unknown',
    duration: data?.result?.duration ?? data?.duration,
  };
}

// ─── Trasferimento non necessario in modalità voicebot puro ──
// Mantenuto per compatibilità con wildix-webhook/route.ts
export async function transferCall(_params: {
  callId: string;
  destination: string;
}): Promise<void> {
  // In modalità voicebot GEM il trasferimento è gestito
  // direttamente dal bot tramite le sue tool "Call Control"
  console.log('[wildix] transferCall: no-op in voicebot mode');
}
