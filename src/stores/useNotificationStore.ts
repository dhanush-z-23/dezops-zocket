import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, NotificationType } from '@/types';
import { generateId } from '@/lib/utils';

interface NotificationState {
  notifications: Notification[];

  addNotification: (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    taskId?: string,
  ) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (userId: string) => void;
  getUnreadCount: (userId: string) => number;
  getNotificationsForUser: (userId: string) => Notification[];
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'task_assigned',
    title: 'New task assigned',
    message: 'Maya Rodriguez was assigned "Q2 Campaign Hero Banners".',
    read: false,
    taskId: 'task-1',
    createdAt: '2026-03-17T14:00:00.000Z',
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: 'revision_requested',
    title: 'Revision requested',
    message: 'Priya Sharma requested revisions on "Social Media Templates".',
    read: false,
    taskId: 'task-3',
    createdAt: '2026-03-17T11:30:00.000Z',
  },
  {
    id: 'notif-3',
    userId: 'user-2',
    type: 'comment_added',
    title: 'New comment',
    message: 'Alex Chen commented on "Q2 Campaign Hero Banners".',
    read: true,
    taskId: 'task-1',
    createdAt: '2026-03-16T16:00:00.000Z',
  },
  {
    id: 'notif-4',
    userId: 'user-1',
    type: 'approval_received',
    title: 'Design approved',
    message: '"Employee Handbook Redesign" has been approved via Slack.',
    read: true,
    taskId: 'task-5',
    createdAt: '2026-03-15T10:00:00.000Z',
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: DEMO_NOTIFICATIONS,

      addNotification: (userId, type, title, message, taskId) => {
        const notification: Notification = {
          id: generateId(),
          userId,
          type,
          title,
          message,
          read: false,
          taskId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));
      },

      markAsRead: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n,
          ),
        }));
      },

      markAllAsRead: (userId: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n,
          ),
        }));
      },

      getUnreadCount: (userId: string) => {
        return get().notifications.filter(
          (n) => n.userId === userId && !n.read,
        ).length;
      },

      getNotificationsForUser: (userId: string) => {
        return get().notifications.filter((n) => n.userId === userId);
      },
    }),
    { name: 'designops-notifications' },
  ),
);
