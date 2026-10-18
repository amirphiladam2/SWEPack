"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAccessToken } from "@/lib/api";

type AuthSession = { token: string | null; isReady: boolean };

const AuthSessionContext = createContext<AuthSession>({
  token: null,
  isReady: false,
});

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncToken = () => {
      setToken(getAccessToken());
      setIsReady(true);
    };
    syncToken();
    window.addEventListener("swepack-auth-changed", syncToken);
    return () => window.removeEventListener("swepack-auth-changed", syncToken);
  }, []);

  return (
    <AuthSessionContext.Provider value={{ token, isReady }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
