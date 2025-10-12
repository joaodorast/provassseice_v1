import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { MainDashboard } from './components/MainDashboard';
import { LoadingProvider } from './components/LoadingProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase-client';

export type User = {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
};

export type Question = {
  question: string;
  questionType?: 'multiple-choice' | 'essay'; // 'multiple-choice' por padrão
  options?: string[]; // Opcional para questões dissertativas
  correctAnswer?: number; // Opcional para questões dissertativas
  explanation?: string;
  essayAnswer?: string; // Para armazenar respostas dissertativas
  weight?: number; // Peso da questão para cálculo da nota (padrão 1.0)
};

export type Exam = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimit: number;
  subject: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
};

export type Submission = {
  id: string;
  examId: string;
  userId: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  totalWeight?: number;
  percentage: number;
  results: any[];
  submittedAt: string;
  examTitle: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
        setUser(session.user as User);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('access_token');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    const authTimeout = setTimeout(() => {
      console.warn('Auth initialization taking too long, proceeding...');
      setLoading(false);
    }, 5000); // 5 second timeout for auth
    
    try {
      setLoading(true);
      console.log('Initializing authentication...');
      
      // Check for existing token in localStorage
      const existingToken = localStorage.getItem('access_token');
      
      // Check current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        )
      ]);
      
      if (error) {
        console.error('Error getting session:', error);
        localStorage.removeItem('access_token');
        setLoading(false);
        clearTimeout(authTimeout);
        return;
      }

      if (session?.user && session?.access_token) {
        // Valid session found
        localStorage.setItem('access_token', session.access_token);
        setUser(session.user as User);
        console.log('Auto-login successful:', session.user.email);
      } else if (existingToken) {
        // Token exists but no valid session - try to refresh
        console.log('Attempting to refresh session...');
        const refreshPromise = supabase.auth.refreshSession();
        const { data: { session: refreshedSession }, error: refreshError } = await Promise.race([
          refreshPromise,
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Refresh timeout')), 3000)
          )
        ]);
        
        if (refreshedSession?.user && refreshedSession?.access_token) {
          localStorage.setItem('access_token', refreshedSession.access_token);
          setUser(refreshedSession.user as User);
          console.log('Session refreshed successfully:', refreshedSession.user.email);
        } else {
          console.log('Session refresh failed:', refreshError);
          localStorage.removeItem('access_token');
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      if (error.message === 'Session check timeout' || error.message === 'Refresh timeout') {
        console.warn('Authentication timed out, proceeding without login');
      }
      localStorage.removeItem('access_token');
    } finally {
      clearTimeout(authTimeout);
      setLoading(false);
    }
  };

  const handleLogin = async (user: User) => {
    setUser(user);
    console.log('User logged in:', user.email);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      localStorage.removeItem('access_token');
      setUser(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="seice-gradient w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Sistema SEICE</h2>
          <p className="text-sm text-slate-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LoadingProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </LoadingProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <div className="min-h-screen bg-background">
          <MainDashboard 
            user={user} 
            onLogout={handleLogout}
          />
        </div>
        <Toaster />
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default App;