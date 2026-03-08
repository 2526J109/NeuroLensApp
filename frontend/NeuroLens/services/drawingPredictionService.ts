import api from './api';
import { DrawingDataJSON } from '../utils/dataExport';

export interface DrawingPredictionRequest {
  user_id: string;
  spiral_data?: DrawingDataJSON;
  wave_data?: DrawingDataJSON;
}

export interface DrawingPredictionResponse {
  prediction: any;
  save_result: any;
}


export const analyzeDrawingPrediction = async (
  userId: string,
  spiralData?: DrawingDataJSON,
  waveData?: DrawingDataJSON,
  firebaseToken?: string
): Promise<DrawingPredictionResponse> => {
  const requestData: DrawingPredictionRequest = {
    user_id: userId,
    spiral_data: spiralData,
    wave_data: waveData,
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
