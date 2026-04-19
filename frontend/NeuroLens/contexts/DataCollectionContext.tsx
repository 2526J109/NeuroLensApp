import React, { createContext, useState, useContext, ReactNode } from 'react';

export interface Participant {
  id: string;
  participant_code: string;
  age: number;
  gender: string;
  handedness: string;
  pd_status: string;           // "pd" | "control"
  updrs_score?: number;
  years_since_diagnosis?: number;
  medication_status?: string;
  notes?: string;
  tasks_completed: string[];   // ["drawing", "cognitive", "voice", "wearable"]
  created_at: string;
}

interface DataCollectionContextType {
  activeParticipant: Participant | null;
  setActiveParticipant: (p: Participant | null) => void;
  markTaskDone: (task: string) => void;
}

const DataCollectionContext = createContext<DataCollectionContextType | undefined>(undefined);

export const useDataCollection = () => {
  const ctx = useContext(DataCollectionContext);
  if (!ctx) throw new Error('useDataCollection must be used within DataCollectionProvider');
  return ctx;
};

export const DataCollectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeParticipant, setActiveParticipantState] = useState<Participant | null>(null);

  const setActiveParticipant = (p: Participant | null) => setActiveParticipantState(p);

  const markTaskDone = (task: string) => {
    setActiveParticipantState(prev => {
      if (!prev) return prev;
      if (prev.tasks_completed.includes(task)) return prev;
      return { ...prev, tasks_completed: [...prev.tasks_completed, task] };
    });
  };

  return (
    <DataCollectionContext.Provider value={{ activeParticipant, setActiveParticipant, markTaskDone }}>
      {children}
    </DataCollectionContext.Provider>
  );
};
