import api from './api';
import { API_BASE_URL } from '../constants/api';
import { Participant } from '../contexts/DataCollectionContext';
import { DrawingDataJSON } from '../utils/dataExport';

const BASE = `${API_BASE_URL}/api/admin`;

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Admin check ──────────────────────────────────────────────────────────────

export const checkAdmin = async (token: string): Promise<boolean> => {
  try {
    await api.get(`${BASE}/check`, { headers: authHeader(token) });
    return true;
  } catch {
    return false;
  }
};

// ── Participants ─────────────────────────────────────────────────────────────

export interface ParticipantCreate {
  participant_code: string;
  age: number;
  gender: string;
  handedness: string;
  pd_status: string;
  updrs_score?: number;
  years_since_diagnosis?: number;
  medication_status?: string;
  notes?: string;
}

export const createParticipant = async (
  token: string,
  data: ParticipantCreate,
): Promise<Participant> => {
  const res = await api.post<Participant>(`${BASE}/participants`, data, {
    headers: authHeader(token),
  });
  return res.data;
};

export const listParticipants = async (token: string): Promise<Participant[]> => {
  const res = await api.get<Participant[]>(`${BASE}/participants`, {
    headers: authHeader(token),
  });
  return res.data;
};

export const getParticipant = async (token: string, id: string): Promise<Participant> => {
  const res = await api.get<Participant>(`${BASE}/participants/${id}`, {
    headers: authHeader(token),
  });
  return res.data;
};

// ── Raw data saves ───────────────────────────────────────────────────────────

export const saveRawDrawing = async (
  token: string,
  participantId: string,
  payload: {
    session_id?: string;
    spiral_points?: any[];
    wave_points?: any[];
    pixel_ratio?: number;
    model_key?: string;
    prediction_result?: any;
  },
) => {
  const res = await api.post(
    `${BASE}/participants/${participantId}/drawing`,
    { participant_id: participantId, ...payload },
    { headers: authHeader(token) },
  );
  return res.data;
};

export const saveRawCognitive = async (
  token: string,
  participantId: string,
  payload: {
    session_id?: string;
    age: number;
    sdmt_score: number;
    tmt_a_score: number;
    lns_score: number;
    sex?: number;
    family_history?: number;
    rem_sleep?: number;
    prediction_result?: any;
  },
) => {
  const res = await api.post(
    `${BASE}/participants/${participantId}/cognitive`,
    { participant_id: participantId, ...payload },
    { headers: authHeader(token) },
  );
  return res.data;
};

export const saveRawVoice = async (
  token: string,
  participantId: string,
  payload: { session_id?: string; features?: any; prediction_result?: any },
) => {
  const res = await api.post(
    `${BASE}/participants/${participantId}/voice`,
    { participant_id: participantId, ...payload },
    { headers: authHeader(token) },
  );
  return res.data;
};

export const saveRawWearable = async (
  token: string,
  participantId: string,
  payload: { session_id?: string; sensor_readings?: any; prediction_result?: any },
) => {
  const res = await api.post(
    `${BASE}/participants/${participantId}/wearable`,
    { participant_id: participantId, ...payload },
    { headers: authHeader(token) },
  );
  return res.data;
};
