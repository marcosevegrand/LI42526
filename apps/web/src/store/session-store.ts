import { create } from 'zustand';

type SessionStore = {
  isAuthenticated: boolean;
  role: 'manager' | 'mechanic' | null;
  setSession: (role: SessionStore['role']) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  isAuthenticated: true,
  role: 'manager',
  setSession: (role) => set({ isAuthenticated: true, role }),
  clearSession: () => set({ isAuthenticated: false, role: null }),
}));
