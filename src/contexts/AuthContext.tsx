import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

interface AuthContextType {
  user: any;
  session: any;
  profile: any;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string, country?: string, dateOfBirth?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthHook();

  return (
    <AuthContext.Provider value={auth}>
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
