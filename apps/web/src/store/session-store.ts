import { create } from 'zustand';

import type { SessionUser } from '@/lib/auth/session-api';

type SessionStore = {
  isAuthenticated: boolean;
  user: SessionUser | null;
  setSession: (user: SessionUser) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  isAuthenticated: false,
  user: null,
  setSession: (user) => set({ isAuthenticated: true, user }),
  clearSession: () => set({ isAuthenticated: false, user: null }),
}));
