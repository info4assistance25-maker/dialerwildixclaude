/**
 * Wildix Collaboration API — client lato server
 *
 * Documentazione: https://docs.wildix.com/collaboration-api
 *
 * Il flusso outbound "attended transfer":
 *  1. POST /calls → PBX fa squillare l'interno dell'operatore (caller)
 *  2. L'operatore risponde → PBX fa squillare il destinatario (callee)
 *  3. Destinatario risponde → evento call.answered
 *  4. L'app fa PUT /calls/{id}/transfer → destinatario viene trasferito al voicebot
 *
 * Oppure flusso "blind" (più semplice per voicebot):
 *  1. POST /calls con callee=voicebot_extension e customCallee=numero_destinatario
 *     (verifica se il tuo PBX supporta questa modalità)
 */

const PBX_HOST = process.env.WILDIX_PBX_HOST ?? '';
const API_KEY  = process.env.WILDIX_API_KEY ?? '';
const USERNAME = process.env.WILDIX_USERNAME ?? '';
const PASSWORD = process.env.WILDIX_PASSWORD ?? '';

function getAuthHeader(): string {
  if (API_KEY) {
    return `Key ${API_KEY}`;
  }
  const b64 = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
  return `Basic ${b64}`;
}

function apiUrl(path: string): string {
  return `https://${PBX_HOST}/api/v1${path}`;
}

// ─── Avvia chiamata outbound ─────────────────────────────────
export async function makeCall(params: {
  caller: string;   // interno operatore (es. "100")
  callee: string;   // numero destinatario (es. "+393331234567")
  callerId?: string;
}): Promise<{ callId: string }> {
  const body = {
    caller:   params.caller,
    callee:   params.callee,
    callerId: params.callerId ?? process.env.WILDIX_CALLER_ID,
  };

  const res = await fetch(apiUrl('/calls'), {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wildix makeCall failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  // La risposta Wildix ha la forma { id: "...", ... } oppure { callId: "..." }
  return { callId: data.id ?? data.callId ?? data.call_id };
}

// ─── Trasferisci chiamata a un interno (voicebot) ────────────
export async function transferCall(params: {
  callId: string;
  destination: string; // interno voicebot
}): Promise<void> {
  const res = await fetch(apiUrl(`/calls/${params.callId}/transfer`), {
    method:  'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  getAuthHeader(),
    },
    body: JSON.stringify({ destination: params.destination }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wildix transferCall failed [${res.status}]: ${text}`);
  }
}

// ─── Termina chiamata ────────────────────────────────────────
export async function hangupCall(callId: string): Promise<void> {
  const res = await fetch(apiUrl(`/calls/${callId}`), {
    method:  'DELETE',
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Wildix hangupCall failed [${res.status}]: ${text}`);
  }
}

// ─── Leggi stato chiamata ────────────────────────────────────
export async function getCallStatus(callId: string): Promise<{
  status: string;
  duration?: number;
}> {
  const res = await fetch(apiUrl(`/calls/${callId}`), {
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok) {
    throw new Error(`Wildix getCallStatus failed [${res.status}]`);
  }

  const data = await res.json();
  return { status: data.status, duration: data.duration };
}
