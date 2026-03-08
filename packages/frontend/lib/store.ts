import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  avatar?: string;
  phone?: string;
  isActive: boolean;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-store',
    }
  )
);

export interface DashboardStore {
  selectedClass: string | null;
  selectedStudent: string | null;
  selectedSession: string | null;

  setSelectedClass: (classId: string | null) => void;
  setSelectedStudent: (studentId: string | null) => void;
  setSelectedSession: (sessionId: string | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  selectedClass: null,
  selectedStudent: null,
  selectedSession: null,

  setSelectedClass: (classId) => set({ selectedClass: classId }),
  setSelectedStudent: (studentId) => set({ selectedStudent: studentId }),
  setSelectedSession: (sessionId) => set({ selectedSession: sessionId }),
}));
