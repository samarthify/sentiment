import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient.ts'; // Import the initialized client - Added .ts extension

// Define the shape of the context data
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Create the context with a default value (or null)
// Using '!' asserts that the value will be provided, which it will be by the Provider.
const AuthContext = createContext<AuthContextType>(null!);

// Create the Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Initial check done
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (_event !== 'INITIAL_SESSION') {
          // Don't set loading to false again if it's just a refresh or subsequent event
          setLoading(false); 
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    setLoading(true); // Optional: show loading state during sign out
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
    // State will be updated by onAuthStateChange listener
    // No need to manually set user/session to null here
    setLoading(false);
  };


  // Value provided to consuming components
  const value = {
    session,
    user,
    loading,
    signOut,
  };

  // Don't render children until initial auth check is complete
  // Or show a loading indicator if preferred
  // return loading ? <div>Loading...</div> : <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 