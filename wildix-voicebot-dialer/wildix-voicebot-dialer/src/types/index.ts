// ─── Contact ─────────────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  phone: string;         // formato E.164: +39…
  company?: string;
  tags: string[];
  notes?: string;
  lastCalled?: string;   // ISO date
}

// ─── Call ────────────────────────────────────────────────────
export type CallStatus =
  | 'idle'
  | 'dialing'        // PBX sta facendo squillare l'interno operatore
  | 'ringing'        // destinatario sta squillando
  | 'answered'       // destinatario ha risposto
  | 'voicebot_active'// chiamata trasferita al voicebot
  | 'completed'      // chiamata terminata con successo
  | 'no_answer'
  | 'busy'
  | 'failed'
  | 'cancelled';

export interface SurveyAnswer {
  question: string;
  answer: string;
  score?: number;
}

export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactCompany?: string;
  status: CallStatus;
  startedAt: string;   // ISO
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  wildixCallId?: string;
  voicebotSessionId?: string;
  surveyAnswers?: SurveyAnswer[];
  overallScore?: number;
  outcome?: string;    // es. "interested" | "not_interested" | "callback" | "dnc"
  notes?: string;
}

// ─── Wildix API types ─────────────────────────────────────────
export interface WildixCallRequest {
  callee: string;      // numero da chiamare
  caller: string;      // interno operatore
  callerId?: string;   // CallerID mostrato al destinatario
}

export interface WildixCallResponse {
  callId: string;
  status: string;
}

// ─── Webhook payloads ────────────────────────────────────────
export interface WildixWebhookPayload {
  event: 'call.answered' | 'call.ended' | 'call.failed';
  callId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface VoicebotWebhookPayload {
  sessionId: string;
  callId?: string;
  event: 'session.started' | 'session.ended' | 'survey.completed';
  answers?: SurveyAnswer[];
  score?: number;
  outcome?: string;
  timestamp: string;
}

// ─── API response wrappers ───────────────────────────────────
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: string;
  details?: string;
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
