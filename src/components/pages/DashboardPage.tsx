'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Plus,
  FileText,
  Users,
  Play,
  Square,
  Timer,
  TrendingUp,
  ArrowRight,
  Activity,
  Inbox,
  Send,
  Layers,
  ChevronRight,
  Circle,
  UserPlus,
  Zap,
  Paperclip,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, isAfter, isBefore, subDays, startOfDay } from 'date-fns';

import { useAuthStore } from '@/stores/useAuthStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useReportStore } from '@/stores/useReportStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { cn, formatTime, formatDate } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, User } from '@/types';

// ---------------------------------------------------------------------------
// Shared helpers & animation variants
// ---------------------------------------------------------------------------

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

function statusLabel(s: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    backlog: 'Backlog',
    todo: 'To Do',
    'in-progress': 'In Progress',
    'in-review': 'In Review',
    'revision-requested': 'Revision',
    approved: 'Approved',
    completed: 'Completed',
  };
  return map[s] ?? s;
}

function statusBadgeVariant(
  s: TaskStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' {
  const map: Record<TaskStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    backlog: 'default',
    todo: 'info',
    'in-progress': 'warning',
    'in-review': 'purple',
    'revision-requested': 'error',
    approved: 'success',
    completed: 'success',
  };
  return map[s] ?? 'default';
}

function priorityBadgeVariant(
  p: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' {
  const map: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    urgent: 'error',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };
  return map[p] ?? 'default';
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      {...fadeUp}
      className="flex items-center gap-4 rounded-xl border border-border bg-white p-5 shadow-sm"
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="truncate text-xs text-text-secondary">{label}</p>
        {sub && <p className="text-[10px] text-text-tertiary">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section {...fadeUp} className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Running Timer Widget
// ---------------------------------------------------------------------------

function TimerWidget({ task }: { task: Task }) {
  const stopTimer = useTaskStore((s) => s.stopTimer);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!task.timerRunning || !task.timerStartedAt) return;
    const update = () => {
      setElapsed(Math.floor((Date.now() - task.timerStartedAt!) / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [task.timerRunning, task.timerStartedAt]);

  const total = task.totalTimeSpent + elapsed;

  return (
    <motion.div
      {...fadeUp}
      className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary-light p-4"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Timer className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{task.title}</p>
        <p className="font-mono text-lg font-bold text-primary">{formatTime(total)}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => stopTimer(task.id)}>
        <Square className="h-3.5 w-3.5" />
        Stop
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Task mini-row (for lists)
// ---------------------------------------------------------------------------

function TaskRow({ task, showAssignee = false, onClick }: { task: Task; showAssignee?: boolean; onClick?: () => void }) {
  const getUserById = useAuthStore((s) => s.getUserById);
  const getSpaceById = useSpaceStore((s) => s.getSpaceById);
  const space = getSpaceById(task.spaceId);
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;

  const isOverdue =
    task.expectedTimeline.endDate &&
    !['completed', 'approved'].includes(task.status) &&
    isBefore(new Date(task.expectedTimeline.endDate), new Date());

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 transition-colors hover:border-primary/30 hover:shadow-sm',
        isOverdue && 'border-error/30 bg-error/5',
        onClick && 'cursor-pointer',
      )}
    >
      <div className={cn('h-2 w-2 shrink-0 rounded-full', space?.color ?? 'bg-gray-400')} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{task.title}</p>
        <p className="text-xs text-text-tertiary">{space?.name ?? 'Unknown space'}</p>
      </div>
      <Badge variant={priorityBadgeVariant(task.priority)}>
        {task.priority}
      </Badge>
      <Badge variant={statusBadgeVariant(task.status)}>
        {statusLabel(task.status)}
      </Badge>
      {showAssignee && assignee && <Avatar name={assignee.name} size="sm" status={assignee.status} />}
      {task.expectedTimeline.endDate && (
        <span className={cn('shrink-0 text-xs', isOverdue ? 'font-medium text-error' : 'text-text-tertiary')}>
          {format(new Date(task.expectedTimeline.endDate), 'MMM d')}
        </span>
      )}
      {task.timerRunning && (
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <Play className="h-3 w-3 fill-primary" /> Live
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Designer Status Helpers
// ---------------------------------------------------------------------------

const designerStatusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: 'Available', color: 'text-success', bg: 'bg-success/10 border-success/20', dot: 'bg-success' },
  busy: { label: 'Busy', color: 'text-warning', bg: 'bg-warning/10 border-warning/20', dot: 'bg-warning' },
  'on-leave': { label: 'On Leave', color: 'text-text-tertiary', bg: 'bg-surface-tertiary border-border', dot: 'bg-gray-400' },
  blocked: { label: 'Blocked', color: 'text-error', bg: 'bg-error/10 border-error/20', dot: 'bg-error' },
};

// ---------------------------------------------------------------------------
// Create Request Form (shared by Admin + Requester)
// ---------------------------------------------------------------------------

function CreateRequestForm({
  isOpen,
  onClose,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}) {
  const createTask = useTaskStore((s) => s.createTask);
  const spaces = useSpaceStore((s) => s.spaces);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [spaceId, setSpaceId] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSpaceId('');
    setFiles([]);
    setFileName('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!title.trim() || !spaceId) return;
    createTask({
      title: title.trim(),
      description: description.trim(),
      spaceId,
      parentTaskId: null,
      assigneeId: null,
      requesterId: currentUserId,
      priority,
      status: 'backlog',
      attachments: files.map((name, i) => ({
        id: `new-att-${i}`,
        type: 'file' as const,
        url: `/uploads/${name}`,
        name,
        uploadedAt: new Date().toISOString(),
      })),
      expectedTimeline: { startDate: null, endDate: null },
      designTimeline: { startDate: null, endDate: null },
      tags: [],
      brandId: null,
    });
    resetForm();
    onClose();
  }, [title, description, spaceId, priority, files, currentUserId, createTask, resetForm, onClose]);

  const addFile = useCallback(() => {
    if (fileName.trim()) {
      setFiles((prev) => [...prev, fileName.trim()]);
      setFileName('');
    }
  }, [fileName]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Design Request" size="lg">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q3 Campaign Hero Banner"
            className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you need designed..."
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={[
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <Select
            label="Target Space"
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            placeholder="Select a space"
            options={spaces.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>

        {/* File attachments */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Attachments</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFile()}
              placeholder="File name (e.g. brief.pdf)"
              className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button variant="outline" size="sm" onClick={addFile}>
              <Paperclip className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary px-2 py-1 text-xs text-text-secondary"
                >
                  <Paperclip className="h-3 w-3" />
                  {f}
                  <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3 text-text-tertiary hover:text-error" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => { resetForm(); onClose(); }}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!title.trim() || !spaceId}>
            <Send className="h-3.5 w-3.5" />
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Admin / Design-Lead Dashboard
// ---------------------------------------------------------------------------

function AdminDashboard({ user, onOpenTask, onNavigate }: { user: User; onOpenTask?: (taskId: string) => void; onNavigate?: (page: string) => void }) {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const allUsers = useAuthStore((s) => s.allUsers);
  const getUserById = useAuthStore((s) => s.getUserById);
  const updateUserStatus = useAuthStore((s) => s.updateUserStatus);
  const getSpaceById = useSpaceStore((s) => s.getSpaceById);
  const getDesignerWorkload = useTaskStore((s) => s.getDesignerWorkload);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [assignModalDesignerId, setAssignModalDesignerId] = useState<string | null>(null);
  const [statusMenuDesignerId, setStatusMenuDesignerId] = useState<string | null>(null);

  const now = new Date();
  const weekAgo = subDays(now, 7);

  const stats = useMemo(() => {
    const total = tasks.filter((t) => !t.parentTaskId).length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const inReview = tasks.filter((t) => t.status === 'in-review').length;
    const completedThisWeek = tasks.filter(
      (t) => t.status === 'completed' && t.completedAt && isAfter(new Date(t.completedAt), weekAgo),
    ).length;
    return { total, inProgress, inReview, completedThisWeek };
  }, [tasks, weekAgo]);

  const designers = useMemo(
    () => allUsers.filter((u) => u.role === 'designer'),
    [allUsers],
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.expectedTimeline.endDate &&
          !['completed', 'approved'].includes(t.status) &&
          isBefore(new Date(t.expectedTimeline.endDate), startOfDay(now)),
      ),
    [tasks, now],
  );

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [tasks],
  );

  // Chart data: tasks completed per day this week
  const chartData = useMemo(() => {
    const days: { name: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'EEE');
      const count = tasks.filter(
        (t) =>
          t.completedAt &&
          format(new Date(t.completedAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'),
      ).length;
      days.push({ name: dayStr, count });
    }
    return days;
  }, [tasks, now]);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Welcome */}
      <motion.div {...fadeUp}>
        <h1 className="text-xl font-bold text-text-primary">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-text-secondary">
          {format(now, 'EEEE, MMMM d, yyyy')} — Here&apos;s what&apos;s happening across your team.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Layers} label="Total Tasks" value={stats.total} color="bg-primary" />
        <StatCard icon={Activity} label="In Progress" value={stats.inProgress} color="bg-warning" />
        <StatCard icon={Clock} label="Pending Review" value={stats.inReview} color="bg-secondary" />
        <StatCard
          icon={CheckCircle2}
          label="Completed This Week"
          value={stats.completedThisWeek}
          color="bg-success"
        />
      </div>

      {/* Chart + Team Overview */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <Section title="Tasks This Week" className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" name="Completed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Live Design Team Overview — Enhanced */}
        <Section title="Design Team Overview" className="lg:col-span-3">
          <div className="space-y-4">
            {designers.map((designer) => {
              const workload = getDesignerWorkload(designer.id);
              const designerTasks = tasks.filter((t) => t.assigneeId === designer.id && !['completed', 'approved'].includes(t.status));
              const runningTask = designerTasks.find((t) => t.timerRunning);
              const currentTask = designerTasks.find((t) => t.status === 'in-progress');
              const todoCount = designerTasks.filter((t) => t.status === 'todo').length;
              const inProgressCount = designerTasks.filter((t) => t.status === 'in-progress').length;
              const inReviewCount = designerTasks.filter((t) => t.status === 'in-review').length;
              const hoursThisWeek = tasks
                .filter((t) => t.assigneeId === designer.id && t.completedAt && isAfter(new Date(t.completedAt), weekAgo))
                .reduce((acc, t) => acc + t.totalTimeSpent, 0);
              const activeTimeThisWeek = designerTasks.reduce((acc, t) => acc + t.totalTimeSpent, 0) + hoursThisWeek;
              const capacityPct = Math.min((activeTimeThisWeek / (designer.weeklyCapacityHours * 3600)) * 100, 100);
              const capacityHoursUsed = Math.round(activeTimeThisWeek / 3600 * 10) / 10;
              const statusConf = designerStatusConfig[designer.status] ?? designerStatusConfig['available'];
              const unassignedTasks = tasks.filter(
                (t) => !t.assigneeId && !['completed', 'approved'].includes(t.status) && !t.parentTaskId,
              );

              return (
                <motion.div
                  key={designer.id}
                  {...fadeUp}
                  className={cn(
                    'rounded-xl border bg-white shadow-sm transition-colors overflow-hidden',
                    designer.status === 'blocked' ? 'border-error/30' : 'border-border',
                  )}
                >
                  {/* Header row with large status */}
                  <div className="flex items-center gap-4 p-4 pb-3">
                    <Avatar name={designer.name} size="md" status={designer.status} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">{designer.name}</p>
                      {/* Skills tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {designer.skills.map((s) => (
                          <span key={s} className="rounded-full bg-primary/5 border border-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary/70">{s}</span>
                        ))}
                      </div>
                    </div>
                    {/* Large status badge */}
                    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5 relative', statusConf.bg)}>
                      <div className={cn('h-2.5 w-2.5 rounded-full', statusConf.dot, designer.status === 'busy' && 'animate-pulse')} />
                      <span className={cn('text-xs font-semibold capitalize', statusConf.color)}>{statusConf.label}</span>
                    </div>
                  </div>

                  {/* Current task (if busy) with clickable link */}
                  {currentTask && (
                    <div
                      onClick={() => onOpenTask?.(currentTask.id)}
                      className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-primary-light border border-primary/10 px-3 py-2 cursor-pointer hover:border-primary/30 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                        {runningTask?.id === currentTask.id ? (
                          <Timer className="h-3.5 w-3.5 text-primary animate-pulse" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-tertiary">Current task</p>
                        <p className="truncate text-sm font-medium text-primary">{currentTask.title}</p>
                      </div>
                      {runningTask?.id === currentTask.id && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          Timer running
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-primary/50 shrink-0" />
                    </div>
                  )}
                  {!currentTask && designer.status === 'available' && (
                    <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-dashed border-success/30 bg-success/5 px-3 py-2">
                      <Circle className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs text-success font-medium">Ready for new assignments</span>
                    </div>
                  )}

                  {/* Task queue breakdown + capacity bar */}
                  <div className="border-t border-border-light px-4 py-3">
                    <div className="flex items-center gap-4">
                      {/* Task queue counts */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-info/10 text-[10px] font-bold text-info">{todoCount}</span>
                          <span className="text-[10px] text-text-tertiary">Todo</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-warning/10 text-[10px] font-bold text-warning">{inProgressCount}</span>
                          <span className="text-[10px] text-text-tertiary">In Progress</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-[10px] font-bold text-purple-600">{inReviewCount}</span>
                          <span className="text-[10px] text-text-tertiary">In Review</span>
                        </div>
                      </div>

                      {/* Capacity utilization */}
                      <div className="w-36">
                        <div className="flex justify-between text-[10px] text-text-tertiary mb-0.5">
                          <span>{capacityHoursUsed}h / {designer.weeklyCapacityHours}h</span>
                          <span className={cn(
                            'font-semibold',
                            capacityPct > 80 ? 'text-error' : capacityPct > 50 ? 'text-warning' : 'text-success',
                          )}>{Math.round(capacityPct)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              capacityPct > 80 ? 'bg-error' : capacityPct > 50 ? 'bg-warning' : 'bg-success',
                            )}
                            style={{ width: `${capacityPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="border-t border-border-light px-4 py-2.5 flex items-center gap-2">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssignModalDesignerId(assignModalDesignerId === designer.id ? null : designer.id)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign Task
                      </Button>
                      {assignModalDesignerId === designer.id && unassignedTasks.length > 0 && (
                        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
                          {unassignedTasks.slice(0, 8).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                updateTask(t.id, { assigneeId: designer.id });
                                setAssignModalDesignerId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-surface-secondary transition-colors border-b border-border-light last:border-0"
                            >
                              <Badge variant={priorityBadgeVariant(t.priority)}>{t.priority}</Badge>
                              <span className="truncate flex-1 text-text-primary">{t.title}</span>
                            </button>
                          ))}
                          {unassignedTasks.length === 0 && (
                            <p className="px-3 py-2 text-xs text-text-tertiary">No unassigned tasks</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusMenuDesignerId(statusMenuDesignerId === designer.id ? null : designer.id)}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Status
                      </Button>
                      {statusMenuDesignerId === designer.id && (
                        <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-white shadow-lg">
                          {(['available', 'busy', 'on-leave', 'blocked'] as const).map((st) => {
                            const conf = designerStatusConfig[st];
                            return (
                              <button
                                key={st}
                                onClick={() => {
                                  updateUserStatus(designer.id, st);
                                  setStatusMenuDesignerId(null);
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-surface-secondary transition-colors',
                                  designer.status === st && 'bg-surface-secondary font-medium',
                                )}
                              >
                                <div className={cn('h-2 w-2 rounded-full', conf.dot)} />
                                <span className="text-text-primary">{conf.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="ml-auto">
                      <Button variant="ghost" size="sm" onClick={() => onNavigate?.('reports')}>
                        View Report
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Bottleneck Alerts */}
      {(() => {
        const stuckInReview = tasks.filter((t) =>
          t.status === 'in-review' && isBefore(new Date(t.updatedAt), subDays(now, 2)),
        );
        const highRevisions = tasks.filter((t) => t.revisions.length > 2 && !['completed', 'approved'].includes(t.status));
        const overloadedDesigners = designers.filter((d) => getDesignerWorkload(d.id) > 5);
        const unassignedUrgent = tasks.filter((t) =>
          !t.assigneeId && ['urgent', 'high'].includes(t.priority) && !['completed', 'approved'].includes(t.status),
        );
        const nearDeadline = tasks.filter((t) =>
          t.expectedTimeline.endDate &&
          !['completed', 'approved'].includes(t.status) &&
          isBefore(new Date(t.expectedTimeline.endDate), subDays(now, -2)) &&
          isAfter(new Date(t.expectedTimeline.endDate), now),
        );

        const alerts = [
          ...stuckInReview.map((t) => ({ type: 'warning' as const, msg: `"${t.title}" stuck in review for 2+ days`, taskId: t.id })),
          ...highRevisions.map((t) => ({ type: 'error' as const, msg: `"${t.title}" has ${t.revisions.length} revision rounds`, taskId: t.id })),
          ...overloadedDesigners.map((d) => ({ type: 'error' as const, msg: `${d.name} has ${getDesignerWorkload(d.id)} active tasks (overloaded)`, taskId: null })),
          ...unassignedUrgent.map((t) => ({ type: 'error' as const, msg: `Unassigned ${t.priority} task: "${t.title}"`, taskId: t.id })),
          ...nearDeadline.map((t) => ({ type: 'warning' as const, msg: `"${t.title}" due within 2 days`, taskId: t.id })),
        ];

        if (alerts.length === 0) return null;

        return (
          <Section title={`Bottleneck Alerts (${alerts.length})`} action={<AlertTriangle className="h-4 w-4 text-error" />}>
            <div className="space-y-2">
              {alerts.slice(0, 8).map((alert, i) => (
                <div
                  key={i}
                  onClick={() => alert.taskId && onOpenTask?.(alert.taskId)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm',
                    alert.type === 'error'
                      ? 'border-error/20 bg-error/5 text-error'
                      : 'border-warning/20 bg-warning/5 text-warning',
                    alert.taskId && 'cursor-pointer hover:shadow-sm',
                  )}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-text-primary text-xs">{alert.msg}</span>
                  {alert.taskId && <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />}
                </div>
              ))}
            </div>
          </Section>
        );
      })()}

      {/* Cross-Team Request Tracker */}
      <Section title="Cross-Team Requests">
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Request</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">From</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Assigned To</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Priority</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks
                  .filter((t) => {
                    const requester = getUserById(t.requesterId);
                    return requester && requester.department !== 'Design' && !t.parentTaskId;
                  })
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((task) => {
                    const requester = getUserById(task.requesterId);
                    const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
                    const space = getSpaceById(task.spaceId);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTask?.(task.id)}
                        className="border-b border-border-light cursor-pointer hover:bg-surface-secondary transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-text-primary truncate max-w-[200px]">{task.title}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {requester && <Avatar name={requester.name} size="sm" />}
                            <div>
                              <p className="text-xs text-text-primary">{requester?.name}</p>
                              <p className="text-[10px] text-text-tertiary">{requester?.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {assignee ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar name={assignee.name} size="sm" status={assignee.status} />
                              <span className="text-xs text-text-primary">{assignee.name}</span>
                            </div>
                          ) : (
                            <Badge variant="error">Unassigned</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusBadgeVariant(task.status)}>{statusLabel(task.status)}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={priorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">
                          {task.expectedTimeline.endDate
                            ? format(new Date(task.expectedTimeline.endDate), 'MMM d')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Overdue tasks */}
      {overdueTasks.length > 0 && (
        <Section
          title={`Overdue Tasks (${overdueTasks.length})`}
          action={<AlertTriangle className="h-4 w-4 text-error" />}
        >
          <div className="space-y-2">
            {overdueTasks.map((task) => (
              <TaskRow key={task.id} task={task} showAssignee onClick={() => onOpenTask?.(task.id)} />
            ))}
          </div>
        </Section>
      )}

      {/* Recent Activity */}
      <Section title="Recent Activity">
        <div className="space-y-2">
          {recentTasks.map((task) => (
            <TaskRow key={task.id} task={task} showAssignee onClick={() => onOpenTask?.(task.id)} />
          ))}
        </div>
      </Section>

      {/* Create Request CTA for cross-team requests */}
      <Section title="Create Cross-Team Request">
        <motion.div
          {...fadeUp}
          className="rounded-xl border-2 border-dashed border-primary/30 bg-primary-light p-6 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Submit a Design Request</h3>
          <p className="mt-1 text-xs text-text-secondary max-w-md mx-auto">
            Need design work from another team? Create a cross-team request with details, priority, and attachments.
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setShowRequestForm(true)}>
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </motion.div>
      </Section>

      {/* Quick Actions */}
      <Section title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm" onClick={() => onNavigate?.('my-tasks')}>
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('reports')}>
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('team')}>
            <Users className="h-4 w-4" />
            Manage Team
          </Button>
        </div>
      </Section>

      {/* Request Form Modal */}
      <CreateRequestForm
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        currentUserId={user.id}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Designer Dashboard
// ---------------------------------------------------------------------------

function DesignerDashboard({ user, onOpenTask }: { user: User; onOpenTask?: (taskId: string) => void }) {
  const tasks = useTaskStore((s) => s.tasks);
  const startTimer = useTaskStore((s) => s.startTimer);
  const getDesignerReport = useReportStore((s) => s.getDesignerReport);

  const now = new Date();

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === user.id),
    [tasks, user.id],
  );

  const runningTask = useMemo(
    () => myTasks.find((t) => t.timerRunning),
    [myTasks],
  );

  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {
      'in-progress': [],
      todo: [],
      'in-review': [],
      'revision-requested': [],
    };
    myTasks.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [myTasks]);

  const upcoming = useMemo(
    () =>
      myTasks
        .filter(
          (t) =>
            t.expectedTimeline.endDate &&
            !['completed', 'approved'].includes(t.status),
        )
        .sort(
          (a, b) =>
            new Date(a.expectedTimeline.endDate!).getTime() -
            new Date(b.expectedTimeline.endDate!).getTime(),
        )
        .slice(0, 5),
    [myTasks],
  );

  const report = useMemo(() => getDesignerReport(user.id), [user.id, getDesignerReport]);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Welcome */}
      <motion.div {...fadeUp}>
        <h1 className="text-xl font-bold text-text-primary">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="text-sm text-text-secondary">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
      </motion.div>

      {/* Timer Widget */}
      {runningTask && <TimerWidget task={runningTask} />}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Completed (30d)"
          value={report.tasksCompleted}
          color="bg-success"
        />
        <StatCard
          icon={Clock}
          label="Avg Task Time"
          value={formatTime(report.avgTaskTime)}
          color="bg-secondary"
        />
        <StatCard
          icon={TrendingUp}
          label="Revision Rate"
          value={`${Math.round(report.revisionRate * 100)}%`}
          color="bg-warning"
        />
        <StatCard
          icon={Activity}
          label="Active Tasks"
          value={report.activeTasksCount}
          color="bg-primary"
        />
      </div>

      {/* Task groups */}
      <div className="grid gap-6 lg:grid-cols-3">
        {(['in-progress', 'todo', 'in-review'] as const).map((status) => {
          const list = grouped[status] ?? [];
          return (
            <Section key={status} title={`${statusLabel(status)} (${list.length})`}>
              {list.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-surface-secondary p-4 text-center text-xs text-text-tertiary">
                  No tasks
                </p>
              ) : (
                <div className="space-y-2">
                  {list.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onOpenTask?.(task.id)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm transition-colors hover:border-primary/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {task.title}
                        </p>
                        {task.expectedTimeline.endDate && (
                          <p className="text-xs text-text-tertiary">
                            Due {format(new Date(task.expectedTimeline.endDate), 'MMM d')}
                          </p>
                        )}
                      </div>
                      <Badge variant={priorityBadgeVariant(task.priority)}>
                        {task.priority}
                      </Badge>
                      {!task.timerRunning && status === 'in-progress' && (
                        <button
                          onClick={() => startTimer(task.id)}
                          className="rounded-md p-1.5 text-text-tertiary hover:bg-primary-light hover:text-primary transition-colors"
                          title="Start timer"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          );
        })}
      </div>

      {/* Revision Requested */}
      {(grouped['revision-requested'] ?? []).length > 0 && (
        <Section title={`Revision Requested (${grouped['revision-requested'].length})`}>
          <div className="space-y-2">
            {grouped['revision-requested'].map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => onOpenTask?.(task.id)} />
            ))}
          </div>
        </Section>
      )}

      {/* Upcoming Deadlines */}
      <Section title="Upcoming Deadlines">
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-secondary p-4 text-center text-xs text-text-tertiary">
            No upcoming deadlines
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => onOpenTask?.(task.id)} />
            ))}
          </div>
        )}
      </Section>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Requester Dashboard
// ---------------------------------------------------------------------------

function RequesterDashboard({ user, onOpenTask }: { user: User; onOpenTask?: (taskId: string) => void }) {
  const tasks = useTaskStore((s) => s.tasks);
  const spaces = useSpaceStore((s) => s.spaces);
  const getSpacesByUser = useSpaceStore((s) => s.getSpacesByUser);

  const [showRequestForm, setShowRequestForm] = useState(false);

  const now = new Date();

  const myRequests = useMemo(
    () => tasks.filter((t) => t.requesterId === user.id),
    [tasks, user.id],
  );

  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    myRequests.forEach((t) => {
      if (!groups[t.status]) groups[t.status] = [];
      groups[t.status].push(t);
    });
    return groups;
  }, [myRequests]);

  const pendingApprovals = useMemo(
    () => myRequests.filter((t) => t.status === 'in-review'),
    [myRequests],
  );

  const mySpaces = useMemo(() => getSpacesByUser(user.id), [user.id, getSpacesByUser]);

  const spaceStats = useMemo(
    () =>
      mySpaces.map((space) => ({
        space,
        taskCount: tasks.filter((t) => t.spaceId === space.id).length,
        activeCount: tasks.filter(
          (t) =>
            t.spaceId === space.id &&
            !['completed', 'approved'].includes(t.status),
        ).length,
      })),
    [mySpaces, tasks],
  );

  const activeStatuses: TaskStatus[] = ['in-progress', 'todo', 'in-review', 'revision-requested', 'backlog'];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Welcome */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-secondary">
            {format(now, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowRequestForm(true)}>
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </motion.div>

      {/* New Request CTA banner */}
      <motion.div
        {...fadeUp}
        className="rounded-xl border-2 border-dashed border-primary/30 bg-primary-light p-5 flex items-center gap-4"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Send className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">Need a design?</h3>
          <p className="text-xs text-text-secondary">Submit a request with details, priority level, and reference files.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowRequestForm(true)}>
          <Plus className="h-4 w-4" />
          Create Request
        </Button>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Send}
          label="Total Requests"
          value={myRequests.length}
          color="bg-primary"
        />
        <StatCard
          icon={Activity}
          label="Active"
          value={myRequests.filter((t) => activeStatuses.includes(t.status)).length}
          color="bg-warning"
        />
        <StatCard
          icon={Inbox}
          label="Pending Approval"
          value={pendingApprovals.length}
          color="bg-secondary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={myRequests.filter((t) => t.status === 'completed').length}
          color="bg-success"
        />
      </div>

      {/* My Requests by status */}
      <Section title="My Requests">
        {activeStatuses.map((status) => {
          const list = grouped[status];
          if (!list || list.length === 0) return null;
          return (
            <div key={status} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                {statusLabel(status)} ({list.length})
              </p>
              {list.map((task) => (
                <TaskRow key={task.id} task={task} showAssignee onClick={() => onOpenTask?.(task.id)} />
              ))}
            </div>
          );
        })}
        {myRequests.length === 0 && (
          <p className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center text-sm text-text-tertiary">
            You haven&apos;t created any requests yet.
          </p>
        )}
      </Section>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Section title={`Pending Your Review (${pendingApprovals.length})`}>
          <div className="space-y-2">
            {pendingApprovals.map((task) => (
              <TaskRow key={task.id} task={task} showAssignee onClick={() => onOpenTask?.(task.id)} />
            ))}
          </div>
        </Section>
      )}

      {/* Space Overview */}
      <Section title="Space Overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spaceStats.map(({ space, taskCount, activeCount }) => (
            <motion.div
              key={space.id}
              {...fadeUp}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className={cn('h-3 w-3 rounded-full', space.color)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{space.name}</p>
                <p className="text-xs text-text-tertiary">
                  {taskCount} task{taskCount !== 1 ? 's' : ''} &middot; {activeCount} active
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary" />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Request Form Modal */}
      <CreateRequestForm
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        currentUserId={user.id}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

interface DashboardProps {
  onOpenTask?: (taskId: string) => void;
  onNavigate?: (page: string) => void;
}

export default function DashboardPage({ onOpenTask, onNavigate }: DashboardProps) {
  const currentUser = useAuthStore((s) => s.currentUser);

  if (!currentUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-tertiary">Please log in to view your dashboard.</p>
      </div>
    );
  }

  const role = currentUser.role;

  if (role === 'super_admin' || role === 'admin') {
    return <AdminDashboard user={currentUser} onOpenTask={onOpenTask} onNavigate={onNavigate} />;
  }

  if (role === 'designer') {
    return <DesignerDashboard user={currentUser} onOpenTask={onOpenTask} />;
  }

  return <RequesterDashboard user={currentUser} onOpenTask={onOpenTask} />;
}
