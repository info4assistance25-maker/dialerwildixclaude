/**
 * Webhook Wildix — riceve eventi dal PBX
 *
 * Configura in Wildix Admin Panel:
 *   Settings → Webhooks → Add Webhook
 *   URL: https://your-app.vercel.app/api/wildix-webhook
 *   Events: call.answered, call.ended, call.failed
 *
 * Poi aggiungi WEBHOOK_SECRET nel .env e nel pannello Wildix.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCallByWildixId, upsertCall } from '@/lib/store';
import { transferCall } from '@/lib/wildix';
import type { WildixWebhookPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // ── Validazione firma (opzionale ma consigliata) ──────────
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get('x-wildix-signature') ?? '';
      // TODO: implementa HMAC-SHA256 se Wildix lo supporta
      // Per ora accettiamo con header custom
      if (secret !== 'skip' && !signature) {
        // Non bloccare in dev, solo log
        console.warn('[wildix-webhook] Firma assente');
      }
    }

    const payload: WildixWebhookPayload = await req.json();
    const { event, callId: wildixCallId, timestamp } = payload;

    console.log('[wildix-webhook]', event, wildixCallId);

    const callRecord = getCallByWildixId(wildixCallId);
    if (!callRecord) {
      // Potrebbe essere una chiamata non gestita dall'app
      return NextResponse.json({ ok: true, note: 'call not tracked' });
    }

    switch (event) {
      case 'call.answered': {
        const updated = {
          ...callRecord,
          status:      'answered' as const,
          answeredAt:  timestamp,
        };
        upsertCall(updated);

        // Trasferisci al voicebot IVR se configurato
        const voicebotExtension = process.env.WILDIX_VOICEBOT_EXTENSION;
        if (voicebotExtension && process.env.VOICEBOT_PROVIDER !== 'vapi') {
          try {
            await transferCall({ callId: wildixCallId, destination: voicebotExtension });
            upsertCall({ ...updated, status: 'voicebot_active' });
          } catch (e) {
            console.error('[wildix-webhook] Transfer failed:', e);
          }
        }
        break;
      }

      case 'call.ended': {
        const endedAt = timestamp;
        const durationSeconds = callRecord.answeredAt
          ? Math.round(
              (new Date(endedAt).getTime() - new Date(callRecord.answeredAt).getTime()) / 1000
            )
          : undefined;

        upsertCall({
          ...callRecord,
          status: callRecord.status === 'ringing' ? 'no_answer' : 'completed',
          endedAt,
          durationSeconds,
        });
        break;
      }

      case 'call.failed': {
        upsertCall({ ...callRecord, status: 'failed', endedAt: timestamp });
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore';
    console.error('[wildix-webhook]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
