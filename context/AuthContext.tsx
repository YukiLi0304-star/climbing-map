import { getFirebaseAuth } from '@/lib/firebase';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

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
      
      // 转换错误信息
      let message = 'Sign in failed';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        default:
          message = error.message || 'Sign in failed';
      }
      
      Alert.alert('Error', message);
      return null;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const auth = await getFirebaseAuth();
      const result = await auth.createUserWithEmailAndPassword(email, password);
      console.log('Sign up successful:', result.user?.email);
      return result.user;
    } catch (error: any) {
      
      // 转换错误信息
      let message = 'Sign up failed';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/email-already-in-use':
          message = 'Email already registered';
          break;
        case 'auth/weak-password':
          message = 'Password must be at least 6 characters';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        default:
          message = error.message || 'Sign up failed';
      }
      
      Alert.alert('Error', message);
      return null;  // 返回 null 表示失败，不往外抛错误
    }
  };

  const logout = async () => {
    try {
      const auth = await getFirebaseAuth();
      await auth.signOut();
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Failed to sign out');
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