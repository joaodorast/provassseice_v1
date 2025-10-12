import React, { createContext, useContext, useState, useCallback } from 'react';

type LoadingContextType = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingStates: { [key: string]: boolean };
  setLoadingState: (key: string, loading: boolean) => void;
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  const setLoadingState = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => {
      const newStates = { ...prev };
      if (isLoading) {
        newStates[key] = true;
      } else {
        delete newStates[key];
      }
      return newStates;
    });
    
    // Update global loading state
    setLoading(Object.keys(loadingStates).length > 0 || isLoading);
  }, [loadingStates]);

  const withLoading = useCallback(async <T,>(key: string, asyncFn: () => Promise<T>): Promise<T> => {
    try {
      setLoadingState(key, true);
      const result = await asyncFn();
      return result;
    } finally {
      setLoadingState(key, false);
    }
  }, [setLoadingState]);

  return (
    <LoadingContext.Provider value={{
      loading,
      setLoading,
      loadingStates,
      setLoadingState,
      withLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export function useLoadingState(key: string) {
  const { loadingStates, setLoadingState, withLoading } = useLoading();
  
  return {
    loading: loadingStates[key] || false,
    setLoading: (loading: boolean) => setLoadingState(key, loading),
    withLoading: <T,>(asyncFn: () => Promise<T>) => withLoading(key, asyncFn)
  };
}