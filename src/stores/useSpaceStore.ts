import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Space, SpaceMember, Role } from '@/types';
import { generateId } from '@/lib/utils';

// ---- Seed Data ----

const DEMO_SPACES: Space[] = [
  {
    id: 'space-1',
    name: 'Marketing',
    description: 'All marketing design requests — campaigns, social media, ads, and collateral.',
    color: 'bg-violet-500',
    icon: 'Megaphone',
    createdBy: 'user-1',
    members: [
      { userId: 'user-1', role: 'super_admin' },
      { userId: 'user-2', role: 'designer' },
      { userId: 'user-4', role: 'designer' },
      { userId: 'user-5', role: 'requester' },
      { userId: 'user-6', role: 'requester' },
    ],
    createdAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'space-2',
    name: 'HR & People',
    description: 'Internal comms, employer branding, recruitment materials, and culture content.',
    color: 'bg-emerald-500',
    icon: 'Users',
    createdBy: 'user-1',
    members: [
      { userId: 'user-1', role: 'super_admin' },
      { userId: 'user-3', role: 'designer' },
      { userId: 'user-7', role: 'requester' },
    ],
    createdAt: '2025-02-15T10:00:00.000Z',
  },
  {
    id: 'space-3',
    name: 'Customer Success',
    description: 'Client presentations, case studies, onboarding decks, and help center visuals.',
    color: 'bg-amber-500',
    icon: 'HeartHandshake',
    createdBy: 'user-1',
    members: [
      { userId: 'user-1', role: 'super_admin' },
      { userId: 'user-2', role: 'designer' },
      { userId: 'user-3', role: 'designer' },
    ],
    createdAt: '2025-03-01T10:00:00.000Z',
  },
];

// ---- Store Types ----

interface SpaceState {
  spaces: Space[];

  createSpace: (space: Omit<Space, 'id' | 'createdAt'>) => Space;
  updateSpace: (spaceId: string, updates: Partial<Space>) => void;
  deleteSpace: (spaceId: string) => void;
  addMemberToSpace: (spaceId: string, userId: string, role: Role) => void;
  removeMemberFromSpace: (spaceId: string, userId: string) => void;
  getSpacesByUser: (userId: string) => Space[];
  getSpaceById: (spaceId: string) => Space | undefined;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => ({
      spaces: DEMO_SPACES,

      createSpace: (data) => {
        const space: Space = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ spaces: [...state.spaces, space] }));
        return space;
      },

      updateSpace: (spaceId: string, updates: Partial<Space>) => {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId ? { ...s, ...updates } : s,
          ),
        }));
      },

      deleteSpace: (spaceId: string) => {
        set((state) => ({
          spaces: state.spaces.filter((s) => s.id !== spaceId),
        }));
      },

      addMemberToSpace: (spaceId: string, userId: string, role: Role) => {
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id !== spaceId) return s;
            if (s.members.some((m) => m.userId === userId)) return s;
            const member: SpaceMember = { userId, role };
            return { ...s, members: [...s.members, member] };
          }),
        }));
      },

      removeMemberFromSpace: (spaceId: string, userId: string) => {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId
              ? { ...s, members: s.members.filter((m) => m.userId !== userId) }
              : s,
          ),
        }));
      },

      getSpacesByUser: (userId: string) => {
        return get().spaces.filter((s) =>
          s.members.some((m) => m.userId === userId),
        );
      },

      getSpaceById: (spaceId: string) => {
        return get().spaces.find((s) => s.id === spaceId);
      },
    }),
    { name: 'designops-spaces' },
  ),
);
