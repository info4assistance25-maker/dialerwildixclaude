/**
 * Voicebot client — attualmente con supporto Vapi.ai
 *
 * Quando ottieni le credenziali Vapi, imposta nel .env:
 *   VOICEBOT_PROVIDER=vapi
 *   VAPI_API_KEY=sk-...
 *   VAPI_PHONE_NUMBER_ID=...   (il numero Vapi da cui parte la chiamata)
 *   VAPI_ASSISTANT_ID=...      (l'assistant configurato in Vapi)
 *
 * Se invece il voicebot è un IVR interno al PBX Wildix (es. Asterisk/FreePBX),
 * non serve questo file: basta fare transferCall() verso l'interno IVR.
 *
 * Modalità operative:
 *  A) Wildix fa la chiamata → destinatario risponde → trasferisce all'IVR interno  [solo Wildix]
 *  B) Vapi fa la chiamata in autonomia outbound                                    [solo Vapi]
 *  C) Wildix fa la chiamata, poi trasferisce a Vapi SIP                            [ibrido]
 */

const PROVIDER = process.env.VOICEBOT_PROVIDER ?? 'wildix_ivr';

// ─── Vapi outbound call ───────────────────────────────────────
async function vapiCall(phoneNumber: string, metadata: Record<string, string>) {
  const res = await fetch('https://api.vapi.ai/call/phone', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${process.env.VAPI_API_KEY}`,
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      assistantId:   process.env.VAPI_ASSISTANT_ID,
      customer: {
        number: phoneNumber,
      },
      assistantOverrides: {
        metadata,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi call failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return { sessionId: data.id };
}

// ─── Public interface ─────────────────────────────────────────
export async function startVoicebotSession(params: {
  phoneNumber: string;
  contactId: string;
  callRecordId: string;
}): Promise<{ sessionId: string }> {
  if (PROVIDER === 'vapi') {
    return vapiCall(params.phoneNumber, {
      contactId:    params.contactId,
      callRecordId: params.callRecordId,
    });
  }

  // wildix_ivr: la chiamata viene trasferita via wildix.ts, nessuna azione qui
  return { sessionId: `ivr_${Date.now()}` };
}
