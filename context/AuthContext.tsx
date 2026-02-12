import { getFirebaseAuth } from '@/lib/firebase';
import React, { createContext, useContext, useEffect, useState } from 'react';


interface AuthContextType {
  user: any;                    
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isRealFirebase?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRealFirebase, setIsRealFirebase] = useState(false);

  useEffect(() => {
    let unsubscribe: any = null;

    const initAuth = async () => {
      try {
        console.log('Initializing authentication...');
        const auth = await getFirebaseAuth();
        
        
        const isReal = auth && typeof auth.onAuthStateChanged === 'function' && 
                      !auth.signInWithEmailAndPassword.toString().includes('Mock');
        setIsRealFirebase(isReal);
        console.log(isReal ? 'Using REAL Firebase' : 'Using MOCK auth');
        
        
        unsubscribe = auth.onAuthStateChanged((firebaseUser: any) => {
          console.log('Auth state changed:', firebaseUser?.email || 'No user');
          setUser(firebaseUser);
          setLoading(false);
          
          if (firebaseUser) {
            console.log('User logged in, should redirect automatically');
          }
        });
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const auth = await getFirebaseAuth();
      const result = await auth.signInWithEmailAndPassword(email, password);
      console.log('Sign in successful:', result.user?.email);
      return result.user;
    } catch (error: any) {
      console.error('Sign in error:', error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const auth = await getFirebaseAuth();
      const result = await auth.createUserWithEmailAndPassword(email, password);
      console.log('Sign up successful:', result.user?.email);
      return result.user;
    } catch (error: any) {
      console.error('Sign up error:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const auth = await getFirebaseAuth();
      await auth.signOut();
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Logout error:', error.message);
      throw error;
    }
  };

  
  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    isRealFirebase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}