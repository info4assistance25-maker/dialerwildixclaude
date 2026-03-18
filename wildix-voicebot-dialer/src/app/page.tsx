'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone, History, BarChart3, Search, Building2,
  PhoneCall, PhoneOff, PhoneMissed, Bot, CheckCircle2,
  Clock, AlertCircle, RefreshCw, ChevronRight, X, Star,
  TrendingUp, Users, Voicemail, Filter, Plus, Upload,
  UserPlus, Trash2, Download
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import type { Contact, CallRecord } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────
type CallStatus = CallRecord['status'];

const STATUS_META: Record<CallStatus, { label: string; color: string; Icon: React.ElementType }> = {
  idle:            { label: 'In attesa',    color: '#6b7280', Icon: Clock },
  dialing:         { label: 'Composizione', color: '#f59e0b', Icon: PhoneCall },
  ringing:         { label: 'Chiamando',    color: '#3b82f6', Icon: PhoneCall },
  answered:        { label: 'Risposta',     color: '#22c55e', Icon: Phone },
  voicebot_active: { label: 'VoiceBot',     color: '#a78bfa', Icon: Bot },
  completed:       { label: 'Completata',   color: '#22c55e', Icon: CheckCircle2 },
  no_answer:       { label: 'No risposta',  color: '#6b7280', Icon: PhoneMissed },
  busy:            { label: 'Occupato',     color: '#f59e0b', Icon: PhoneOff },
  failed:          { label: 'Fallita',      color: '#ef4444', Icon: AlertCircle },
  cancelled:       { label: 'Annullata',    color: '#6b7280', Icon: X },
};

function StatusBadge({ status }: { status: CallStatus }) {
  const { label, color, Icon } = STATUS_META[status] ?? STATUS_META.idle;
  return (
    <span className="badge" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      <Icon size={10} />{label}
    </span>
  );
}

function formatDuration(s?: number) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function TagPill({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    hot: '#ef4444', warm: '#f59e0b', cold: '#6b7280',
    lead: '#3b82f6', cliente: '#22c55e', prospect: '#a78bfa', rinnovo: '#06b6d4',
  };
  const c = colors[tag] ?? '#6b7280';
  return (
    <span className="badge" style={{ color: c, background: `${c}15`, border: `1px solid ${c}28` }}>{tag}</span>
  );
}

// ─── Active Call Banner ───────────────────────────────────────
function ActiveCallBanner({ call, onHangup }: { call: CallRecord; onHangup: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!['dialing','ringing','answered','voicebot_active'].includes(call.status)) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 card glow-active px-5 py-4 flex items-center gap-4 shadow-2xl"
         style={{ minWidth: 300, borderColor: '#3b82f640' }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#3b82f620' }}>
        <PhoneCall size={20} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{call.contactName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={call.status} />
          <span className="text-xs text-gray-500 font-mono">{formatDuration(elapsed)}</span>
        </div>
      </div>
      <button onClick={onHangup}
        className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors">
        <PhoneOff size={16} className="text-red-400" />
      </button>
    </div>
  );
}

// ─── Add Contact Modal ────────────────────────────────────────
function AddContactModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', company: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) { setError('Nome e telefono sono obbligatori'); return; }
    let phone = form.phone.trim().replace(/\s/g, '');
    if (!phone.startsWith('+')) phone = '+39' + phone;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name.trim(),
          phone,
          company: form.company.trim() || undefined,
          tags:    form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.ok) { onSaved(); onClose(); }
      else setError(json.error ?? 'Errore nel salvataggio');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md mx-4 p-6 space-y-4 animate-slide_in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-400" />
            <h2 className="font-bold text-base">Nuovo contatto</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>
        {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        <div className="space-y-3">
          {[
            { key: 'name',    label: 'Nome e Cognome *',             placeholder: 'Mario Rossi' },
            { key: 'phone',   label: 'Telefono *',                   placeholder: '+393331234567 oppure 3331234567' },
            { key: 'company', label: 'Azienda',                      placeholder: 'Rossi Srl' },
            { key: 'tags',    label: 'Tag (separati da virgola)',     placeholder: 'lead, warm, prospect' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#0f1117] border border-[#252a3a] focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-50">
            {saving ? 'Salvataggio…' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────
function CsvImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [rows, setRows]           = useState<Omit<Contact, 'id'>[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setError('Il file deve avere almeno intestazione + una riga di dati'); return; }
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const idx = (names: string[]) => headers.findIndex(h => names.includes(h));
    const nameIdx    = idx(['nome','name','nominativo','contatto','cognome']);
    const phoneIdx   = idx(['telefono','phone','tel','cellulare','mobile','numero','cell']);
    const companyIdx = idx(['azienda','company','società','societa','organizzazione','org']);
    const tagsIdx    = idx(['tag','tags','categoria','category','etichetta']);

    if (nameIdx < 0 || phoneIdx < 0) {
      setError('Colonne obbligatorie mancanti: "nome" e "telefono" (o varianti inglesi name/phone)');
      return;
    }

    const parsed: Omit<Contact, 'id'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
      const name  = cols[nameIdx]  ?? '';
      let   phone = cols[phoneIdx] ?? '';
      if (!name || !phone) continue;
      if (!phone.startsWith('+')) phone = '+39' + phone.replace(/\s/g, '');
      parsed.push({
        name,
        phone,
        company: companyIdx >= 0 ? (cols[companyIdx] || undefined) : undefined,
        tags:    tagsIdx >= 0 ? cols[tagsIdx].split(/[|/]/).map(t => t.trim()).filter(Boolean) : [],
      });
    }
    if (!parsed.length) { setError('Nessun contatto valido trovato nel file'); return; }
    setError(''); setRows(parsed);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseCSV(ev.target?.result as string);
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    setImporting(true);
    for (const contact of rows) {
      try {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        });
      } catch {}
    }
    setImporting(false); setDone(true);
    setTimeout(() => { onSaved(); onClose(); }, 1200);
  }

  function downloadTemplate() {
    const csv = 'nome,telefono,azienda,tags\nMario Rossi,+393331234567,Rossi Srl,lead|warm\nGiulia Bianchi,3347654321,Bianchi Co,cliente';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'template_contatti.csv'; a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg mx-4 p-6 space-y-4 animate-slide_in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-blue-400" />
            <h2 className="font-bold text-base">Importa contatti da CSV</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        {/* Template */}
        <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: '#3b82f610', border: '1px solid #3b82f620' }}>
          <div>
            <p className="text-sm font-medium text-blue-300">Formato richiesto</p>
            <p className="text-xs text-gray-500 mt-0.5">Colonne: <span className="font-mono">nome, telefono</span> (obbligatorie) + <span className="font-mono">azienda, tags</span> (opzionali)</p>
            <p className="text-xs text-gray-600 mt-0.5">Separatore: virgola (,) o punto e virgola (;) — Tag separati da |</p>
          </div>
          <button onClick={downloadTemplate}
            className="ml-3 flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors">
            <Download size={12} /> Template
          </button>
        </div>

        {/* Drop zone */}
        <div onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#252a3a] hover:border-blue-500/40 rounded-xl p-8 text-center cursor-pointer transition-colors group">
          <Upload size={28} className="mx-auto text-gray-600 group-hover:text-blue-500/50 mb-2 transition-colors" />
          <p className="text-sm text-gray-400">Clicca per selezionare il file CSV</p>
          <p className="text-xs text-gray-600 mt-1">oppure trascina qui il file</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        {/* Preview */}
        {rows.length > 0 && !done && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> {rows.length} contatti rilevati — anteprima prime righe:
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {rows.slice(0, 6).map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-xs rounded-lg px-3 py-2" style={{ background: '#ffffff06' }}>
                  <span className="font-medium w-32 truncate">{r.name}</span>
                  <span className="text-gray-500 font-mono flex-1">{r.phone}</span>
                  {r.company && <span className="text-gray-600 truncate max-w-24">{r.company}</span>}
                  <div className="flex gap-1">{r.tags.slice(0,2).map(t => <TagPill key={t} tag={t} />)}</div>
                </div>
              ))}
              {rows.length > 6 && <p className="text-xs text-gray-600 text-center pt-1">…e altri {rows.length - 6} contatti</p>}
            </div>
          </div>
        )}

        {done && (
          <div className="text-center py-3">
            <CheckCircle2 size={32} className="mx-auto text-green-400 mb-2" />
            <p className="text-green-400 font-semibold">{rows.length} contatti importati!</p>
          </div>
        )}

        {rows.length > 0 && !done && (
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">
              Annulla
            </button>
            <button onClick={handleImport} disabled={importing}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-50">
              {importing ? 'Importazione…' : `Importa ${rows.length} contatti`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: DIALER ──────────────────────────────────────────────
function DialerTab() {
  const [contacts, setContacts]     = useState<Contact[]>([]);
  const [search, setSearch]         = useState('');
  const [tagFilter, setTagFilter]   = useState('');
  const [allTags, setAllTags]       = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [calling, setCalling]       = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [showCsv, setShowCsv]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)    params.set('q', search);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await fetch(`/api/contacts?${params}`);
      const { data } = await res.json();
      setContacts(data ?? []);
      const tags = Array.from(new Set((data ?? []).flatMap((c: Contact) => c.tags))) as string[];
      if (!tagFilter) setAllTags(tags);
    } finally { setLoading(false); }
  }, [search, tagFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeCall) return;
    if (!['dialing','ringing','answered','voicebot_active'].includes(activeCall.status)) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/calls?id=${activeCall.id}`);
      const { data } = await res.json();
      if (data) setActiveCall(data);
    }, 2000);
    return () => clearInterval(t);
  }, [activeCall]);

  async function handleCall(contact: Contact) {
    if (calling) return;
    setCalling(contact.id);
    try {
      const res = await fetch('/api/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id }),
      });
      const json = await res.json();
      if (json.ok) {
        const cr = await fetch(`/api/calls?id=${json.data.callId}`);
        const { data } = await cr.json();
        setActiveCall(data);
      } else {
        alert('Errore: ' + json.error);
      }
    } finally { setCalling(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo contatto?')) return;
    await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function handleHangup() {
    if (activeCall?.wildixCallId)
      await fetch(`/api/make-call?wildixCallId=${activeCall.wildixCallId}`, { method: 'DELETE' });
    setActiveCall(null);
  }

  return (
    <div className="space-y-4">
      {activeCall && <ActiveCallBanner call={activeCall} onHangup={handleHangup} />}
      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {showCsv && <CsvImportModal  onClose={() => setShowCsv(false)}  onSaved={load} />}

      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca nome, telefono, azienda…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-[#181c27] border border-[#252a3a] focus:border-blue-500/50 focus:outline-none transition-colors" />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            className="pl-8 pr-4 py-2.5 rounded-lg text-sm bg-[#181c27] border border-[#252a3a] focus:border-blue-500/50 focus:outline-none transition-colors appearance-none cursor-pointer">
            <option value="">Tutti i tag</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={load} title="Aggiorna"
          className="p-2.5 rounded-lg bg-[#181c27] border border-[#252a3a] hover:border-blue-500/40 transition-colors">
          <RefreshCw size={16} className="text-gray-400" />
        </button>
        <button onClick={() => setShowCsv(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#181c27] border border-[#252a3a] hover:border-blue-500/40 text-gray-300 transition-colors">
          <Upload size={15} className="text-blue-400" /> Importa CSV
        </button>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors">
          <Plus size={15} /> Nuovo contatto
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Caricamento…</div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <Users size={36} />
            <p className="text-sm">Nessun contatto trovato</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                <Plus size={12} /> Aggiungi manualmente
              </button>
              <button onClick={() => setShowCsv(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">
                <Upload size={12} /> Importa CSV
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#252a3a]">
                {['Nome','Azienda','Telefono','Tag','Ultima chiamata',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => {
                const isActive = activeCall?.contactId === c.id &&
                  ['dialing','ringing','answered','voicebot_active'].includes(activeCall.status);
                return (
                  <tr key={c.id}
                    className="border-b border-[#252a3a]/50 hover:bg-white/[0.02] transition-colors row-in group"
                    style={{ animationDelay: `${i * 30}ms`, background: isActive ? '#3b82f608' : '' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                             style={{ background: '#3b82f620', color: '#60a5fa' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-600" />
                        {c.company ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">{c.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">{c.tags.map(t => <TagPill key={t} tag={t} />)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.lastCalled)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isActive ? <StatusBadge status={activeCall!.status} /> : (
                          <button onClick={() => handleCall(c)} disabled={!!calling || !!activeCall}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed">
                            {calling === c.id
                              ? <><RefreshCw size={12} className="animate-spin" /> Avvio…</>
                              : <><Phone size={12} /> Chiama</>}
                          </button>
                        )}
                        <button onClick={() => handleDelete(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {contacts.length > 0 && (
        <p className="text-xs text-gray-600 text-right">
          {contacts.length} contatt{contacts.length === 1 ? 'o' : 'i'}
          {tagFilter && ` con tag "${tagFilter}"`}
          {search && ` — ricerca "${search}"`}
        </p>
      )}
    </div>
  );
}

// ─── Call Detail Modal ────────────────────────────────────────
function CallDetailModal({ call, onClose }: { call: CallRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg mx-4 p-6 space-y-5 animate-slide_in" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-lg">{call.contactName}</p>
            <p className="text-sm text-gray-500">{call.contactCompany}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Telefono', call.contactPhone],
            ['Stato', <StatusBadge key="s" status={call.status} />],
            ['Avviata', formatDate(call.startedAt)],
            ['Risposta', formatDate(call.answeredAt)],
            ['Fine', formatDate(call.endedAt)],
            ['Durata', formatDuration(call.durationSeconds)],
            ['Score', call.overallScore != null ? `${call.overallScore}/10` : '—'],
            ['Esito', call.outcome ?? '—'],
          ].map(([k, v]) => (
            <div key={String(k)} className="space-y-0.5">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{k}</p>
              <p className="text-gray-200">{v}</p>
            </div>
          ))}
        </div>
        {call.surveyAnswers && call.surveyAnswers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Risposte Survey</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {call.surveyAnswers.map((a, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: '#ffffff08' }}>
                  <p className="text-xs text-gray-400">{a.question}</p>
                  <p className="text-sm font-medium mt-0.5">{a.answer}</p>
                  {a.score != null && <p className="text-xs text-blue-400 mt-0.5 flex items-center gap-1"><Star size={10} /> {a.score}/10</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: STORICO ─────────────────────────────────────────────
function HistoryTab() {
  const [calls, setCalls]       = useState<CallRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<CallRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/calls'); const { data } = await r.json(); setCalls(data ?? []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {selected && <CallDetailModal call={selected} onClose={() => setSelected(null)} />}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400">{calls.length} chiamate registrate</h2>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw size={12} /> Aggiorna
        </button>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Caricamento…</div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500">
            <History size={32} /><p className="text-sm">Nessuna chiamata ancora</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#252a3a]">
                {['Contatto','Stato','Avviata','Durata','Score','Esito',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((c, i) => (
                <tr key={c.id}
                  className="border-b border-[#252a3a]/50 hover:bg-white/[0.02] transition-colors cursor-pointer row-in"
                  style={{ animationDelay: `${i * 20}ms` }} onClick={() => setSelected(c)}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.contactName}</p>
                    <p className="text-xs text-gray-500">{c.contactPhone}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(c.startedAt)}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{formatDuration(c.durationSeconds)}</td>
                  <td className="px-4 py-3">
                    {c.overallScore != null ? <span className="text-yellow-400 font-semibold">{c.overallScore}/10</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{c.outcome ?? '—'}</td>
                  <td className="px-4 py-3"><ChevronRight size={16} className="text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Tab: REPORT ──────────────────────────────────────────────
const PIE_COLORS = ['#22c55e','#6b7280','#ef4444','#f59e0b','#a78bfa'];

function ReportsTab() {
  const [stats, setStats]     = useState<Record<string, number | null>>({});
  const [calls, setCalls]     = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/calls?stats=1').then(r => r.json()), fetch('/api/calls').then(r => r.json())])
      .then(([s, c]) => { setStats(s.data ?? {}); setCalls(c.data ?? []); setLoading(false); });
  }, []);

  const pieData = [
    { name: 'Completata',  value: (stats.completed as number) ?? 0 },
    { name: 'No risposta', value: (stats.noAnswer  as number) ?? 0 },
    { name: 'Fallita',     value: (stats.failed    as number) ?? 0 },
    { name: 'Occupato',    value: (stats.busy      as number) ?? 0 },
  ].filter(d => d.value > 0);

  const scoreData = calls.filter(c => c.overallScore != null).slice(0, 15)
    .map(c => ({ name: c.contactName.split(' ')[0], score: c.overallScore })).reverse();

  const kpis = [
    { label: 'Totale chiamate', value: stats.total ?? 0,           icon: Phone,       color: '#3b82f6' },
    { label: 'Tasso risposta',  value: `${stats.answerRate ?? 0}%`, icon: TrendingUp,  color: '#22c55e' },
    { label: 'Completate',      value: stats.completed ?? 0,        icon: CheckCircle2,color: '#22c55e' },
    { label: 'Score medio',     value: stats.avgScore ?? '—',       icon: Star,        color: '#f59e0b' },
    { label: 'Durata media',    value: formatDuration((stats.avgDuration as number) ?? undefined), icon: Clock, color: '#a78bfa' },
    { label: 'No risposta',     value: stats.noAnswer ?? 0,         icon: PhoneMissed, color: '#6b7280' },
  ];

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-500 text-sm">Caricamento…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-300">Distribuzione esiti</p>
          {pieData.length === 0 ? <p className="text-gray-500 text-sm py-8 text-center">Nessun dato ancora</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`}
                     labelLine={false} fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#181c27', border: '1px solid #252a3a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-300">Score per chiamata (ultimi 15)</p>
          {scoreData.length === 0 ? <p className="text-gray-500 text-sm py-8 text-center">Nessun score disponibile</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} />
                <Tooltip contentStyle={{ background: '#181c27', border: '1px solid #252a3a', borderRadius: 8 }} />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────
type Tab = 'dialer' | 'history' | 'reports';
const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'dialer',  label: 'Dialer',  Icon: Phone     },
  { id: 'history', label: 'Storico', Icon: History   },
  { id: 'reports', label: 'Report',  Icon: BarChart3 },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>('dialer');
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[#252a3a] px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Voicemail size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-base leading-none">Wildix VoiceBot</p>
            <p className="text-xs text-gray-500 leading-none mt-0.5">Outbound Dialer</p>
          </div>
        </div>
        <nav className="flex gap-1 ml-6">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? 'bg-blue-500/20 text-blue-300' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </nav>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                style={{ background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e25' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Wildix connesso
          </span>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {tab === 'dialer'  && <DialerTab  />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
}
