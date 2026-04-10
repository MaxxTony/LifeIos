import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '@/services/dbService';
import { authService } from '@/services/authService';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface UserState {
  _hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  onboardingData: {
    struggles: string[];
  };
  tasks: Task[];
  mood: string | null;

  // Actions
  setHasHydrated: (state: boolean) => void;
  completeOnboarding: () => void;
  setAuth: (userId: string | null, userName: string | null) => void;
  setOnboardingData: (data: Partial<UserState['onboardingData']>) => void;
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  setMood: (mood: string) => void;
  logout: () => void;
  hydrateFromCloud: () => Promise<void>;
}

export const useStore = create<UserState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      userId: null,
      userName: null,
      onboardingData: {
        struggles: [],
      },
      tasks: [],
      mood: null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      setAuth: (userId, userName) => set({ userId, userName, isAuthenticated: !!userId }),
      setOnboardingData: (data) => set((state) => ({ 
        onboardingData: { ...state.onboardingData, ...data } 
      })),
      addTask: async (text) => {
        const newTask = { id: Math.random().toString(36).substring(7), text, completed: false, createdAt: Date.now() };
        set((state) => {
          const newTasks = [...state.tasks, newTask];
          if (state.userId) {
            dbService.syncTasks(state.userId, newTasks);
          }
          return { tasks: newTasks };
        });
      },
      toggleTask: async (id) => {
        set((state) => {
          const newTasks = state.tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
          if (state.userId) {
            dbService.syncTasks(state.userId, newTasks);
          }
          return { tasks: newTasks };
        });
      },
      setTasks: (tasks) => set({ tasks }),
      setMood: async (mood) => {
        set((state) => {
          if (state.userId) {
            dbService.saveMood(state.userId, { mood, timestamp: Date.now() });
          }
          return { mood };
        });
      },
      logout: () => set({ isAuthenticated: false, userId: null, userName: null, tasks: [], mood: null }),
      hydrateFromCloud: async () => {
        const userId = authService.currentUser?.uid || useStore.getState().userId;
        if (userId) {
          try {
            const { data, error } = await dbService.getUserProfile(userId);
            if (error) throw new Error(error);
            
            if (data) {
              set({ 
                tasks: data.tasks || [], 
                mood: data.currentMood || null,
                userName: data.userName || (data.isGuest ? 'Guest' : null),
                hasCompletedOnboarding: data.hasCompletedOnboarding || useStore.getState().hasCompletedOnboarding || (!!data.struggles && data.struggles.length > 0),
                onboardingData: {
                  struggles: data.struggles || []
                }
              });
            } else {
              // User doc doesn't exist - could be a deleted account or incomplete setup
              console.warn('User profile not found in Firestore.');
            }
          } catch (err: any) {
            console.error('Cloud hydration failed:', err);
            // If it's a permission error, it might mean the user was deleted/disabled
            if (err.message?.includes('permission-denied')) {
              await authService.logout();
              set({ isAuthenticated: false, userId: null });
            }
          }
        }
      },
    }),
    {
      name: 'lifeos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
