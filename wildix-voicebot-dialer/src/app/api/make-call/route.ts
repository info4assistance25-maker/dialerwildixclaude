import { NextRequest, NextResponse } from 'next/server';
import { getContacts, upsertCall } from '@/lib/store';

// URL webhook Make — avvia la chiamata Wildix tramite Make
const MAKE_WEBHOOK_URL =
  process.env.MAKE_WEBHOOK_URL ??
  'https://hook.eu1.make.com/kgg5rrcn3p4p5k8hqpj2xg987swczu91';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId } = body;

    // Trova il contatto
    const contacts = getContacts();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Genera un ID chiamata locale
    const callId = `call_${Date.now()}`;

    // Avvia la chiamata tramite Make webhook
    const makeRes = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number:    contact.phone,
        name:      contact.name,
        callId,
        contactId: contact.id,
      }),
    });

    if (!makeRes.ok) {
      const text = await makeRes.text();
      console.error('[make-call] Make webhook error:', makeRes.status, text);
      return NextResponse.json(
        { error: `Make webhook failed: ${text}` },
        { status: 500 }
      );
    }

    // Salva il record della chiamata nello store
    upsertCall({
      id:             callId,
      contactId:      contact.id,
      contactName:    contact.name,
      contactPhone:   contact.phone,
      contactCompany: contact.company ?? '',
      status:         'dialing',
      startedAt:      new Date().toISOString(),
    });

    console.log('[make-call] Chiamata avviata:', callId, '->', contact.phone);

    return NextResponse.json({ callId, status: 'initiated' });
  } catch (err: any) {
    console.error('[make-call] Errore:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
