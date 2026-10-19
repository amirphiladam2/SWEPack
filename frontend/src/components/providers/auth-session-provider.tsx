"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, fetchCurrentUser } from "@/lib/api";
import type { UserProfile } from "@/types/backend";

type AuthSession = {
  user: UserProfile | null;
  isReady: boolean;
  error: string | null;
  refresh: () => Promise<UserProfile | null>;
  clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSession>({
  user: null,
  isReady: false,
  error: null,
  refresh: async () => null,
  clearSession: () => undefined,
});

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch (requestError) {
      setUser(null);
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError(null);
      } else {
        setError("Your sign-in status could not be checked. Please try again.");
      }
      return null;
    } finally {
      setIsReady(true);
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setError(null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    window.localStorage.removeItem("swepack-access-token");
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    const handleSessionExpired = () => clearSession();
    window.addEventListener("swepack-auth-expired", handleSessionExpired);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("swepack-auth-expired", handleSessionExpired);
    };
  }, [clearSession, refresh]);

  return (
    <AuthSessionContext.Provider
      value={{ user, isReady, error, refresh, clearSession }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
