import api from './api';
import { DrawingDataJSON } from '../utils/dataExport';

export interface DrawingPredictionRequest {
  user_id: string;
  session_id?: string;
  spiral_data?: DrawingDataJSON;
  wave_data?: DrawingDataJSON;
  pixel_ratio?: number;
}

export interface DrawingPredictionResponse {
  prediction: any;
  save_result: any;
}


export const analyzeDrawingQuadstream = async (
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string,
  pixelRatio?: number,
  sessionId?: string
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

  console.log('[QuadStream] Sending drawing prediction request:', requestData);

  const response = await api.post<DrawingPredictionResponse>(
    '/api/drawing-prediction/analyze-quadstream',
    requestData,
    { headers }
  );

  console.log('[QuadStream] Received response:', response.data);
  return response.data;
};

export const analyzeDrawingPrediction = async (
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string,
  pixelRatio?: number,
  sessionId?: string
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

  const response = await api.post<DrawingPredictionResponse>(
    '/api/drawing-prediction/analyze-local',
    requestData,
    { headers }
  );

  console.log('Received drawing prediction response:', response.data);
  return response.data;
};
