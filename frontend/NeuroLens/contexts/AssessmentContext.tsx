import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface AssessmentState {
    wearable: boolean;
    voice: boolean;
    drawing: boolean;
    cognitive: boolean;
}

interface AssessmentContextType {
    state: AssessmentState;
    markTaskComplete: (taskName: keyof AssessmentState) => Promise<void>;
    resetProgress: () => Promise<void>;
    completedCount: number;
}

const defaultState: AssessmentState = {
    wearable: false,
    voice: false,
    drawing: false,
    cognitive: false,
};

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AssessmentState>(defaultState);

    useEffect(() => {
        // State is now strictly memory-based and resets with the app session
    }, []);

    const markTaskComplete = useCallback(async (taskName: keyof AssessmentState) => {
        setState((prevState) => {
            if (prevState[taskName]) return prevState; // Skip update if already completed

            const newState = { ...prevState, [taskName]: true };
            return newState;
        });
    }, []);

    const resetProgress = useCallback(async () => {
        setState(defaultState);
    }, []);

    const completedCount = useMemo(() => Object.values(state).filter(Boolean).length, [state]);

    const contextValue = useMemo(() => ({
        state, markTaskComplete, resetProgress, completedCount
    }), [state, markTaskComplete, resetProgress, completedCount]);

    return (
        <AssessmentContext.Provider value={contextValue}>
            {children}
        </AssessmentContext.Provider>
    );
}

export function useAssessment() {
    const context = useContext(AssessmentContext);
    if (context === undefined) {
        throw new Error('useAssessment must be used within an AssessmentProvider');
    }
    return context;
}
