import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  Attachment,
  Comment,
  Revision,
  CommentType,
  AIReviewResult,
} from '@/types';
import { generateId } from '@/lib/utils';
import { useAuthStore } from './useAuthStore';

// ---- Seed Data ----

const DEMO_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Q2 Campaign Hero Banners',
    description:
      'Design hero banners for the Q2 marketing campaign across web, email, and social channels. Must align with new brand guidelines.',
    spaceId: 'space-1',
    parentTaskId: null,
    assigneeId: 'user-2',
    requesterId: 'user-5',
    priority: 'high',
    status: 'in-progress',
    attachments: [
      {
        id: 'att-1',
        type: 'figma',
        url: 'https://figma.com/file/abc123',
        name: 'Q2 Campaign — Hero Banners',
        uploadedAt: '2026-03-14T09:00:00.000Z',
      },
    ],
    expectedTimeline: {
      startDate: '2026-03-10T00:00:00.000Z',
      endDate: '2026-03-20T00:00:00.000Z',
    },
    designTimeline: {
      startDate: '2026-03-12T00:00:00.000Z',
      endDate: '2026-03-19T00:00:00.000Z',
    },
    timerStartedAt: null,
    totalTimeSpent: 14400, // 4 hours
    timerRunning: false,
    revisions: [],
    comments: [
      {
        id: 'c-1',
        userId: 'user-5',
        text: 'Please use the updated color palette from the brand refresh.',
        createdAt: '2026-03-12T10:00:00.000Z',
        type: 'comment',
      },
      {
        id: 'c-2',
        userId: 'user-2',
        text: 'Got it! Working on v1 now.',
        createdAt: '2026-03-12T10:30:00.000Z',
        type: 'comment',
      },
    ],
    tags: ['campaign', 'q2', 'banners'],
    createdAt: '2026-03-10T09:00:00.000Z',
    updatedAt: '2026-03-15T14:00:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-2',
    title: 'Email Newsletter Template',
    description:
      'Create a reusable email newsletter template for weekly marketing updates. Should be responsive and work in major email clients.',
    spaceId: 'space-1',
    parentTaskId: null,
    assigneeId: 'user-4',
    requesterId: 'user-6',
    priority: 'medium',
    status: 'in-review',
    attachments: [
      {
        id: 'att-2',
        type: 'figma',
        url: 'https://figma.com/file/def456',
        name: 'Newsletter Template v2',
        uploadedAt: '2026-03-13T11:00:00.000Z',
      },
    ],
    expectedTimeline: {
      startDate: '2026-03-08T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z',
    },
    designTimeline: {
      startDate: '2026-03-09T00:00:00.000Z',
      endDate: '2026-03-16T00:00:00.000Z',
    },
    timerStartedAt: null,
    totalTimeSpent: 21600, // 6 hours
    timerRunning: false,
    revisions: [],
    comments: [],
    tags: ['email', 'template'],
    createdAt: '2026-03-08T09:00:00.000Z',
    updatedAt: '2026-03-14T16:00:00.000Z',
    completedAt: null,
    slackApprovalSent: true,
    slackApprovalStatus: 'pending',
    brandId: 'brand-1',
    aiReview: null,
  },
  {
    id: 'task-3',
    title: 'Social Media Templates — Instagram & LinkedIn',
    description:
      'Design a set of 10 social media post templates for Instagram and LinkedIn. Include story templates and carousel formats.',
    spaceId: 'space-1',
    parentTaskId: null,
    assigneeId: 'user-2',
    requesterId: 'user-5',
    priority: 'medium',
    status: 'revision-requested',
    attachments: [],
    expectedTimeline: {
      startDate: '2026-03-05T00:00:00.000Z',
      endDate: '2026-03-15T00:00:00.000Z',
    },
    designTimeline: {
      startDate: '2026-03-06T00:00:00.000Z',
      endDate: '2026-03-14T00:00:00.000Z',
    },
    timerStartedAt: null,
    totalTimeSpent: 18000, // 5 hours
    timerRunning: false,
    revisions: [
      {
        id: 'rev-1',
        version: 1,
        feedback:
          'The LinkedIn templates need more whitespace. Instagram stories look great but adjust the CTA button size.',
        attachments: [],
        requestedBy: 'user-5',
        requestedAt: '2026-03-14T10:00:00.000Z',
        resolvedAt: null,
      },
    ],
    comments: [
      {
        id: 'c-3',
        userId: 'user-5',
        text: 'Love the direction! Just a few tweaks needed — see revision notes.',
        createdAt: '2026-03-14T10:05:00.000Z',
        type: 'request',
      },
    ],
    tags: ['social-media', 'templates', 'instagram', 'linkedin'],
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-14T10:05:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-4',
    title: 'Product Launch Landing Page',
    description:
      'Design a high-conversion landing page for the upcoming product launch. Include hero, features, testimonials, and CTA sections.',
    spaceId: 'space-1',
    parentTaskId: null,
    assigneeId: null,
    requesterId: 'user-6',
    priority: 'urgent',
    status: 'backlog',
    attachments: [
      {
        id: 'att-3',
        type: 'link',
        url: 'https://docs.google.com/document/d/example',
        name: 'Product Launch Brief',
        uploadedAt: '2026-03-16T09:00:00.000Z',
      },
    ],
    expectedTimeline: {
      startDate: '2026-03-20T00:00:00.000Z',
      endDate: '2026-03-30T00:00:00.000Z',
    },
    designTimeline: { startDate: null, endDate: null },
    timerStartedAt: null,
    totalTimeSpent: 0,
    timerRunning: false,
    revisions: [],
    comments: [],
    tags: ['landing-page', 'product-launch', 'urgent'],
    createdAt: '2026-03-16T09:00:00.000Z',
    updatedAt: '2026-03-16T09:00:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-5',
    title: 'Employee Handbook Redesign',
    description:
      'Redesign the employee handbook with updated branding, better typography, and modern layout. 48 pages total.',
    spaceId: 'space-2',
    parentTaskId: null,
    assigneeId: 'user-3',
    requesterId: 'user-7',
    priority: 'high',
    status: 'approved',
    attachments: [
      {
        id: 'att-4',
        type: 'file',
        url: '/uploads/handbook-v3.pdf',
        name: 'Handbook Final v3.pdf',
        uploadedAt: '2026-03-14T15:00:00.000Z',
      },
    ],
    expectedTimeline: {
      startDate: '2026-02-20T00:00:00.000Z',
      endDate: '2026-03-15T00:00:00.000Z',
    },
    designTimeline: {
      startDate: '2026-02-22T00:00:00.000Z',
      endDate: '2026-03-13T00:00:00.000Z',
    },
    timerStartedAt: null,
    totalTimeSpent: 57600, // 16 hours
    timerRunning: false,
    revisions: [
      {
        id: 'rev-2',
        version: 1,
        feedback: 'Update the cover page with the new logo. Rest looks great.',
        attachments: [],
        requestedBy: 'user-7',
        requestedAt: '2026-03-10T09:00:00.000Z',
        resolvedAt: '2026-03-12T14:00:00.000Z',
      },
    ],
    comments: [
      {
        id: 'c-4',
        userId: 'user-7',
        text: 'This looks amazing, Jordan! Approved.',
        createdAt: '2026-03-15T09:00:00.000Z',
        type: 'comment',
      },
    ],
    tags: ['handbook', 'print', 'branding'],
    createdAt: '2026-02-20T09:00:00.000Z',
    updatedAt: '2026-03-15T09:00:00.000Z',
    completedAt: null,
    slackApprovalSent: true,
    slackApprovalStatus: 'approved',
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-6',
    title: 'Recruitment Social Graphics',
    description:
      'Create a series of "We\'re Hiring" graphics for LinkedIn and Instagram featuring open positions and company culture.',
    spaceId: 'space-2',
    parentTaskId: null,
    assigneeId: 'user-3',
    requesterId: 'user-7',
    priority: 'medium',
    status: 'todo',
    attachments: [],
    expectedTimeline: {
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-25T00:00:00.000Z',
    },
    designTimeline: { startDate: null, endDate: null },
    timerStartedAt: null,
    totalTimeSpent: 0,
    timerRunning: false,
    revisions: [],
    comments: [
      {
        id: 'c-5',
        userId: 'user-7',
        text: 'We have 3 open positions: Senior Engineer, Product Manager, and Design Lead.',
        createdAt: '2026-03-17T09:00:00.000Z',
        type: 'comment',
      },
    ],
    tags: ['recruitment', 'social-media', 'hiring'],
    createdAt: '2026-03-17T09:00:00.000Z',
    updatedAt: '2026-03-17T09:00:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-7',
    title: 'Client Onboarding Deck',
    description:
      'Design a polished client onboarding presentation deck (20 slides) covering welcome, process, timeline, and team introductions.',
    spaceId: 'space-3',
    parentTaskId: null,
    assigneeId: 'user-2',
    requesterId: 'user-1',
    priority: 'high',
    status: 'completed',
    attachments: [
      {
        id: 'att-5',
        type: 'file',
        url: '/uploads/onboarding-deck-final.pptx',
        name: 'Client Onboarding Deck — Final.pptx',
        uploadedAt: '2026-03-08T16:00:00.000Z',
      },
    ],
    expectedTimeline: {
      startDate: '2026-02-25T00:00:00.000Z',
      endDate: '2026-03-07T00:00:00.000Z',
    },
    designTimeline: {
      startDate: '2026-02-26T00:00:00.000Z',
      endDate: '2026-03-07T00:00:00.000Z',
    },
    timerStartedAt: null,
    totalTimeSpent: 28800, // 8 hours
    timerRunning: false,
    revisions: [],
    comments: [
      {
        id: 'c-6',
        userId: 'user-1',
        text: 'Excellent work, Maya! Shipping this to the client today.',
        createdAt: '2026-03-08T16:30:00.000Z',
        type: 'comment',
      },
    ],
    tags: ['presentation', 'onboarding', 'client'],
    createdAt: '2026-02-25T09:00:00.000Z',
    updatedAt: '2026-03-08T16:30:00.000Z',
    completedAt: '2026-03-08T16:30:00.000Z',
    slackApprovalSent: true,
    slackApprovalStatus: 'approved',
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-8',
    title: 'Case Study — Acme Corp',
    description:
      'Design a visually compelling case study PDF highlighting the Acme Corp project outcomes, metrics, and testimonials.',
    spaceId: 'space-3',
    parentTaskId: null,
    assigneeId: 'user-3',
    requesterId: 'user-1',
    priority: 'low',
    status: 'in-progress',
    attachments: [],
    expectedTimeline: {
      startDate: '2026-03-15T00:00:00.000Z',
      endDate: '2026-03-28T00:00:00.000Z',
    },
    designTimeline: {
      startDate: '2026-03-16T00:00:00.000Z',
      endDate: '2026-03-26T00:00:00.000Z',
    },
    timerStartedAt: null,
    totalTimeSpent: 7200, // 2 hours
    timerRunning: false,
    revisions: [],
    comments: [],
    tags: ['case-study', 'pdf', 'client'],
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-16T12:00:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-9',
    title: 'Q2 Campaign — Email Header',
    description: 'Design the email header graphic for the Q2 campaign emails. Must match the hero banners.',
    spaceId: 'space-1',
    parentTaskId: 'task-1',
    assigneeId: 'user-2',
    requesterId: 'user-5',
    priority: 'medium',
    status: 'todo',
    attachments: [],
    expectedTimeline: {
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-21T00:00:00.000Z',
    },
    designTimeline: { startDate: null, endDate: null },
    timerStartedAt: null,
    totalTimeSpent: 0,
    timerRunning: false,
    revisions: [],
    comments: [],
    tags: ['campaign', 'q2', 'email'],
    createdAt: '2026-03-16T09:00:00.000Z',
    updatedAt: '2026-03-16T09:00:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
  {
    id: 'task-10',
    title: 'Help Center Illustrations',
    description:
      'Create a set of 12 custom illustrations for the help center covering onboarding, billing, integrations, and support topics.',
    spaceId: 'space-3',
    parentTaskId: null,
    assigneeId: 'user-4',
    requesterId: 'user-1',
    priority: 'medium',
    status: 'backlog',
    attachments: [],
    expectedTimeline: {
      startDate: '2026-03-25T00:00:00.000Z',
      endDate: '2026-04-10T00:00:00.000Z',
    },
    designTimeline: { startDate: null, endDate: null },
    timerStartedAt: null,
    totalTimeSpent: 0,
    timerRunning: false,
    revisions: [],
    comments: [],
    tags: ['illustrations', 'help-center'],
    createdAt: '2026-03-17T09:00:00.000Z',
    updatedAt: '2026-03-17T09:00:00.000Z',
    completedAt: null,
    slackApprovalSent: false,
    slackApprovalStatus: null,
    brandId: null,
    aiReview: null,
  },
];

// ---- Store Types ----

interface TaskState {
  tasks: Task[];

  // CRUD
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'timerStartedAt' | 'totalTimeSpent' | 'timerRunning' | 'revisions' | 'comments' | 'slackApprovalSent' | 'slackApprovalStatus' | 'aiReview'>) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;

  // Queries
  getTasksBySpace: (spaceId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  getSubtasks: (parentTaskId: string) => Task[];
  getTaskById: (taskId: string) => Task | undefined;
  getDesignerWorkload: (designerId: string) => number;

  // Attachments & Comments
  addAttachment: (taskId: string, attachment: Omit<Attachment, 'id' | 'uploadedAt'>) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;
  addComment: (taskId: string, userId: string, text: string, type?: CommentType) => void;

  // Revisions
  addRevision: (taskId: string, feedback: string, requestedBy: string, attachments?: Attachment[]) => void;
  resolveRevision: (taskId: string, revisionId: string) => void;

  // Timer
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;

  // Status
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;

  // Slack
  sendSlackApproval: (taskId: string) => void;

  // AI Review
  setAIReview: (taskId: string, review: AIReviewResult) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: DEMO_TASKS,

      // ---- CRUD ----

      createTask: (data) => {
        const now = new Date().toISOString();
        const task: Task = {
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          timerStartedAt: null,
          totalTimeSpent: 0,
          timerRunning: false,
          revisions: [],
          comments: [],
          slackApprovalSent: false,
          slackApprovalStatus: null,
          aiReview: null,
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        return task;
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t,
          ),
        }));
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter(
            (t) => t.id !== taskId && t.parentTaskId !== taskId,
          ),
        }));
      },

      // ---- Queries ----

      getTasksBySpace: (spaceId) => {
        return get().tasks.filter((t) => t.spaceId === spaceId);
      },

      getTasksByAssignee: (assigneeId) => {
        return get().tasks.filter((t) => t.assigneeId === assigneeId);
      },

      getSubtasks: (parentTaskId) => {
        return get().tasks.filter((t) => t.parentTaskId === parentTaskId);
      },

      getTaskById: (taskId) => {
        return get().tasks.find((t) => t.id === taskId);
      },

      getDesignerWorkload: (designerId) => {
        return get().tasks.filter(
          (t) =>
            t.assigneeId === designerId &&
            !['completed', 'approved'].includes(t.status),
        ).length;
      },

      // ---- Attachments & Comments ----

      addAttachment: (taskId, attachment) => {
        const full: Attachment = {
          ...attachment,
          id: generateId(),
          uploadedAt: new Date().toISOString(),
        };
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  attachments: [...t.attachments, full],
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      removeAttachment: (taskId, attachmentId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  attachments: t.attachments.filter((a) => a.id !== attachmentId),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      addComment: (taskId, userId, text, type = 'comment') => {
        const comment: Comment = {
          id: generateId(),
          userId,
          text,
          createdAt: new Date().toISOString(),
          type,
        };
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  comments: [...t.comments, comment],
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      // ---- Revisions ----

      addRevision: (taskId, feedback, requestedBy, attachments = []) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const revision: Revision = {
              id: generateId(),
              version: t.revisions.length + 1,
              feedback,
              attachments,
              requestedBy,
              requestedAt: new Date().toISOString(),
              resolvedAt: null,
            };
            return {
              ...t,
              revisions: [...t.revisions, revision],
              status: 'revision-requested' as TaskStatus,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      resolveRevision: (taskId, revisionId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              revisions: t.revisions.map((r) =>
                r.id === revisionId
                  ? { ...r, resolvedAt: new Date().toISOString() }
                  : r,
              ),
              status: 'in-progress' as TaskStatus,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ---- Timer ----

      startTimer: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  timerStartedAt: Date.now(),
                  timerRunning: true,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      stopTimer: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId || !t.timerRunning || !t.timerStartedAt) return t;
            const elapsed = Math.floor((Date.now() - t.timerStartedAt) / 1000);
            return {
              ...t,
              timerStartedAt: null,
              timerRunning: false,
              totalTimeSpent: t.totalTimeSpent + elapsed,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ---- Status ----

      updateTaskStatus: (taskId, status) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        const now = new Date().toISOString();
        const updates: Partial<Task> = { status, updatedAt: now };

        // Auto-start timer when moving to in-progress
        if (status === 'in-progress' && !task.timerRunning) {
          updates.timerStartedAt = Date.now();
          updates.timerRunning = true;
          // Set designer status to busy and track current task
          if (task.assigneeId) {
            const authStore = useAuthStore.getState();
            const user = authStore.getUserById(task.assigneeId);
            if (user && user.status !== 'blocked') {
              authStore.updateUserStatus(task.assigneeId, 'busy');
              authStore.updateUser(task.assigneeId, { currentTaskId: taskId });
            }
          }
        }

        // Auto-stop timer when leaving in-progress
        if (status !== 'in-progress' && task.timerRunning && task.timerStartedAt) {
          const elapsed = Math.floor((Date.now() - task.timerStartedAt) / 1000);
          updates.timerStartedAt = null;
          updates.timerRunning = false;
          updates.totalTimeSpent = task.totalTimeSpent + elapsed;
        }

        // Mark completedAt and set designer back to available
        if (status === 'completed' || status === 'approved') {
          if (status === 'completed') updates.completedAt = now;
          if (task.assigneeId) {
            const authStore = useAuthStore.getState();
            const user = authStore.getUserById(task.assigneeId);
            if (user && user.currentTaskId === taskId) {
              // Check if designer has other active tasks
              const otherActive = get().tasks.filter(
                (t) => t.id !== taskId && t.assigneeId === task.assigneeId && t.status === 'in-progress',
              );
              if (otherActive.length === 0) {
                authStore.updateUserStatus(task.assigneeId, 'available');
              }
            }
          }
        }

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t,
          ),
        }));
      },

      // ---- Slack ----

      sendSlackApproval: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  slackApprovalSent: true,
                  slackApprovalStatus: 'pending' as const,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },
      // ---- AI Review ----

      setAIReview: (taskId, review) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, aiReview: review, updatedAt: new Date().toISOString() }
              : t,
          ),
        }));
      },
    }),
    { name: 'designops-tasks' },
  ),
);
