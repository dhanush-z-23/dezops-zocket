'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  GitPullRequestArrow,
  CheckCircle2,
  AlertCircle,
  AtSign,
  Settings,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';

import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationsPageProps {
  onOpenTask: (taskId: string) => void;
}

// ---------------------------------------------------------------------------
// Filter tab definitions
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'unread' | 'task_updates' | 'mentions' | 'system';

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'task_updates', label: 'Task Updates' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'system', label: 'System' },
];

// ---------------------------------------------------------------------------
// Icon by notification type
// ---------------------------------------------------------------------------

function NotifIcon({ type }: { type: NotificationType }) {
  const base = 'h-4 w-4';

  const map: Record<
    NotificationType,
    { icon: React.ElementType; bg: string; color: string }
  > = {
    task_assigned: { icon: ClipboardList, bg: 'bg-primary-light', color: 'text-primary' },
    task_updated: { icon: ClipboardList, bg: 'bg-secondary/10', color: 'text-secondary' },
    comment_added: { icon: MessageSquare, bg: 'bg-surface-tertiary', color: 'text-text-secondary' },
    revision_requested: { icon: GitPullRequestArrow, bg: 'bg-warning/10', color: 'text-warning' },
    approval_received: { icon: CheckCircle2, bg: 'bg-success/10', color: 'text-success' },
    status_changed: { icon: AlertCircle, bg: 'bg-secondary/10', color: 'text-secondary' },
    mention: { icon: AtSign, bg: 'bg-primary-light', color: 'text-primary' },
    system: { icon: Settings, bg: 'bg-surface-tertiary', color: 'text-text-tertiary' },
  };

  const { icon: Icon, bg, color } = map[type] ?? map.system;

  return (
    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', bg)}>
      <Icon className={cn(base, color)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

function NotificationRow({
  notification,
  onOpenTask,
}: {
  notification: Notification;
  onOpenTask: (taskId: string) => void;
}) {
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.taskId) {
      onOpenTask(notification.taskId);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ duration: 0.18 }}
      onClick={handleClick}
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-all hover:shadow-sm',
        notification.read
          ? 'border-border bg-white'
          : 'border-l-2 border-l-primary border-border bg-primary-light/30',
        notification.taskId && 'hover:border-primary/30',
      )}
    >
      {/* Type icon */}
      <NotifIcon type={notification.type} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug',
              notification.read ? 'text-text-secondary' : 'font-medium text-text-primary',
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-[11px] text-text-tertiary">{timeAgo}</span>
        </div>
        <p className="mt-0.5 text-xs text-text-tertiary line-clamp-2">{notification.message}</p>
        {notification.taskId && (
          <p className="mt-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Click to open task →
          </p>
        )}
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Date group header
// ---------------------------------------------------------------------------

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center gap-3 py-20"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tertiary">
        <Inbox className="h-7 w-7 text-text-tertiary" />
      </div>
      <p className="text-sm font-medium text-text-primary">
        {filtered ? 'No notifications here' : 'You\'re all caught up!'}
      </p>
      <p className="text-xs text-text-tertiary">
        {filtered
          ? 'Try switching to a different filter.'
          : 'New notifications will appear here.'}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Export
// ---------------------------------------------------------------------------

export default function NotificationsPage({ onOpenTask }: NotificationsPageProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { markAllAsRead, getNotificationsForUser, getUnreadCount } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const userId = currentUser?.id ?? '';

  // All notifications for this user, newest first
  const allNotifications = useMemo(() => {
    const raw = getNotificationsForUser(userId);
    return [...raw].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [getNotificationsForUser, userId]);

  const unreadCount = getUnreadCount(userId);

  // Apply filter
  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return allNotifications.filter((n) => !n.read);
      case 'task_updates':
        return allNotifications.filter((n) =>
          ['task_assigned', 'task_updated', 'status_changed', 'revision_requested', 'approval_received'].includes(n.type),
        );
      case 'mentions':
        return allNotifications.filter((n) => n.type === 'mention');
      case 'system':
        return allNotifications.filter((n) => n.type === 'system');
      default:
        return allNotifications;
    }
  }, [allNotifications, activeTab]);

  // Group by date
  const grouped = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    filtered.forEach((n) => {
      const d = new Date(n.createdAt);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else earlier.push(n);
    });

    return { today, yesterday, earlier };
  }, [filtered]);

  const hasAny =
    grouped.today.length > 0 || grouped.yesterday.length > 0 || grouped.earlier.length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Notifications</h1>
            <p className="text-sm text-text-secondary">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead(userId)}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </motion.div>

      {/* ── Filter tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.2 }}
        className="flex items-center gap-1 rounded-xl border border-border bg-white p-1.5"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count =
            tab.id === 'unread'
              ? unreadCount
              : tab.id === 'task_updates'
              ? allNotifications.filter((n) =>
                  ['task_assigned', 'task_updated', 'status_changed', 'revision_requested', 'approval_received'].includes(
                    n.type,
                  ),
                ).length
              : tab.id === 'mentions'
              ? allNotifications.filter((n) => n.type === 'mention').length
              : tab.id === 'system'
              ? allNotifications.filter((n) => n.type === 'system').length
              : null;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              )}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span
                  className={cn(
                    'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                    isActive ? 'bg-white/25 text-white' : 'bg-primary-light text-primary',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ── Notification list ── */}
      {!hasAny ? (
        <EmptyState filtered={activeTab !== 'all'} />
      ) : (
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {grouped.today.length > 0 && (
              <motion.div
                key="today"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <DateGroupHeader label="Today" />
                {grouped.today.map((n) => (
                  <NotificationRow key={n.id} notification={n} onOpenTask={onOpenTask} />
                ))}
              </motion.div>
            )}

            {grouped.yesterday.length > 0 && (
              <motion.div
                key="yesterday"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <DateGroupHeader label="Yesterday" />
                {grouped.yesterday.map((n) => (
                  <NotificationRow key={n.id} notification={n} onOpenTask={onOpenTask} />
                ))}
              </motion.div>
            )}

            {grouped.earlier.length > 0 && (
              <motion.div
                key="earlier"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <DateGroupHeader label="Earlier" />
                {grouped.earlier.map((n) => (
                  <NotificationRow key={n.id} notification={n} onOpenTask={onOpenTask} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
