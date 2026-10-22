import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

function firebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value)) {
    throw new Error("Firebase authentication is not configured.");
  }
  return config;
}

export function getFirebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig());
  return getAuth(app);
}

export function getInitializedFirebaseAuth() {
  const app = getApps()[0];
  return app ? getAuth(app) : null;
}
