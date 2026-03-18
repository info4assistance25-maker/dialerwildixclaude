/**
 * Webhook Voicebot (Vapi.ai) — riceve i risultati della survey
 *
 * In Vapi Dashboard → Assistant → Webhook URL:
 *   https://your-app.vercel.app/api/voicebot-webhook
 *
 * Puoi anche configurare il Server URL nel Phone Number per ricevere
 * tutti gli eventi (call-started, call-ended, transcript, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalls, upsertCall } from '@/lib/store';
import type { VoicebotWebhookPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const payload: VoicebotWebhookPayload = await req.json();
    console.log('[voicebot-webhook]', payload.event, payload.sessionId);

    if (payload.event === 'survey.completed' || payload.event === 'session.ended') {
      // Trova il call record tramite sessionId o callId
      const calls = getCalls();
      const record = calls.find(
        (c) =>
          c.voicebotSessionId === payload.sessionId ||
          (payload.callId && c.wildixCallId === payload.callId)
      );

      if (record) {
        upsertCall({
          ...record,
          status:          'completed',
          endedAt:         payload.timestamp ?? new Date().toISOString(),
          surveyAnswers:   payload.answers,
          overallScore:    payload.score,
          outcome:         payload.outcome,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore';
    console.error('[voicebot-webhook]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
