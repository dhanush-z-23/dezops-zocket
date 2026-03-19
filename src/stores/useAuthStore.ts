import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company, UserStatus, Role } from '@/types';
import { generateId, getInitials } from '@/lib/utils';

// ---- Seed Data ----

const DEMO_COMPANY: Company = {
  id: 'company-1',
  name: 'DesignCraft Studio',
  logo: 'DC',
  onboardingComplete: true,
  slackWebhookUrl: 'https://hooks.slack.com/services/DEMO/WEBHOOK',
  departments: ['Design', 'Marketing', 'HR', 'Customer Success', 'Engineering'],
};

const DEMO_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Alex Chen',
    email: 'alex.chen@designcraft.io',
    avatar: 'AC',
    role: 'super_admin',
    department: 'Design',
    status: 'available',
    currentTaskId: null,
    joinedAt: '2025-01-10T09:00:00.000Z',
    invitedBy: null,
    weeklyCapacityHours: 40,
    skills: ['UI Design', 'Design Systems', 'Brand Strategy', 'Motion Design'],
  },
  {
    id: 'user-2',
    name: 'Maya Rodriguez',
    email: 'maya.r@designcraft.io',
    avatar: 'MR',
    role: 'designer',
    department: 'Design',
    status: 'busy',
    currentTaskId: 'task-1',
    joinedAt: '2025-02-15T09:00:00.000Z',
    invitedBy: 'user-1',
    weeklyCapacityHours: 40,
    skills: ['UI Design', 'Illustration', 'Figma'],
  },
  {
    id: 'user-3',
    name: 'Jordan Park',
    email: 'jordan.p@designcraft.io',
    avatar: 'JP',
    role: 'designer',
    department: 'Design',
    status: 'available',
    currentTaskId: null,
    joinedAt: '2025-03-01T09:00:00.000Z',
    invitedBy: 'user-1',
    weeklyCapacityHours: 32,
    skills: ['Motion Design', 'Video Editing', 'After Effects'],
  },
  {
    id: 'user-4',
    name: 'Sam Taylor',
    email: 'sam.t@designcraft.io',
    avatar: 'ST',
    role: 'designer',
    department: 'Design',
    status: 'available',
    currentTaskId: null,
    joinedAt: '2025-03-20T09:00:00.000Z',
    invitedBy: 'user-1',
    weeklyCapacityHours: 40,
    skills: ['Brand Design', 'Print', 'Packaging'],
  },
  {
    id: 'user-5',
    name: 'Priya Sharma',
    email: 'priya.s@designcraft.io',
    avatar: 'PS',
    role: 'requester',
    department: 'Marketing',
    status: 'available',
    currentTaskId: null,
    joinedAt: '2025-04-01T09:00:00.000Z',
    invitedBy: 'user-1',
    weeklyCapacityHours: 40,
    skills: ['Content Strategy', 'Campaign Planning'],
  },
  {
    id: 'user-6',
    name: 'Liam O\'Brien',
    email: 'liam.o@designcraft.io',
    avatar: 'LO',
    role: 'requester',
    department: 'Marketing',
    status: 'available',
    currentTaskId: null,
    joinedAt: '2025-04-10T09:00:00.000Z',
    invitedBy: 'user-5',
    weeklyCapacityHours: 40,
    skills: ['Social Media', 'Brand Marketing'],
  },
  {
    id: 'user-7',
    name: 'Nina Patel',
    email: 'nina.p@designcraft.io',
    avatar: 'NP',
    role: 'requester',
    department: 'HR',
    status: 'available',
    currentTaskId: null,
    joinedAt: '2025-05-01T09:00:00.000Z',
    invitedBy: 'user-1',
    weeklyCapacityHours: 40,
    skills: ['Employer Branding', 'Internal Comms'],
  },
];

// ---- Invite Types ----

export interface PendingInvite {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  sentAt: string;
  status: 'pending' | 'accepted';
}

// ---- Store Types ----

interface AuthState {
  currentUser: User | null;
  company: Company | null;
  allUsers: User[];
  isAuthenticated: boolean;
  isNewUser: boolean;
  pendingInvites: PendingInvite[];

  login: (email: string) => boolean;
  logout: () => void;
  signUpWithGoogle: (name: string, email: string) => void;
  loginWithGoogle: (email: string) => boolean;
  sendInvite: (email: string, name: string, role: Role, department: string) => void;
  acceptInvite: (inviteId: string) => void;
  completeOnboarding: (companyName: string, departments: string[]) => void;
  inviteUser: (email: string, name: string, role: Role, department: string) => User;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  blockDesigner: (userId: string) => void;
  unblockDesigner: (userId: string) => void;
  getUserById: (userId: string) => User | undefined;
  updateCompany: (partial: Partial<Company>) => void;
  updateCurrentUser: (partial: Partial<User>) => void;
  removeUser: (userId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      company: DEMO_COMPANY,
      allUsers: DEMO_USERS,
      isAuthenticated: false,
      isNewUser: false,
      pendingInvites: [],

      login: (idOrEmail: string) => {
        const user = get().allUsers.find((u) => u.id === idOrEmail || u.email === idOrEmail);
        if (user) {
          set({ currentUser: user, isAuthenticated: true, isNewUser: false });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, isNewUser: false });
      },

      signUpWithGoogle: (name: string, email: string) => {
        const existing = get().allUsers.find((u) => u.email === email);
        if (existing) {
          // If user already exists, just log them in
          set({ currentUser: existing, isAuthenticated: true, isNewUser: false });
          return;
        }
        const newUser: User = {
          id: generateId(),
          name,
          email,
          avatar: getInitials(name),
          role: 'super_admin',
          department: 'Design',
          status: 'available',
          currentTaskId: null,
          joinedAt: new Date().toISOString(),
          invitedBy: null,
          weeklyCapacityHours: 40,
          skills: [],
        };
        const newCompany: Company = {
          id: generateId(),
          name: '',
          logo: '',
          onboardingComplete: false,
          slackWebhookUrl: '',
          departments: [],
        };
        set((state) => ({
          allUsers: [...state.allUsers, newUser],
          currentUser: newUser,
          company: newCompany,
          isAuthenticated: true,
          isNewUser: true,
        }));
      },

      loginWithGoogle: (email: string) => {
        const user = get().allUsers.find((u) => u.email === email);
        if (user) {
          set({ currentUser: user, isAuthenticated: true, isNewUser: false });
          return true;
        }
        return false;
      },

      sendInvite: (email: string, name: string, role: Role, department: string) => {
        // Create the user
        const newUser: User = {
          id: generateId(),
          name,
          email,
          avatar: getInitials(name),
          role,
          department,
          status: 'available',
          currentTaskId: null,
          joinedAt: new Date().toISOString(),
          invitedBy: get().currentUser?.id ?? null,
          weeklyCapacityHours: 40,
          skills: [],
        };

        const invite: PendingInvite = {
          id: generateId(),
          email,
          name,
          role,
          department,
          sentAt: new Date().toISOString(),
          status: 'pending',
        };

        set((state) => ({
          allUsers: [...state.allUsers, newUser],
          pendingInvites: [...state.pendingInvites, invite],
        }));
      },

      acceptInvite: (inviteId: string) => {
        set((state) => ({
          pendingInvites: state.pendingInvites.map((inv) =>
            inv.id === inviteId ? { ...inv, status: 'accepted' as const } : inv,
          ),
        }));
      },

      completeOnboarding: (companyName: string, departments: string[]) => {
        set((state) => ({
          company: state.company
            ? { ...state.company, name: companyName, departments, onboardingComplete: true }
            : null,
          isNewUser: false,
        }));
      },

      inviteUser: (email: string, name: string, role: Role, department: string) => {
        const newUser: User = {
          id: generateId(),
          name,
          email,
          avatar: getInitials(name),
          role,
          department,
          status: 'available',
          currentTaskId: null,
          joinedAt: new Date().toISOString(),
          invitedBy: get().currentUser?.id ?? null,
          weeklyCapacityHours: 40,
          skills: [],
        };
        set((state) => ({ allUsers: [...state.allUsers, newUser] }));
        return newUser;
      },

      updateUserStatus: (userId: string, status: UserStatus) => {
        set((state) => ({
          allUsers: state.allUsers.map((u) =>
            u.id === userId ? { ...u, status } : u,
          ),
          currentUser:
            state.currentUser?.id === userId
              ? { ...state.currentUser, status }
              : state.currentUser,
        }));
      },

      blockDesigner: (userId: string) => {
        set((state) => ({
          allUsers: state.allUsers.map((u) =>
            u.id === userId ? { ...u, status: 'blocked' as UserStatus } : u,
          ),
        }));
      },

      unblockDesigner: (userId: string) => {
        set((state) => ({
          allUsers: state.allUsers.map((u) =>
            u.id === userId && u.status === 'blocked'
              ? { ...u, status: 'available' as UserStatus }
              : u,
          ),
        }));
      },

      getUserById: (userId: string) => {
        return get().allUsers.find((u) => u.id === userId);
      },

      updateCompany: (partial: Partial<Company>) => {
        set((state) => ({
          company: state.company ? { ...state.company, ...partial } : null,
        }));
      },

      updateCurrentUser: (partial: Partial<User>) => {
        set((state) => {
          if (!state.currentUser) return state;
          const updated = { ...state.currentUser, ...partial };
          return {
            currentUser: updated,
            allUsers: state.allUsers.map((u) =>
              u.id === updated.id ? updated : u,
            ),
          };
        });
      },

      removeUser: (userId: string) => {
        set((state) => ({
          allUsers: state.allUsers.filter((u) => u.id !== userId),
        }));
      },
    }),
    { name: 'designops-auth' },
  ),
);
