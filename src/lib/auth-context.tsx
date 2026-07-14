'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Auth context — wraps Firebase Authentication state in a React context so
// any client component can access the current user and profile without prop
// drilling or direct Firebase SDK calls.
//
// Exported:
//   AuthProvider  — place at the top of the component tree (in layout.tsx).
//   useAuth()     — hook that returns { user, profile, loading, refreshProfile }.
//
// Loading semantics:
//   `loading` is `true` from mount until BOTH the Firebase auth state AND the
//   Firestore profile have resolved. Consumers that guard routes (e.g. the
//   dashboard) must wait for `loading === false` before checking whether a
//   profile exists to avoid false "onboarding required" flashes.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile } from './firestore';
import { UserProfile } from '@/types';

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextType {
  /** The Firebase Auth user object, or null when signed out. */
  user: User | null;
  /** The Firestore user profile document, or null when not yet loaded / not created. */
  profile: UserProfile | null;
  /** True until both auth state and profile fetch have settled. */
  loading: boolean;
  /** Manually re-fetch the Firestore profile (e.g. after saving onboarding data). */
  refreshProfile: () => Promise<void>;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      // Reset loading on every auth change so consumers (e.g. the dashboard's
      // onboarding guard) never evaluate during the profile-fetch gap, where
      // `user` is set but `profile` hasn't resolved yet.
      setLoading(true);
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume auth state in any client component. */
export const useAuth = () => useContext(AuthContext);
