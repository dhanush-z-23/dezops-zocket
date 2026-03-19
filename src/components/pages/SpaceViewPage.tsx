'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Users,
  List,
  LayoutGrid,
  GanttChart,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Circle,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Trash2,
} from 'lucide-react';
import { differenceInDays, format, isAfter, isBefore, parseISO, startOfDay, addDays } from 'date-fns';

import { useSpaceStore } from '@/stores/useSpaceStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { cn, formatTime, formatDate, getStatusColor, getPriorityColor, generateId } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, Role } from '@/types';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ViewTab = 'list' | 'board' | 'timeline';

const STATUS_ORDER: TaskStatus[] = [
  'backlog',
  'todo',
  'in-progress',
  'in-review',
  'revision-requested',
  'approved',
  'completed',
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'revision-requested': 'Revision',
  approved: 'Approved',
  completed: 'Completed',
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'designer', label: 'Designer' },
  { value: 'requester', label: 'Requester' },
];

const roleVariant = (r: Role) => {
  if (r === 'super_admin' || r === 'admin') return 'purple' as const;
  if (r === 'designer') return 'info' as const;
  return 'default' as const;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SpaceViewPageProps {
  spaceId: string;
  onOpenTask: (taskId: string) => void;
}

export function SpaceViewPage({ spaceId, onOpenTask }: SpaceViewPageProps) {
  const space = useSpaceStore((s) => s.getSpaceById(spaceId));
  const getTasksBySpace = useTaskStore((s) => s.getTasksBySpace);
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);
  const currentUser = useAuthStore((s) => s.currentUser);
  const getUserById = useAuthStore((s) => s.getUserById);

  const [viewTab, setViewTab] = useState<ViewTab>('list');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);

  const tasks = useMemo(() => getTasksBySpace(spaceId), [getTasksBySpace, spaceId]);
  const parentTasks = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  const isAdmin =
    currentUser &&
    space?.members.some(
      (m) =>
        m.userId === currentUser.id &&
        (m.role === 'super_admin' || m.role === 'admin'),
    );

  if (!space) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-text-secondary">Space not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* -------- Header -------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={cn('h-3 w-3 shrink-0 rounded-full', space.color)} />
            <h1 className="truncate text-2xl font-bold text-text-primary">
              {space.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{space.description}</p>

          {/* Member avatars */}
          <div className="mt-3 flex items-center gap-1">
            <button
              onClick={() => setShowMemberList(true)}
              className="flex items-center -space-x-1.5 rounded-full p-0.5 hover:bg-surface-secondary transition-colors"
            >
              {space.members.slice(0, 5).map((m) => {
                const user = getUserById(m.userId);
                if (!user) return null;
                return (
                  <Avatar
                    key={m.userId}
                    name={user.name}
                    size="sm"
                    status={user.status}
                    className="ring-2 ring-white"
                  />
                );
              })}
              {space.members.length > 5 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-tertiary text-[10px] font-medium text-text-secondary ring-2 ring-white">
                  +{space.members.length - 5}
                </span>
              )}
            </button>
            <span className="ml-2 text-xs text-text-tertiary">
              {space.members.length} member{space.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManageMembers(true)}
            >
              <Users className="h-3.5 w-3.5" />
              Manage Members
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreateTask(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* -------- Tab Toggle -------- */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1">
        {([
          { key: 'list' as ViewTab, icon: List, label: 'List' },
          { key: 'board' as ViewTab, icon: LayoutGrid, label: 'Board' },
          { key: 'timeline' as ViewTab, icon: GanttChart, label: 'Timeline' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setViewTab(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              viewTab === key
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* -------- View Content -------- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {viewTab === 'list' && (
            <ListView
              tasks={parentTasks}
              getSubtasks={getSubtasks}
              getUserById={getUserById}
              onOpenTask={onOpenTask}
              updateTaskStatus={updateTaskStatus}
            />
          )}
          {viewTab === 'board' && (
            <BoardView
              tasks={tasks}
              getUserById={getUserById}
              onOpenTask={onOpenTask}
            />
          )}
          {viewTab === 'timeline' && (
            <TimelineView
              tasks={parentTasks}
              getUserById={getUserById}
              onOpenTask={onOpenTask}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* -------- Modals -------- */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        spaceId={spaceId}
        space={space}
        parentTasks={parentTasks}
      />

      {isAdmin && (
        <ManageMembersModal
          isOpen={showManageMembers}
          onClose={() => setShowManageMembers(false)}
          spaceId={spaceId}
          space={space}
        />
      )}

      <MemberListModal
        isOpen={showMemberList}
        onClose={() => setShowMemberList(false)}
        space={space}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status dropdown inline
// ---------------------------------------------------------------------------

function StatusDropdown({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (s: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
          getStatusColor(value),
        )}
      >
        {STATUS_LABELS[value]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-white py-1 shadow-lg">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-surface-secondary',
                  s === value && 'bg-surface-tertiary font-medium',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    getStatusColor(s).split(' ')[1],
                  )}
                />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function ListView({
  tasks,
  getSubtasks,
  getUserById,
  onOpenTask,
  updateTaskStatus,
}: {
  tasks: Task[];
  getSubtasks: (parentId: string) => Task[];
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  onOpenTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-text-primary">No tasks yet</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Create your first task to get started.
        </p>
      </div>
    );
  }

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_100px_130px_100px_110px_90px] gap-2 border-b border-border bg-surface-secondary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
        <span className="w-6" />
        <span>Task</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Assignee</span>
        <span>Deadline</span>
        <span className="text-right">Time</span>
      </div>

      {/* Rows */}
      {tasks.map((task) => {
        const subtasks = getSubtasks(task.id);
        const hasSubtasks = subtasks.length > 0;
        const isExpanded = expanded[task.id];

        return (
          <div key={task.id}>
            <TaskRow
              task={task}
              getUserById={getUserById}
              onOpenTask={onOpenTask}
              updateTaskStatus={updateTaskStatus}
              hasSubtasks={hasSubtasks}
              isExpanded={isExpanded}
              onToggle={() => toggleExpand(task.id)}
              depth={0}
            />
            <AnimatePresence>
              {isExpanded &&
                subtasks.map((sub) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TaskRow
                      task={sub}
                      getUserById={getUserById}
                      onOpenTask={onOpenTask}
                      updateTaskStatus={updateTaskStatus}
                      hasSubtasks={false}
                      isExpanded={false}
                      onToggle={() => {}}
                      depth={1}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  getUserById,
  onOpenTask,
  updateTaskStatus,
  hasSubtasks,
  isExpanded,
  onToggle,
  depth,
}: {
  task: Task;
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  onOpenTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  hasSubtasks: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  depth: number;
}) {
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
  const deadline = task.expectedTimeline.endDate;
  const isOverdue =
    deadline && task.status !== 'completed' && isAfter(new Date(), parseISO(deadline));

  return (
    <div
      onClick={() => onOpenTask(task.id)}
      className={cn(
        'grid cursor-pointer grid-cols-[auto_1fr_100px_130px_100px_110px_90px] items-center gap-2 border-b border-border-light px-4 py-2.5 transition-colors hover:bg-surface-secondary',
        depth > 0 && 'bg-surface-secondary/50 pl-10',
      )}
    >
      {/* Expand / Checkbox area */}
      <div className="flex w-6 items-center justify-center">
        {hasSubtasks ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="rounded p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <Circle className="h-3.5 w-3.5 text-text-tertiary" />
        )}
      </div>

      {/* Title */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {task.title}
        </p>
        {task.tags.length > 0 && (
          <div className="mt-0.5 flex gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] text-text-tertiary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
            getPriorityColor(task.priority),
          )}
        >
          {task.priority}
        </span>
      </div>

      {/* Status */}
      <div>
        <StatusDropdown
          value={task.status}
          onChange={(s) => updateTaskStatus(task.id, s)}
        />
      </div>

      {/* Assignee */}
      <div>
        {assignee ? (
          <Avatar name={assignee.name} size="sm" status={assignee.status} />
        ) : (
          <span className="text-xs text-text-tertiary">Unassigned</span>
        )}
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-1 text-xs">
        {deadline ? (
          <span className={cn(isOverdue ? 'text-error font-medium' : 'text-text-secondary')}>
            {format(parseISO(deadline), 'MMM d')}
            {isOverdue && <AlertCircle className="ml-1 inline h-3 w-3" />}
          </span>
        ) : (
          <span className="text-text-tertiary">--</span>
        )}
      </div>

      {/* Time */}
      <div className="text-right text-xs text-text-secondary">
        {task.totalTimeSpent > 0 ? formatTime(task.totalTimeSpent) : '--'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board View (Kanban)
// ---------------------------------------------------------------------------

function BoardView({
  tasks,
  getUserById,
  onOpenTask,
}: {
  tasks: Task[];
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  onOpenTask: (taskId: string) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      'in-progress': [],
      'in-review': [],
      'revision-requested': [],
      approved: [],
      completed: [],
    };
    tasks.forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tasks]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const column = grouped[status];
        return (
          <div
            key={status}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-surface-secondary"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  getStatusColor(status).split(' ')[1],
                )}
              />
              <span className="text-xs font-semibold text-text-primary">
                {STATUS_LABELS[status]}
              </span>
              <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-text-secondary shadow-sm">
                {column.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2">
              {column.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-tertiary">
                  No tasks
                </div>
              ) : (
                column.map((task) => {
                  const assignee = task.assigneeId
                    ? getUserById(task.assigneeId)
                    : null;
                  const deadline = task.expectedTimeline.endDate;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      onClick={() => onOpenTask(task.id)}
                      className="cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary leading-snug">
                          {task.title}
                        </p>
                        <span
                          className={cn(
                            'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                            getPriorityColor(task.priority).split(' ')[1],
                          )}
                        />
                      </div>

                      {task.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] text-text-tertiary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center justify-between">
                        {assignee ? (
                          <Avatar
                            name={assignee.name}
                            size="sm"
                            status={assignee.status}
                          />
                        ) : (
                          <span className="text-[10px] text-text-tertiary">
                            Unassigned
                          </span>
                        )}
                        {deadline && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(deadline), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline View (Gantt-like)
// ---------------------------------------------------------------------------

function TimelineView({
  tasks,
  getUserById,
  onOpenTask,
}: {
  tasks: Task[];
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  onOpenTask: (taskId: string) => void;
}) {
  // Build date range from tasks
  const { rangeStart, rangeEnd, totalDays, dayWidth, days } = useMemo(() => {
    const allDates: Date[] = [];
    tasks.forEach((t) => {
      if (t.expectedTimeline.startDate) allDates.push(parseISO(t.expectedTimeline.startDate));
      if (t.expectedTimeline.endDate) allDates.push(parseISO(t.expectedTimeline.endDate));
      if (t.designTimeline.startDate) allDates.push(parseISO(t.designTimeline.startDate));
      if (t.designTimeline.endDate) allDates.push(parseISO(t.designTimeline.endDate));
    });
    if (allDates.length === 0) {
      const now = new Date();
      return {
        rangeStart: startOfDay(now),
        rangeEnd: addDays(now, 30),
        totalDays: 30,
        dayWidth: 32,
        days: Array.from({ length: 30 }, (_, i) => addDays(now, i)),
      };
    }
    const min = allDates.reduce((a, b) => (a < b ? a : b));
    const max = allDates.reduce((a, b) => (a > b ? a : b));
    const start = addDays(startOfDay(min), -2);
    const end = addDays(startOfDay(max), 4);
    const total = differenceInDays(end, start) + 1;
    const w = 32;
    return {
      rangeStart: start,
      rangeEnd: end,
      totalDays: total,
      dayWidth: w,
      days: Array.from({ length: total }, (_, i) => addDays(start, i)),
    };
  }, [tasks]);

  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, rangeStart);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <GanttChart className="mb-3 h-8 w-8 text-text-tertiary" />
        <p className="text-sm text-text-secondary">No tasks to display on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-full bg-primary/30" />
          Expected Timeline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-full bg-secondary/50" />
          Design Timeline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-px bg-error" />
          Today
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="inline-flex min-w-full">
          {/* Left labels */}
          <div className="sticky left-0 z-10 w-52 shrink-0 border-r border-border bg-white">
            <div className="h-8 border-b border-border bg-surface-secondary" />
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="flex h-14 cursor-pointer items-center border-b border-border-light px-3 hover:bg-surface-secondary transition-colors"
              >
                <p className="truncate text-xs font-medium text-text-primary">
                  {task.title}
                </p>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div style={{ width: totalDays * dayWidth }}>
            {/* Day headers */}
            <div className="flex h-8 border-b border-border bg-surface-secondary">
              {days.map((d, i) => (
                <div
                  key={i}
                  className="flex shrink-0 items-center justify-center border-r border-border-light text-[9px] text-text-tertiary"
                  style={{ width: dayWidth }}
                >
                  {format(d, 'd')}
                </div>
              ))}
            </div>

            {/* Task bars */}
            {tasks.map((task) => {
              const expStart = task.expectedTimeline.startDate
                ? differenceInDays(parseISO(task.expectedTimeline.startDate), rangeStart)
                : null;
              const expEnd = task.expectedTimeline.endDate
                ? differenceInDays(parseISO(task.expectedTimeline.endDate), rangeStart)
                : null;
              const desStart = task.designTimeline.startDate
                ? differenceInDays(parseISO(task.designTimeline.startDate), rangeStart)
                : null;
              const desEnd = task.designTimeline.endDate
                ? differenceInDays(parseISO(task.designTimeline.endDate), rangeStart)
                : null;

              return (
                <div
                  key={task.id}
                  className="relative flex h-14 items-center border-b border-border-light"
                  style={{ width: totalDays * dayWidth }}
                >
                  {/* Today marker */}
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-error/60 z-[1]"
                      style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                    />
                  )}

                  {/* Expected timeline bar */}
                  {expStart !== null && expEnd !== null && (
                    <div
                      className="absolute h-3 rounded-full bg-primary/25"
                      style={{
                        left: expStart * dayWidth,
                        width: (expEnd - expStart + 1) * dayWidth,
                        top: 14,
                      }}
                    />
                  )}

                  {/* Design timeline bar */}
                  {desStart !== null && desEnd !== null && (
                    <div
                      className="absolute h-3 rounded-full bg-secondary/50"
                      style={{
                        left: desStart * dayWidth,
                        width: (desEnd - desStart + 1) * dayWidth,
                        top: 30,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Task Modal
// ---------------------------------------------------------------------------

function CreateTaskModal({
  isOpen,
  onClose,
  spaceId,
  space,
  parentTasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  space: ReturnType<typeof useSpaceStore.getState>['spaces'][number];
  parentTasks: Task[];
}) {
  const createTask = useTaskStore((s) => s.createTask);
  const currentUser = useAuthStore((s) => s.currentUser);
  const getUserById = useAuthStore((s) => s.getUserById);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [parentTaskId, setParentTaskId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const designers = useMemo(
    () =>
      space.members
        .filter((m) => m.role === 'designer')
        .map((m) => getUserById(m.userId))
        .filter(Boolean) as NonNullable<ReturnType<typeof getUserById>>[],
    [space.members, getUserById],
  );

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssigneeId('');
    setStartDate('');
    setEndDate('');
    setTagsInput('');
    setParentTaskId('');
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (startDate && endDate && isAfter(parseISO(startDate), parseISO(endDate))) {
      e.endDate = 'End date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !currentUser) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const task = createTask({
      title: title.trim(),
      description: description.trim(),
      spaceId,
      parentTaskId: parentTaskId || null,
      assigneeId: assigneeId || null,
      requesterId: currentUser.id,
      priority,
      status: 'backlog',
      attachments: [],
      expectedTimeline: {
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      },
      designTimeline: { startDate: null, endDate: null },
      tags,
    });

    if (assigneeId) {
      addNotification(
        assigneeId,
        'task_assigned',
        'New task assigned',
        `You've been assigned "${task.title}"`,
        task.id,
      );
    }

    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create Task"
      size="xl"
    >
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Description"
          placeholder="Describe the task..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={PRIORITY_OPTIONS}
          />
          <Select
            label="Assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...designers.map((d) => ({
                value: d.id,
                label: `${d.name}${d.status === 'blocked' ? ' (Blocked)' : d.status === 'busy' ? ' (Busy)' : ''}`,
              })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expected Start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Expected End"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
          />
        </div>
        <Input
          label="Tags"
          placeholder="Comma-separated tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
        <Select
          label="Parent Task (optional)"
          value={parentTaskId}
          onChange={(e) => setParentTaskId(e.target.value)}
          options={[
            { value: '', label: 'None (top-level task)' },
            ...parentTasks.map((t) => ({ value: t.id, label: t.title })),
          ]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Task</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Manage Members Modal (Admin)
// ---------------------------------------------------------------------------

function ManageMembersModal({
  isOpen,
  onClose,
  spaceId,
  space,
}: {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  space: ReturnType<typeof useSpaceStore.getState>['spaces'][number];
}) {
  const allUsers = useAuthStore((s) => s.allUsers);
  const getUserById = useAuthStore((s) => s.getUserById);
  const addMemberToSpace = useSpaceStore((s) => s.addMemberToSpace);
  const removeMemberFromSpace = useSpaceStore((s) => s.removeMemberFromSpace);
  const updateSpace = useSpaceStore((s) => s.updateSpace);

  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<Role>('designer');

  const nonMembers = useMemo(
    () =>
      allUsers.filter(
        (u) => !space.members.some((m) => m.userId === u.id),
      ),
    [allUsers, space.members],
  );

  const handleAdd = () => {
    if (!addUserId) return;
    addMemberToSpace(spaceId, addUserId, addRole);
    setAddUserId('');
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    const updatedMembers = space.members.map((m) =>
      m.userId === userId ? { ...m, role: newRole } : m,
    );
    updateSpace(spaceId, { members: updatedMembers });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Members" size="lg">
      <div className="space-y-4">
        {/* Add member */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Add Member"
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              placeholder="Select a user"
              options={nonMembers.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.role})`,
              }))}
            />
          </div>
          <Select
            label="Role"
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as Role)}
            options={ROLE_OPTIONS}
          />
          <Button size="sm" onClick={handleAdd} disabled={!addUserId}>
            Add
          </Button>
        </div>

        {/* Member list */}
        <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {space.members.map((m) => {
            const user = getUserById(m.userId);
            if (!user) return null;
            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <Avatar name={user.name} size="sm" status={user.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {user.name}
                  </p>
                  <p className="text-xs text-text-tertiary">{user.email}</p>
                </div>
                <select
                  value={m.role}
                  onChange={(e) =>
                    handleRoleChange(m.userId, e.target.value as Role)
                  }
                  className="h-7 rounded border border-border bg-white px-2 text-xs text-text-primary"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="designer">Designer</option>
                  <option value="requester">Requester</option>
                </select>
                <button
                  onClick={() => removeMemberFromSpace(spaceId, m.userId)}
                  className="rounded p-1 text-text-tertiary hover:bg-error/10 hover:text-error transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Member List Modal (non-admin)
// ---------------------------------------------------------------------------

function MemberListModal({
  isOpen,
  onClose,
  space,
}: {
  isOpen: boolean;
  onClose: () => void;
  space: ReturnType<typeof useSpaceStore.getState>['spaces'][number];
}) {
  const getUserById = useAuthStore((s) => s.getUserById);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Members" size="sm">
      <div className="max-h-72 divide-y divide-border overflow-y-auto">
        {space.members.map((m) => {
          const user = getUserById(m.userId);
          if (!user) return null;
          return (
            <div key={m.userId} className="flex items-center gap-3 py-2.5">
              <Avatar name={user.name} size="sm" status={user.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {user.name}
                </p>
              </div>
              <Badge variant={roleVariant(m.role)}>{m.role}</Badge>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
