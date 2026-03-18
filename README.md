[README.md](https://github.com/user-attachments/files/26088758/README.md)
# 🎙️ Wildix VoiceBot Dialer

Applicazione Next.js per gestire chiamate outbound tramite **Wildix Collaboration API** con integrazione voicebot (Vapi.ai o IVR interno Wildix).

---

## 🏗️ Architettura

```
Browser (Next.js UI)
    │
    ├─ POST /api/make-call        → avvia chiamata Wildix outbound
    ├─ GET  /api/calls            → storico + stats
    ├─ GET/POST/PUT/DELETE /api/contacts
    │
    ├─ POST /api/wildix-webhook   ← eventi PBX (answered, ended, failed)
    └─ POST /api/voicebot-webhook ← risultati survey da Vapi.ai
```

### Flusso chiamata (modalità Wildix IVR)

```
1. Operatore clicca "Chiama" 
2. POST /api/make-call → Wildix fa squillare l'interno operatore (es. 100)
3. Operatore risponde → Wildix fa squillare il destinatario
4. Destinatario risponde → webhook call.answered
5. App trasferisce la chiamata all'interno IVR voicebot (es. 8001)
6. Voicebot gestisce la conversazione
7. Fine chiamata → webhook call.ended
```

### Flusso chiamata (modalità Vapi.ai outbound)

```
1. Operatore clicca "Chiama"
2. POST /api/make-call → Vapi fa la chiamata outbound in autonomia
3. Destinatario risponde → Vapi gestisce la conversazione
4. Fine → webhook voicebot-webhook con risultati survey
```

---

## 🚀 Deploy su Vercel

### 1. Clona e installa

```bash
cd wildix-voicebot-dialer
npm install
npm run build   # verifica che compili correttamente
```

### 2. Crea repo GitHub e pusha

```bash
git init
git add .
git commit -m "feat: Wildix VoiceBot Dialer"

# Crea repo su github.com, poi:
git remote add origin https://github.com/TUO-USERNAME/wildix-voicebot-dialer.git
git branch -M main
git push -u origin main
```

### 3. Importa su Vercel

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Importa il repository GitHub
3. Framework: **Next.js** (rilevato automaticamente)
4. Clicca **Deploy**

### 4. Variabili d'ambiente su Vercel

Vai su **Project → Settings → Environment Variables** e aggiungi:

| Variabile | Valore | Note |
|-----------|--------|------|
| `WILDIX_PBX_HOST` | `pbx.tuaazienda.com` | senza `https://` |
| `WILDIX_USERNAME` | `apiuser` | utente dedicato |
| `WILDIX_PASSWORD` | `password` | o usa API Key |
| `WILDIX_API_KEY` | _(opzionale)_ | se Wildix >= 6.x |
| `WILDIX_CALLER_EXTENSION` | `100` | interno operatore |
| `WILDIX_CALLER_ID` | `+390000000000` | CallerID esterno |
| `WILDIX_VOICEBOT_EXTENSION` | `8001` | interno IVR voicebot |
| `NEXT_PUBLIC_APP_URL` | `https://tua-app.vercel.app` | URL pubblico |
| `WEBHOOK_SECRET` | _(stringa random)_ | per sicurezza webhook |
| `VOICEBOT_PROVIDER` | `wildix_ivr` | o `vapi` |
| `VAPI_API_KEY` | _(quando disponibile)_ | |
| `VAPI_PHONE_NUMBER_ID` | _(quando disponibile)_ | |
| `VAPI_ASSISTANT_ID` | _(quando disponibile)_ | |

---

## ⚙️ Configurazione Wildix

### Webhook PBX

Nel pannello admin Wildix:
```
Settings → Integrations → Webhooks → Add

URL:    https://tua-app.vercel.app/api/wildix-webhook
Method: POST
Events: call.answered, call.ended, call.failed
```

### Interno voicebot (IVR interno)

Crea un interno IVR in Wildix che gestisce la conversazione voicebot:
- Numero interno: `8001` (o quello che preferisci, allinea con `WILDIX_VOICEBOT_EXTENSION`)
- Il sistema trasferirà automaticamente le chiamate risposte a questo interno

### Permessi utente API

L'utente Wildix usato per le API deve avere:
- ✅ Permesso di effettuare chiamate outbound
- ✅ Permesso di trasferire chiamate
- ✅ Accesso alla Collaboration API

---

## 🔌 Configurazione Vapi.ai (quando ottieni le credenziali)

1. Crea account su [vapi.ai](https://vapi.ai)
2. **Phone Numbers** → Add → acquista o porta un numero
3. **Assistants** → Create → configura il tuo voicebot con:
   - Script di conversazione
   - Domande survey
   - Webhook URL: `https://tua-app.vercel.app/api/voicebot-webhook`
4. Copia:
   - `VAPI_API_KEY` da Account → API Keys
   - `VAPI_PHONE_NUMBER_ID` da Phone Numbers → il tuo numero → ID
   - `VAPI_ASSISTANT_ID` da Assistants → il tuo assistant → ID
5. Imposta `VOICEBOT_PROVIDER=vapi` nelle variabili Vercel
6. Redeploy

### Payload webhook Vapi → app

Vapi invierà POST a `/api/voicebot-webhook` con:

```json
{
  "event": "session.ended",
  "sessionId": "vapi-session-id",
  "timestamp": "2025-01-15T10:30:00Z",
  "score": 8.5,
  "outcome": "interested",
  "answers": [
    { "question": "Sei interessato al prodotto?", "answer": "Sì", "score": 9 },
    { "question": "Vuoi essere ricontattato?",    "answer": "Sì", "score": 8 }
  ]
}
```

---

## 📁 Struttura progetto

```
wildix-voicebot-dialer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── make-call/route.ts       # Avvia chiamata Wildix/Vapi
│   │   │   ├── wildix-webhook/route.ts  # Riceve eventi PBX
│   │   │   ├── voicebot-webhook/route.ts# Riceve risultati survey
│   │   │   ├── calls/route.ts           # CRUD storico chiamate
│   │   │   └── contacts/route.ts        # CRUD rubrica contatti
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                     # UI: Dialer / Storico / Report
│   ├── lib/
│   │   ├── store.ts      # In-memory store (sostituibile con DB)
│   │   ├── wildix.ts     # Client Wildix Collaboration API
│   │   └── voicebot.ts   # Client Vapi.ai
│   └── types/
│       └── index.ts      # TypeScript types
├── .env.local.example
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🗄️ Passare a un database reale

Lo store in-memory (`src/lib/store.ts`) si azzera ad ogni cold-start su Vercel.
Per produzione, sostituisci con **Supabase** (gratuito):

```bash
npm install @supabase/supabase-js
```

```sql
-- Esegui in Supabase SQL Editor
create table contacts (
  id text primary key,
  name text not null,
  phone text not null,
  company text,
  tags text[] default '{}',
  notes text,
  last_called timestamptz
);

create table calls (
  id text primary key,
  contact_id text references contacts(id),
  contact_name text,
  contact_phone text,
  contact_company text,
  status text not null,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  wildix_call_id text,
  voicebot_session_id text,
  survey_answers jsonb,
  overall_score numeric,
  outcome text,
  notes text
);
```

Poi imposta `SUPABASE_URL` e `SUPABASE_ANON_KEY` nelle variabili Vercel.

---

## 🧪 Test in locale

```bash
# Copia env di esempio
cp .env.local.example .env.local
# Compila i valori nel .env.local

# Avvia
npm run dev
# → http://localhost:3000
```

Per testare i webhook in locale usa [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# Usa l'URL ngrok come base per i webhook Wildix e Vapi
```

---

## 📞 Supporto

Problemi con la Collaboration API Wildix? Consulta:
- [Wildix Developer Docs](https://docs.wildix.com)
- [Wildix Collaboration API Reference](https://docs.wildix.com/collaboration-api)
