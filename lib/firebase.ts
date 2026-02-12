const firebaseConfig = {
  apiKey: "AIzaSyD5vkimOdBjI6ucr81Vn7G1tYLOHQiZ1Zs",
  authDomain: "climbingapp-460bc.firebaseapp.com",
  projectId: "climbingapp-460bc",
  storageBucket: "climbingapp-460bc.firebasestorage.app",
  messagingSenderId: "547895468610",
  appId: "1:547895468610:web:0a3c1c8b7d132a968dc3db"
};


let firebaseAuth: any = null;

export const getFirebaseAuth = async (): Promise<any> => {
  if (firebaseAuth) {
    return firebaseAuth;
  }
  
  console.log('Loading Firebase...');
  
  try {
    
    const firebase = await import('firebase/compat/app');
    await import('firebase/compat/auth');
    
    if (!firebase.default.apps.length) {
      firebase.default.initializeApp(firebaseConfig);
      console.log('Firebase initialized (compat mode)');
    }
    
    firebaseAuth = firebase.default.auth();
    console.log('Firebase Auth obtained');
    
    return firebaseAuth;
    
  } catch (error: any) {
    console.error('Firebase compat mode failed:', error.message);
    
    try {
      
      console.log('Trying Firebase Lite...');
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      
      const app = initializeApp(firebaseConfig);
      firebaseAuth = getAuth(app);
      console.log('Firebase Lite initialized');
      
      return firebaseAuth;
      
    } catch (liteError: any) {
      console.error('Firebase Lite also failed:', liteError.message);
      
      
      console.log('Falling back to mock Firebase');
      firebaseAuth = createMockAuth();
      return firebaseAuth;
    }
  }
};

function createMockAuth() {
  console.log('Creating mock Firebase Auth for graduation project');
  
  return {
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      setTimeout(() => callback(null), 100);
      return () => {};
    },
    signInWithEmailAndPassword: async (email: string, password: string) => {
      console.log('Mock sign in:', email);
      const user = {
        uid: `mock_${Date.now()}`,
        email,
        emailVerified: true,
        displayName: email.split('@')[0],
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        }
      };
      return { user };
    },
    createUserWithEmailAndPassword: async (email: string, password: string) => {
      console.log('Mock sign up:', email);
      const user = {
        uid: `mock_${Date.now()}`,
        email,
        emailVerified: false,
        metadata: {
          creationTime: new Date().toISOString(),
        }
      };
      return { user };
    },
    signOut: async () => {
      console.log('Mock sign out');
    }
  };
}