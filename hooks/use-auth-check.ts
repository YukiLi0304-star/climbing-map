import { useState } from 'react';
import { getFirebaseAuth } from '../lib/firebase';

export const useAuthCheck = () => {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const checkAuth = async (): Promise<boolean> => {
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  };

  const closePrompt = () => setShowLoginPrompt(false);

  return { checkAuth, showLoginPrompt, closePrompt };
};