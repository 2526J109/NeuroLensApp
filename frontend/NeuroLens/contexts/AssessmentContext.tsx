import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type AssessmentTask = 'wearable' | 'voice' | 'drawing' | 'cognitive';

interface AssessmentContextType {
    completedTasks: AssessmentTask[];
    sessionId: string | null;
    startNewSession: () => void;
    markTaskComplete: (task: AssessmentTask) => void;
    isSessionComplete: boolean;
    resetSession: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [completedTasks, setCompletedTasks] = useState<AssessmentTask[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const generateSessionId = () => {
        // Simple unique ID generator since uuid package is not currently available
        return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    };

    const startNewSession = () => {
        setCompletedTasks([]);
        setSessionId(generateSessionId());
    };

    const resetSession = () => {
        setCompletedTasks([]);
        setSessionId(null);
    };

    const markTaskComplete = (task: AssessmentTask) => {
        setCompletedTasks(prev => {
            if (prev.includes(task)) return prev;
            return [...prev, task];
        });
    };

    const isSessionComplete = completedTasks.length === 4;

    // Auto-start a session if none exists
    useEffect(() => {
        if (!sessionId) {
            setSessionId(generateSessionId());
        }
    }, []);

    return (
        <AssessmentContext.Provider value={{
            completedTasks,
            sessionId,
            startNewSession,
            markTaskComplete,
            isSessionComplete,
            resetSession
        }}>
            {children}
        </AssessmentContext.Provider>
    );
};

export const useAssessment = () => {
    const context = useContext(AssessmentContext);
    if (!context) {
        throw new Error('useAssessment must be used within an AssessmentProvider');
    }
    return context;
};
