import { NextRequest, NextResponse } from 'next/server';
import { makeCall, transferCall } from '@/lib/wildix';
import { startVoicebotSession } from '@/lib/voicebot';
import { getContact, upsertCall, upsertContact } from '@/lib/store';
import { CallRecord } from '@/types';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId } = body as { contactId: string };

    if (!contactId) {
      return NextResponse.json({ ok: false, error: 'contactId richiesto' }, { status: 400 });
    }

    const contact = getContact(contactId);
    if (!contact) {
      return NextResponse.json({ ok: false, error: 'Contatto non trovato' }, { status: 404 });
    }

    const callId = randomUUID();
    const now = new Date().toISOString();

    // Crea subito il record in stato "dialing"
    const callRecord: CallRecord = {
      id:              callId,
      contactId:       contact.id,
      contactName:     contact.name,
      contactPhone:    contact.phone,
      contactCompany:  contact.company,
      status:          'dialing',
      startedAt:       now,
    };
    upsertCall(callRecord);

    // Aggiorna lastCalled sul contatto
    upsertContact({ ...contact, lastCalled: now });

    const provider = process.env.VOICEBOT_PROVIDER ?? 'wildix_ivr';

    if (provider === 'vapi') {
      // ── Modalità Vapi: Vapi fa la chiamata in autonomia ─────
      const { sessionId } = await startVoicebotSession({
        phoneNumber:  contact.phone,
        contactId:    contact.id,
        callRecordId: callId,
      });

      upsertCall({
        ...callRecord,
        status:            'ringing',
        voicebotSessionId: sessionId,
      });

      return NextResponse.json({ ok: true, data: { callId, sessionId } });
    }

    // ── Modalità Wildix (default) ─────────────────────────────
    // 1. PBX fa squillare l'interno operatore, poi il destinatario
    const callerExtension = process.env.WILDIX_CALLER_EXTENSION ?? '100';
    const { callId: wildixCallId } = await makeCall({
      caller: callerExtension,
      callee: contact.phone,
    });

    upsertCall({ ...callRecord, status: 'ringing', wildixCallId });

    // 2. Se c'è un voicebot IVR interno, trasferisci dopo la risposta
    //    (il trasferimento reale avviene nel webhook call.answered)
    //    Qui registriamo solo l'intenzione.

    return NextResponse.json({ ok: true, data: { callId, wildixCallId } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error('[make-call]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ── Annulla / riaggancia chiamata ─────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wildixCallId = searchParams.get('wildixCallId');

    if (wildixCallId) {
      const { hangupCall } = await import('@/lib/wildix');
      await hangupCall(wildixCallId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
