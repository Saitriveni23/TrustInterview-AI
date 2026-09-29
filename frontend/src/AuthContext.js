import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: "" });

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      sessionStorage.clear();
      setState({ loading: false, user: null, profile: null, error: "" });
      return;
    }
    try {
      const token = await firebaseUser.getIdToken(true);
      const response = await window.fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "This account is not authorized.");
      const profile = data.user;
      sessionStorage.setItem("ztaToken", token);
      sessionStorage.setItem("candidateEmail", profile.email);
      sessionStorage.setItem("candidateName", profile.name);
      sessionStorage.setItem("ztaRole", profile.role === "recruiter" ? "admin" : "candidate");
      if (profile.companyId) sessionStorage.setItem("recruiterCompanyId", profile.companyId);
      setState({ loading: false, user: firebaseUser, profile, error: "" });
    } catch (error) {
      await signOut(auth);
      setState({ loading: false, user: null, profile: null, error: error.message });
    }
  }), []);

  const value = useMemo(() => ({
    ...state,
    async login() {
      setState((current) => ({ ...current, error: "" }));
      return signInWithPopup(auth, googleProvider);
    },
    async logout() {
      sessionStorage.clear();
      await signOut(auth);
    },
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
