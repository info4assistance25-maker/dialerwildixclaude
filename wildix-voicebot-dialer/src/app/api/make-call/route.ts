import { NextRequest, NextResponse } from 'next/server';
import { makeCall, hangupCall } from '@/lib/wildix';
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
    const now    = new Date().toISOString();

    // Crea subito il record in stato "dialing"
    const callRecord: CallRecord = {
      id:             callId,
      contactId:      contact.id,
      contactName:    contact.name,
      contactPhone:   contact.phone,
      contactCompany: contact.company,
      status:         'dialing',
      startedAt:      now,
    };
    upsertCall(callRecord);
    upsertContact({ ...contact, lastCalled: now });

    // ── Avvia sessione voicebot Wildix GEM ──────────────────
    // Il voicebot chiama direttamente il destinatario
    const { callId: wildixSessionId } = await makeCall({
      callee:    contact.phone,
      callerId:  process.env.WILDIX_CALLER_ID,
      metadata:  {
        contactId:    contact.id,
        callRecordId: callId,
        contactName:  contact.name,
      },
    });

    upsertCall({
      ...callRecord,
      status:            'ringing',
      wildixCallId:      wildixSessionId,
      voicebotSessionId: wildixSessionId,
    });

    return NextResponse.json({ ok: true, data: { callId, wildixSessionId } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error('[make-call]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ── Annulla / termina sessione voicebot ───────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wildixCallId = searchParams.get('wildixCallId');
    if (wildixCallId) {
      await hangupCall(wildixCallId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
