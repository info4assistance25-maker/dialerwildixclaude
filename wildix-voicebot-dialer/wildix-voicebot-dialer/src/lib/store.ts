/**
 * In-memory store — funziona perfettamente su Vercel Serverless per demo/MVP.
 * Per produzione, sostituisci con Supabase / PlanetScale / Redis.
 *
 * NOTA: su Vercel ogni lambda è stateless tra invocazioni cold-start.
 * Per persistenza reale usa il file DATABASE.md nella root del progetto.
 */

import { CallRecord, Contact } from '@/types';

// ─── Contacts ────────────────────────────────────────────────
let contacts: Contact[] = [
  {
    id: 'c1',
    name: 'Mario Rossi',
    phone: '+393331234567',
    company: 'Rossi Srl',
    tags: ['lead', 'warm'],
    notes: 'Interessato al piano Professional',
    lastCalled: undefined,
  },
  {
    id: 'c2',
    name: 'Giulia Bianchi',
    phone: '+393347654321',
    company: 'Bianchi & Co',
    tags: ['cliente', 'rinnovo'],
    notes: 'Scadenza contratto luglio 2025',
    lastCalled: undefined,
  },
  {
    id: 'c3',
    name: 'Luca Verdi',
    phone: '+393356789012',
    company: 'Verdi Impianti',
    tags: ['cold', 'prospect'],
    notes: '',
    lastCalled: undefined,
  },
  {
    id: 'c4',
    name: 'Sofia Neri',
    phone: '+393389876543',
    company: 'Neri Consulting',
    tags: ['lead', 'hot'],
    notes: 'Ha chiesto demo la prossima settimana',
    lastCalled: undefined,
  },
  {
    id: 'c5',
    name: 'Alessandro Ferrari',
    phone: '+393312345678',
    company: 'Ferrari Tech',
    tags: ['cliente'],
    notes: 'Upsell opportunità Q3',
    lastCalled: undefined,
  },
];

// ─── Calls ───────────────────────────────────────────────────
let calls: CallRecord[] = [];

// ─── Contacts CRUD ──────────────────────────────────────────
export function getContacts(): Contact[] {
  return contacts;
}

export function getContact(id: string): Contact | undefined {
  return contacts.find((c) => c.id === id);
}

export function upsertContact(contact: Contact): Contact {
  const idx = contacts.findIndex((c) => c.id === contact.id);
  if (idx >= 0) {
    contacts[idx] = contact;
  } else {
    contacts.push(contact);
  }
  return contact;
}

export function deleteContact(id: string): boolean {
  const before = contacts.length;
  contacts = contacts.filter((c) => c.id !== id);
  return contacts.length < before;
}

// ─── Calls CRUD ──────────────────────────────────────────────
export function getCalls(): CallRecord[] {
  return [...calls].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export function getCall(id: string): CallRecord | undefined {
  return calls.find((c) => c.id === id);
}

export function getCallByWildixId(wildixCallId: string): CallRecord | undefined {
  return calls.find((c) => c.wildixCallId === wildixCallId);
}

export function upsertCall(call: CallRecord): CallRecord {
  const idx = calls.findIndex((c) => c.id === call.id);
  if (idx >= 0) {
    calls[idx] = call;
  } else {
    calls.push(call);
  }
  return call;
}

// ─── Stats helpers ───────────────────────────────────────────
export function getStats() {
  const total = calls.length;
  const answered = calls.filter((c) =>
    ['answered', 'voicebot_active', 'completed'].includes(c.status)
  ).length;
  const completed = calls.filter((c) => c.status === 'completed').length;
  const noAnswer = calls.filter((c) => c.status === 'no_answer').length;
  const failed = calls.filter((c) => c.status === 'failed').length;
  const busy = calls.filter((c) => c.status === 'busy').length;

  const withScore = calls.filter((c) => c.overallScore !== undefined);
  const avgScore =
    withScore.length > 0
      ? withScore.reduce((s, c) => s + (c.overallScore ?? 0), 0) / withScore.length
      : null;

  const avgDuration =
    completed > 0
      ? calls
          .filter((c) => c.durationSeconds)
          .reduce((s, c) => s + (c.durationSeconds ?? 0), 0) / completed
      : null;

  return {
    total,
    answered,
    completed,
    noAnswer,
    failed,
    busy,
    answerRate: total > 0 ? Math.round((answered / total) * 100) : 0,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
    avgDuration: avgDuration ? Math.round(avgDuration) : null,
  };
}
