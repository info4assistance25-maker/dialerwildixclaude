import { NextRequest, NextResponse } from 'next/server';
import { getContacts, getContact, upsertContact, deleteContact } from '@/lib/store';
import { Contact } from '@/types';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const c = getContact(id);
    if (!c) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: c });
  }

  const tag = searchParams.get('tag');
  const q   = searchParams.get('q')?.toLowerCase();

  let contacts = getContacts();
  if (tag) contacts = contacts.filter((c) => c.tags.includes(tag));
  if (q)   contacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.company?.toLowerCase().includes(q) ?? false)
  );

  return NextResponse.json({ ok: true, data: contacts });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<Contact, 'id'>;
  const contact: Contact = { id: randomUUID(), ...body, tags: body.tags ?? [] };
  upsertContact(contact);
  return NextResponse.json({ ok: true, data: contact }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Contact;
  if (!body.id) return NextResponse.json({ ok: false, error: 'id richiesto' }, { status: 400 });
  upsertContact(body);
  return NextResponse.json({ ok: true, data: body });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id richiesto' }, { status: 400 });
  const ok = deleteContact(id);
  return NextResponse.json({ ok });
}
