import api from './api';
import { DrawingDataJSON } from '../utils/dataExport';
import { API_ENDPOINTS, DrawingModelKey } from '../constants/api';

export interface DrawingPredictionRequest {
  user_id: string;
  session_id?: string;
  spiral_data?: DrawingDataJSON;
  wave_data?: DrawingDataJSON;
  pixel_ratio?: number;
  mc_dropout?: boolean;
}

export interface DrawingPredictionResponse {
  prediction: any;
  save_result: any;
}

function buildHeaders(firebaseToken?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (firebaseToken) headers['Authorization'] = `Bearer ${firebaseToken}`;
  return headers;
}

/**
 * Send drawing data to the specified model endpoint.
 * Single unified function — the modelKey selects the backend endpoint.
 */
export const analyzeDrawing = async (
  modelKey: DrawingModelKey,
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string,
  pixelRatio?: number,
  sessionId?: string,
  mcDropout?: boolean,
): Promise<DrawingPredictionResponse> => {
  const endpoint = API_ENDPOINTS.DRAWING_ANALYSIS[modelKey];
  const body: DrawingPredictionRequest = {
    user_id: userId,
    session_id: sessionId,
    spiral_data: spiralData,
    wave_data: waveData,
    pixel_ratio: pixelRatio,
    mc_dropout: mcDropout,
  };
  console.log(`[Drawing] POST ${endpoint}`, { modelKey, points: spiralData?.points?.length });
  const response = await api.post<DrawingPredictionResponse>(endpoint, body, {
    headers: buildHeaders(firebaseToken),
  });
  console.log(`[Drawing] Response from ${modelKey}:`, response.data?.prediction?.risk_percentage);
  return response.data;
};

// ── Legacy named exports (kept so existing callers don't break) ───────────────

export const analyzeDrawingPrediction = (
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string,
  pixelRatio?: number,
  sessionId?: string,
) =>
  analyzeDrawing('ANALYZE_LOCAL', userId, spiralData, waveData, firebaseToken, pixelRatio, sessionId);

export const analyzeDrawingQuadstream = (
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string,
  pixelRatio?: number,
  sessionId?: string,
) =>
  analyzeDrawing('ANALYZE_QUADSTREAM_V2', userId, spiralData, waveData, firebaseToken, pixelRatio, sessionId);
