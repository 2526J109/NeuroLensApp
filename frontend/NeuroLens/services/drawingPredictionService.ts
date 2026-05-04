import api from './api';
import { DrawingDataJSON } from '../utils/dataExport';

export interface DrawingPredictionRequest {
  user_id: string;
  session_id?: string;
  spiral_data?: DrawingDataJSON;
  wave_data?: DrawingDataJSON;
  pixel_ratio?: number;
}

export interface NormQuadStreamPrediction {
  risk_percentage: number;
  risk_level: 'Low' | 'Moderate' | 'High';
  label: string;
  confidence: number;
  uncertainty_pct: number;
  borderline: boolean;
  source: string;
  nqs_features?: Record<string, number>;
  message?: string;
}

export interface DrawingPredictionResponse {
  prediction: NormQuadStreamPrediction;
  save_result: any;
}


export const analyzeDrawingPrediction = async (
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string,
  pixelRatio?: number,
  sessionId?: string,
  endpoint?: string
): Promise<DrawingPredictionResponse> => {
  const requestData: DrawingPredictionRequest = {
    user_id: userId,
    session_id: sessionId,
    spiral_data: spiralData,
    wave_data: waveData,
    pixel_ratio: pixelRatio,
  };

  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (firebaseToken) {
    headers['Authorization'] = `Bearer ${firebaseToken}`;
  }

  console.log('Sending drawing prediction request:', requestData);
  console.log('With headers:', headers);

  const url = endpoint ?? '/api/drawing-prediction/analyze-normquadstream';
  const response = await api.post<DrawingPredictionResponse>(
    url,
    requestData,
    { headers }
  );

  console.log('Received drawing prediction response:', response.data);
  return response.data;
};
