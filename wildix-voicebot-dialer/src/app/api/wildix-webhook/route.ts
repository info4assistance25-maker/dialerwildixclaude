/**
 * Webhook Wildix GEM — riceve eventi dalla sessione voicebot
 *
 * Configura in Wildix GEM → Voicebot → DEMO PRESA APP → Third-party Function:
 *   URL: https://dialerwildixclaude.vercel.app/api/wildix-webhook
 *   Method: POST
 *
 * Oppure nei webhook di sistema GEM:
 *   Settings → Webhooks → URL sopra
 *
 * Eventi attesi:
 *   session.started   → destinatario sta squillando
 *   session.answered  → destinatario ha risposto, voicebot attivo
 *   session.ended     → chiamata terminata
 *   session.failed    → chiamata fallita
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCallByWildixId, upsertCall } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event     = payload.event ?? payload.type ?? '';
    const sessionId = payload.sessionId ?? payload.id ?? payload.callId ?? '';

    console.log('[wildix-webhook]', event, sessionId, JSON.stringify(payload).slice(0, 200));

    if (!sessionId) {
      return NextResponse.json({ ok: true, note: 'no sessionId' });
    }

    const callRecord = getCallByWildixId(sessionId);
    if (!callRecord) {
      return NextResponse.json({ ok: true, note: 'call not tracked' });
    }

    const timestamp = payload.timestamp ?? new Date().toISOString();

    switch (event) {
      case 'session.started':
      case 'call.ringing': {
        upsertCall({ ...callRecord, status: 'ringing' });
        break;
      }

      case 'session.answered':
      case 'call.answered': {
        upsertCall({
          ...callRecord,
          status:     'voicebot_active',
          answeredAt: timestamp,
        });
        break;
      }

      case 'session.ended':
      case 'call.ended': {
        const endedAt = timestamp;
        const durationSeconds = callRecord.answeredAt
          ? Math.round(
              (new Date(endedAt).getTime() - new Date(callRecord.answeredAt).getTime()) / 1000
            )
          : undefined;

        // Estrai eventuali dati dalla conversazione
        const answers  = payload.answers  ?? payload.surveyAnswers ?? undefined;
        const score    = payload.score    ?? payload.overallScore  ?? undefined;
        const outcome  = payload.outcome  ?? undefined;

        upsertCall({
          ...callRecord,
          status:          callRecord.status === 'ringing' ? 'no_answer' : 'completed',
          endedAt,
          durationSeconds,
          ...(answers ? { surveyAnswers: answers } : {}),
          ...(score   != null ? { overallScore: score } : {}),
          ...(outcome ? { outcome } : {}),
        });
        break;
      }

      case 'session.failed':
      case 'call.failed':
      case 'call.busy': {
        upsertCall({
          ...callRecord,
          status:  event === 'call.busy' ? 'busy' : 'failed',
          endedAt: timestamp,
        });
        break;
      }

      case 'call.no_answer': {
        upsertCall({ ...callRecord, status: 'no_answer', endedAt: timestamp });
        break;
      }

      default:
        console.log('[wildix-webhook] unhandled event:', event);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore';
    console.error('[wildix-webhook]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
