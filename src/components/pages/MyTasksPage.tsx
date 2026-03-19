'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  List,
  LayoutGrid,
  ChevronDown,
  Clock,
  Play,
  Timer,
  GripVertical,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { format, isBefore } from 'date-fns';

import { useAuthStore } from '@/stores/useAuthStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatTime } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ALL_STATUSES: TaskStatus[] = [
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

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-gray-400',
  todo: 'bg-blue-400',
  'in-progress': 'bg-yellow-400',
  'in-review': 'bg-purple-400',
  'revision-requested': 'bg-orange-400',
  approved: 'bg-emerald-400',
  completed: 'bg-green-500',
};

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
  p: TaskPriority,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' {
  const map: Record<TaskPriority, 'error' | 'warning' | 'info' | 'default'> = {
    urgent: 'error',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };
  return map[p] ?? 'default';
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type SortKey = 'date' | 'priority' | 'deadline';
type ViewMode = 'list' | 'board';

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

// ---------------------------------------------------------------------------
// Dropdown Select
// ---------------------------------------------------------------------------

function SelectDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-xs font-medium text-text-primary outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View — Table Row
// ---------------------------------------------------------------------------

function ListRow({
  task,
  subtasks,
  onOpenTask,
  depth = 0,
}: {
  task: Task;
  subtasks: Task[];
  onOpenTask: (taskId: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const getUserById = useAuthStore((s) => s.getUserById);
  const getSpaceById = useSpaceStore((s) => s.getSpaceById);

  const space = getSpaceById(task.spaceId);
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;

  const isOverdue =
    task.expectedTimeline.endDate &&
    !['completed', 'approved'].includes(task.status) &&
    isBefore(new Date(task.expectedTimeline.endDate), new Date());

  const hasChildren = subtasks.length > 0;

  return (
    <>
      <motion.tr
        {...fadeUp}
        onClick={() => onOpenTask(task.id)}
        className={cn(
          'group cursor-pointer border-b border-border-light transition-colors hover:bg-surface-secondary',
          isOverdue && 'bg-error/5',
        )}
      >
        {/* Title */}
        <td className="py-3 pl-4 pr-2">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="rounded p-0.5 text-text-tertiary hover:bg-surface-tertiary"
              >
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
                />
              </button>
            ) : (
              <span className="w-[18px]" />
            )}
            <div className={cn('h-2 w-2 shrink-0 rounded-full', space?.color ?? 'bg-gray-400')} />
            <span className="truncate text-sm font-medium text-text-primary group-hover:text-primary">
              {task.title}
            </span>
          </div>
        </td>

        {/* Priority */}
        <td className="px-2 py-3">
          <Badge variant={priorityBadgeVariant(task.priority)}>{task.priority}</Badge>
        </td>

        {/* Status */}
        <td className="px-2 py-3">
          <Badge variant={statusBadgeVariant(task.status)}>{STATUS_LABELS[task.status]}</Badge>
        </td>

        {/* Assignee */}
        <td className="px-2 py-3">
          {assignee ? (
            <Avatar name={assignee.name} size="sm" status={assignee.status} />
          ) : (
            <span className="text-xs text-text-tertiary">Unassigned</span>
          )}
        </td>

        {/* Due date */}
        <td className="px-2 py-3">
          {task.expectedTimeline.endDate ? (
            <span
              className={cn(
                'text-xs',
                isOverdue ? 'font-medium text-error' : 'text-text-secondary',
              )}
            >
              {format(new Date(task.expectedTimeline.endDate), 'MMM d')}
            </span>
          ) : (
            <span className="text-xs text-text-tertiary">--</span>
          )}
        </td>

        {/* Time spent */}
        <td className="px-2 py-3">
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            {task.timerRunning && <Play className="h-3 w-3 fill-primary text-primary" />}
            {task.totalTimeSpent > 0 ? formatTime(task.totalTimeSpent) : '--'}
          </span>
        </td>

        {/* Actions */}
        <td className="px-2 py-3 pr-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenTask(task.id);
            }}
            className="rounded-md px-2 py-1 text-xs text-text-tertiary opacity-0 transition-all hover:bg-surface-tertiary hover:text-text-primary group-hover:opacity-100"
          >
            Open
          </button>
        </td>
      </motion.tr>

      {/* Subtasks */}
      {expanded &&
        subtasks.map((sub) => (
          <ListRow
            key={sub.id}
            task={sub}
            subtasks={[]}
            onOpenTask={onOpenTask}
            depth={depth + 1}
          />
        ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function ListView({
  tasks,
  allTasks,
  onOpenTask,
}: {
  tasks: Task[];
  allTasks: Task[];
  onOpenTask: (taskId: string) => void;
}) {
  // Only show top-level tasks; subtasks are nested
  const topLevel = tasks.filter((t) => !t.parentTaskId);
  const getSubtasks = useCallback(
    (parentId: string) => allTasks.filter((t) => t.parentTaskId === parentId),
    [allTasks],
  );

  if (topLevel.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-secondary py-16">
        <List className="mb-2 h-8 w-8 text-text-tertiary" />
        <p className="text-sm text-text-tertiary">No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left">
              <th className="py-2.5 pl-4 pr-2 text-xs font-medium text-text-tertiary">Task</th>
              <th className="px-2 py-2.5 text-xs font-medium text-text-tertiary">Priority</th>
              <th className="px-2 py-2.5 text-xs font-medium text-text-tertiary">Status</th>
              <th className="px-2 py-2.5 text-xs font-medium text-text-tertiary">Assignee</th>
              <th className="px-2 py-2.5 text-xs font-medium text-text-tertiary">Due</th>
              <th className="px-2 py-2.5 text-xs font-medium text-text-tertiary">Time</th>
              <th className="px-2 py-2.5 pr-4 text-xs font-medium text-text-tertiary" />
            </tr>
          </thead>
          <tbody>
            {topLevel.map((task) => (
              <ListRow
                key={task.id}
                task={task}
                subtasks={getSubtasks(task.id)}
                onOpenTask={onOpenTask}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board View — Card
// ---------------------------------------------------------------------------

function BoardCard({
  task,
  onOpenTask,
}: {
  task: Task;
  onOpenTask: (taskId: string) => void;
}) {
  const getUserById = useAuthStore((s) => s.getUserById);
  const getSpaceById = useSpaceStore((s) => s.getSpaceById);

  const space = getSpaceById(task.spaceId);
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;

  const isOverdue =
    task.expectedTimeline.endDate &&
    !['completed', 'approved'].includes(task.status) &&
    isBefore(new Date(task.expectedTimeline.endDate), new Date());

  return (
    <motion.div
      {...fadeUp}
      onClick={() => onOpenTask(task.id)}
      className={cn(
        'group cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md',
        isOverdue && 'border-error/30',
      )}
    >
      {/* Drag handle hint */}
      <div className="mb-2 flex items-center justify-between">
        <GripVertical className="h-3.5 w-3.5 text-text-tertiary/50 opacity-0 transition-opacity group-hover:opacity-100" />
        <Badge variant={priorityBadgeVariant(task.priority)}>{task.priority}</Badge>
      </div>

      {/* Title */}
      <p className="mb-2 text-sm font-medium leading-tight text-text-primary">{task.title}</p>

      {/* Space dot + name */}
      <div className="mb-3 flex items-center gap-1.5">
        <div className={cn('h-1.5 w-1.5 rounded-full', space?.color ?? 'bg-gray-400')} />
        <span className="text-[10px] text-text-tertiary">{space?.name}</span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assignee ? (
            <Avatar name={assignee.name} size="sm" />
          ) : (
            <span className="text-[10px] text-text-tertiary">Unassigned</span>
          )}
          {task.expectedTimeline.endDate && (
            <span
              className={cn(
                'text-[10px]',
                isOverdue ? 'font-medium text-error' : 'text-text-tertiary',
              )}
            >
              {format(new Date(task.expectedTimeline.endDate), 'MMM d')}
            </span>
          )}
        </div>
        {task.timerRunning && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
            <Timer className="h-3 w-3" /> Live
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Board View
// ---------------------------------------------------------------------------

function BoardView({
  tasks,
  onOpenTask,
}: {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}) {
  const columns = ALL_STATUSES;

  // Only show top-level in board
  const topLevel = tasks.filter((t) => !t.parentTaskId);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const columnTasks = topLevel.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className="flex w-64 shrink-0 flex-col rounded-xl bg-surface-secondary"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-3">
              <div className={cn('h-2.5 w-2.5 rounded-full', STATUS_COLORS[status])} />
              <span className="text-xs font-semibold text-text-primary">
                {STATUS_LABELS[status]}
              </span>
              <span className="ml-auto rounded-full bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                {columnTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 px-2 pb-3">
              {columnTasks.length === 0 ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-[10px] text-text-tertiary">No tasks</p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <BoardCard key={task.id} task={task} onOpenTask={onOpenTask} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

interface MyTasksPageProps {
  onOpenTask: (taskId: string) => void;
}

export default function MyTasksPage({ onOpenTask }: MyTasksPageProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const allTasks = useTaskStore((s) => s.tasks);
  const spaces = useSpaceStore((s) => s.spaces);

  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSpace, setFilterSpace] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');

  // Determine which tasks to show based on role
  const baseTasks = useMemo(() => {
    if (!currentUser) return [];
    const role = currentUser.role;
    if (role === 'super_admin' || role === 'admin') return allTasks;
    if (role === 'designer') return allTasks.filter((t) => t.assigneeId === currentUser.id);
    // requester sees tasks they created
    return allTasks.filter((t) => t.requesterId === currentUser.id);
  }, [allTasks, currentUser]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = baseTasks;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    if (filterStatus) {
      result = result.filter((t) => t.status === filterStatus);
    }

    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }

    if (filterSpace) {
      result = result.filter((t) => t.spaceId === filterSpace);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'priority') {
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      }
      if (sortBy === 'deadline') {
        const aDate = a.expectedTimeline.endDate
          ? new Date(a.expectedTimeline.endDate).getTime()
          : Infinity;
        const bDate = b.expectedTimeline.endDate
          ? new Date(b.expectedTimeline.endDate).getTime()
          : Infinity;
        return aDate - bDate;
      }
      // default: date (most recently updated first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [baseTasks, search, filterStatus, filterPriority, filterSpace, sortBy]);

  if (!currentUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-text-tertiary">Please log in to view tasks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">My Tasks</h1>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-0.5">
          <button
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'list'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-surface-secondary',
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setView('board')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'board'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-surface-secondary',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-text-tertiary" />

          <SelectDropdown
            label="Status"
            value={filterStatus}
            options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            onChange={setFilterStatus}
          />

          <SelectDropdown
            label="Priority"
            value={filterPriority}
            options={[
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            onChange={setFilterPriority}
          />

          <SelectDropdown
            label="Space"
            value={filterSpace}
            options={spaces.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setFilterSpace}
          />

          <div className="h-4 w-px bg-border" />

          <SelectDropdown
            label="Sort"
            value={sortBy}
            options={[
              { value: 'date', label: 'Recently updated' },
              { value: 'priority', label: 'Priority' },
              { value: 'deadline', label: 'Deadline' },
            ]}
            onChange={(v) => setSortBy(v as SortKey)}
          />
        </div>

        {/* Active filter count */}
        {(filterStatus || filterPriority || filterSpace || search) && (
          <button
            onClick={() => {
              setSearch('');
              setFilterStatus('');
              setFilterPriority('');
              setFilterSpace('');
            }}
            className="text-xs text-primary hover:text-primary-dark"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Task count */}
      <p className="text-xs text-text-tertiary">
        {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        {baseTasks.length !== filteredTasks.length && ` of ${baseTasks.length} total`}
      </p>

      {/* View */}
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ListView tasks={filteredTasks} allTasks={allTasks} onOpenTask={onOpenTask} />
          </motion.div>
        ) : (
          <motion.div
            key="board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <BoardView tasks={filteredTasks} onOpenTask={onOpenTask} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
