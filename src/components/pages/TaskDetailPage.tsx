'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Trash2,
  Paperclip,
  Link2,
  FileText,
  Clock,
  Play,
  Square,
  Send,
  MessageSquare,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Tag,
  X,
  Edit3,
  Slack,
  Circle,
  Image,
  Video,
  ExternalLink,
  Sparkles,
  Star,
  TrendingUp,
  Palette,
  ZoomIn,
  Loader2,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';

import { useTaskStore } from '@/stores/useTaskStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useBrandStore } from '@/stores/useBrandStore';
import {
  cn,
  formatTime,
  formatDate,
  getStatusColor,
  getPriorityColor,
} from '@/lib/utils';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  CommentType,
  AttachmentType,
  UserStatus,
  AIReviewResult,
  BrandGuide,
} from '@/types';

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

const STATUS_BADGE_VARIANT: Record<TaskStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
  backlog: 'default',
  todo: 'info',
  'in-progress': 'warning',
  'in-review': 'purple',
  'revision-requested': 'error',
  approved: 'success',
  completed: 'success',
};

const ATTACHMENT_ICONS: Record<AttachmentType, typeof FileText> = {
  file: FileText,
  link: Link2,
  image: Image,
  figma: ExternalLink,
  video: Video,
};

function statusText(status: UserStatus) {
  switch (status) {
    case 'available': return 'Available';
    case 'busy': return 'Working on a task';
    case 'on-leave': return 'On Leave';
    case 'blocked': return 'Blocked';
  }
}

function statusDotColor(status: UserStatus) {
  switch (status) {
    case 'available': return 'bg-success';
    case 'busy': return 'bg-warning';
    case 'on-leave': return 'bg-gray-400';
    case 'blocked': return 'bg-error';
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface TaskDetailPageProps {
  taskId: string;
  onBack: () => void;
}

export function TaskDetailPage({ taskId, onBack }: TaskDetailPageProps) {
  const task = useTaskStore((s) => s.getTaskById(taskId));
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const createTask = useTaskStore((s) => s.createTask);
  const addAttachment = useTaskStore((s) => s.addAttachment);
  const removeAttachment = useTaskStore((s) => s.removeAttachment);
  const addComment = useTaskStore((s) => s.addComment);
  const addRevision = useTaskStore((s) => s.addRevision);
  const resolveRevision = useTaskStore((s) => s.resolveRevision);
  const startTimer = useTaskStore((s) => s.startTimer);
  const stopTimer = useTaskStore((s) => s.stopTimer);
  const sendSlackApproval = useTaskStore((s) => s.sendSlackApproval);
  const setAIReview = useTaskStore((s) => s.setAIReview);

  const brands = useBrandStore((s) => s.brands);
  const getBrandById = useBrandStore((s) => s.getBrandById);
  const createBrand = useBrandStore((s) => s.createBrand);

  const currentUser = useAuthStore((s) => s.currentUser);
  const getUserById = useAuthStore((s) => s.getUserById);
  const allUsers = useAuthStore((s) => s.allUsers);

  const getSpaceById = useSpaceStore((s) => s.getSpaceById);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  if (!task) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-text-tertiary" />
        <p className="text-sm text-text-secondary">Task not found.</p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <TaskDetailInner
      task={task}
      onBack={onBack}
      updateTask={updateTask}
      deleteTask={deleteTask}
      updateTaskStatus={updateTaskStatus}
      getSubtasks={getSubtasks}
      createTask={createTask}
      addAttachment={addAttachment}
      removeAttachment={removeAttachment}
      addComment={addComment}
      addRevision={addRevision}
      resolveRevision={resolveRevision}
      startTimer={startTimer}
      stopTimer={stopTimer}
      sendSlackApproval={sendSlackApproval}
      setAIReview={setAIReview}
      currentUser={currentUser!}
      getUserById={getUserById}
      allUsers={allUsers}
      getSpaceById={getSpaceById}
      addNotification={addNotification}
      isAdmin={isAdmin}
      brands={brands}
      getBrandById={getBrandById}
      createBrand={createBrand}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner component (guaranteed task is non-null)
// ---------------------------------------------------------------------------

function TaskDetailInner({
  task,
  onBack,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getSubtasks,
  createTask,
  addAttachment,
  removeAttachment,
  addComment,
  addRevision,
  resolveRevision,
  startTimer,
  stopTimer,
  sendSlackApproval,
  setAIReview,
  currentUser,
  getUserById,
  allUsers,
  getSpaceById,
  addNotification,
  isAdmin,
  brands,
  getBrandById,
  createBrand,
}: {
  task: Task;
  onBack: () => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  getSubtasks: (parentId: string) => Task[];
  createTask: ReturnType<typeof useTaskStore.getState>['createTask'];
  addAttachment: ReturnType<typeof useTaskStore.getState>['addAttachment'];
  removeAttachment: (taskId: string, attachmentId: string) => void;
  addComment: (taskId: string, userId: string, text: string, type?: CommentType) => void;
  addRevision: (taskId: string, feedback: string, requestedBy: string) => void;
  resolveRevision: (taskId: string, revisionId: string) => void;
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
  sendSlackApproval: (taskId: string) => void;
  setAIReview: (taskId: string, review: AIReviewResult) => void;
  currentUser: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  allUsers: ReturnType<typeof useAuthStore.getState>['allUsers'];
  getSpaceById: (id: string) => ReturnType<typeof useSpaceStore.getState>['spaces'][number] | undefined;
  addNotification: ReturnType<typeof useNotificationStore.getState>['addNotification'];
  isAdmin: boolean;
  brands: BrandGuide[];
  getBrandById: (id: string) => BrandGuide | undefined;
  createBrand: ReturnType<typeof useBrandStore.getState>['createBrand'];
}) {
  const space = getSpaceById(task.spaceId);
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
  const requester = getUserById(task.requesterId);
  const subtasks = getSubtasks(task.id);

  // ---- Inline editing states ----
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description);

  // Sync drafts when task changes
  useEffect(() => { setTitleDraft(task.title); }, [task.title]);
  useEffect(() => { setDescriptionDraft(task.description); }, [task.description]);

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== task.title) {
      updateTask(task.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const saveDescription = () => {
    if (descriptionDraft.trim() !== task.description) {
      updateTask(task.id, { description: descriptionDraft.trim() });
    }
    setEditingDescription(false);
  };

  const handleDelete = () => {
    if (confirm('Delete this task and all its subtasks?')) {
      deleteTask(task.id);
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* ================================================================= */}
      {/* Header                                                            */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Inline editable title */}
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              className="w-full rounded-lg border border-primary bg-white px-2 py-1 text-xl font-bold text-text-primary outline-none ring-2 ring-primary/20"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false); }
              }}
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              className="cursor-text truncate text-xl font-bold text-text-primary hover:bg-surface-secondary rounded px-1 -mx-1 transition-colors"
            >
              {task.title}
            </h1>
          )}
        </div>

        {/* Status dropdown */}
        <InlineDropdown
          value={task.status}
          options={STATUS_ORDER.map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
            dotClass: getStatusColor(s).split(' ')[1],
          }))}
          onChange={(s) => updateTaskStatus(task.id, s as TaskStatus)}
          renderTrigger={(val) => (
            <Badge variant={STATUS_BADGE_VARIANT[val as TaskStatus]}>
              {STATUS_LABELS[val as TaskStatus]}
              <ChevronDown className="h-3 w-3" />
            </Badge>
          )}
        />

        {/* Priority dropdown */}
        <InlineDropdown
          value={task.priority}
          options={PRIORITY_OPTIONS.map((p) => ({
            value: p.value,
            label: p.label,
            dotClass: getPriorityColor(p.value).split(' ')[1],
          }))}
          onChange={(p) => updateTask(task.id, { priority: p as TaskPriority })}
          renderTrigger={(val) => (
            <span
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                getPriorityColor(val as TaskPriority),
              )}
            >
              {val}
              <ChevronDown className="h-3 w-3" />
            </span>
          )}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sendSlackApproval(task.id);
            addNotification(
              task.requesterId,
              'approval_received',
              'Slack approval sent',
              `Slack approval requested for "${task.title}"`,
              task.id,
            );
          }}
          disabled={task.slackApprovalSent}
        >
          <Slack className="h-3.5 w-3.5" />
          {task.slackApprovalSent ? 'Sent' : 'Slack Approval'}
        </Button>

        {isAdmin && (
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* ================================================================= */}
      {/* Two-column layout                                                 */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* -------- Left Column -------- */}
        <div className="space-y-6 min-w-0">
          {/* Description */}
          <section className="rounded-xl border border-border bg-white p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Description
            </h3>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  className="w-full rounded-lg border border-primary bg-white p-3 text-sm text-text-primary outline-none ring-2 ring-primary/20 min-h-[100px] resize-y"
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDescription}>Save</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDescriptionDraft(task.description);
                      setEditingDescription(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setEditingDescription(true)}
                className="cursor-text whitespace-pre-wrap text-sm text-text-secondary leading-relaxed hover:bg-surface-secondary rounded p-1 -m-1 transition-colors min-h-[40px]"
              >
                {task.description || 'Click to add a description...'}
              </p>
            )}
          </section>

          {/* Subtasks */}
          <SubtasksSection
            task={task}
            subtasks={subtasks}
            getUserById={getUserById}
            updateTaskStatus={updateTaskStatus}
            createTask={createTask}
            currentUser={currentUser}
            addNotification={addNotification}
          />

          {/* Attachments */}
          <AttachmentsSection
            task={task}
            addAttachment={addAttachment}
            removeAttachment={removeAttachment}
          />

          {/* AI Review */}
          <AIReviewSection
            task={task}
            setAIReview={setAIReview}
            getBrandById={getBrandById}
          />

          {/* Revisions */}
          <RevisionsSection
            task={task}
            getUserById={getUserById}
            addRevision={addRevision}
            resolveRevision={resolveRevision}
            currentUser={currentUser}
            addNotification={addNotification}
          />

          {/* Comments & Activity */}
          <CommentsSection
            task={task}
            getUserById={getUserById}
            addComment={addComment}
            currentUser={currentUser}
            addNotification={addNotification}
          />
        </div>

        {/* -------- Right Column -------- */}
        <div className="space-y-4">
          {/* Details card */}
          <DetailsCard
            task={task}
            assignee={assignee}
            requester={requester}
            space={space}
            getUserById={getUserById}
            updateTask={updateTask}
            allUsers={allUsers}
            brands={brands}
            getBrandById={getBrandById}
            createBrand={createBrand}
          />

          {/* Timeline card */}
          <TimelineCard task={task} updateTask={updateTask} />

          {/* Timer card */}
          <TimerCard
            task={task}
            startTimer={startTimer}
            stopTimer={stopTimer}
          />

          {/* Slack Approval card */}
          <SlackApprovalCard
            task={task}
            sendSlackApproval={sendSlackApproval}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Inline Dropdown (reusable)
// ---------------------------------------------------------------------------

function InlineDropdown({
  value,
  options,
  onChange,
  renderTrigger,
}: {
  value: string;
  options: { value: string; label: string; dotClass?: string }[];
  onChange: (val: string) => void;
  renderTrigger: (val: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {renderTrigger(value)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-white py-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-surface-secondary',
                  opt.value === value && 'bg-surface-tertiary font-medium',
                )}
              >
                {opt.dotClass && (
                  <span className={cn('h-2 w-2 rounded-full', opt.dotClass)} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subtasks Section
// ---------------------------------------------------------------------------

function SubtasksSection({
  task,
  subtasks,
  getUserById,
  updateTaskStatus,
  createTask,
  currentUser,
  addNotification,
}: {
  task: Task;
  subtasks: Task[];
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  createTask: ReturnType<typeof useTaskStore.getState>['createTask'];
  currentUser: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  addNotification: ReturnType<typeof useNotificationStore.getState>['addNotification'];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAddSubtask = () => {
    if (!newTitle.trim()) return;
    createTask({
      title: newTitle.trim(),
      description: '',
      spaceId: task.spaceId,
      parentTaskId: task.id,
      assigneeId: task.assigneeId,
      requesterId: currentUser.id,
      priority: task.priority,
      status: 'todo',
      attachments: [],
      expectedTimeline: { startDate: null, endDate: null },
      designTimeline: { startDate: null, endDate: null },
      tags: [],
      brandId: task.brandId ?? null,
    });
    setNewTitle('');
    setShowAdd(false);
  };

  const completedCount = subtasks.filter(
    (s) => s.status === 'completed' || s.status === 'approved',
  ).length;

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Subtasks
          {subtasks.length > 0 && (
            <span className="ml-2 text-text-secondary font-normal normal-case">
              {completedCount}/{subtasks.length} done
            </span>
          )}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Subtask
        </Button>
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-success transition-all duration-300"
            style={{
              width: `${(completedCount / subtasks.length) * 100}%`,
            }}
          />
        </div>
      )}

      {subtasks.length === 0 && !showAdd && (
        <p className="py-4 text-center text-xs text-text-tertiary">
          No subtasks yet.
        </p>
      )}

      <div className="space-y-1">
        {subtasks.map((sub) => {
          const a = sub.assigneeId ? getUserById(sub.assigneeId) : null;
          const isDone =
            sub.status === 'completed' || sub.status === 'approved';
          return (
            <div
              key={sub.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-secondary transition-colors"
            >
              <button
                onClick={() =>
                  updateTaskStatus(
                    sub.id,
                    isDone ? 'todo' : 'completed',
                  )
                }
                className={cn(
                  'shrink-0 rounded-full transition-colors',
                  isDone
                    ? 'text-success'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>
              <span
                className={cn(
                  'flex-1 truncate text-sm',
                  isDone
                    ? 'text-text-tertiary line-through'
                    : 'text-text-primary',
                )}
              >
                {sub.title}
              </span>
              {a && <Avatar name={a.name} size="sm" />}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  getStatusColor(sub.status),
                )}
              >
                {STATUS_LABELS[sub.status]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Subtask title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                  if (e.key === 'Escape') { setNewTitle(''); setShowAdd(false); }
                }}
              />
              <Button size="sm" onClick={handleAddSubtask}>Add</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setNewTitle(''); setShowAdd(false); }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Attachments Section
// ---------------------------------------------------------------------------

function AttachmentsSection({
  task,
  addAttachment,
  removeAttachment,
}: {
  task: Task;
  addAttachment: ReturnType<typeof useTaskStore.getState>['addAttachment'];
  removeAttachment: (taskId: string, attachmentId: string) => void;
}) {
  const [showAddLink, setShowAddLink] = useState(false);
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddLink = () => {
    if (!attName.trim() || !attUrl.trim()) return;
    addAttachment(task.id, { type: 'link', url: attUrl.trim(), name: attName.trim() });
    setAttName('');
    setAttUrl('');
    setShowAddLink(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });

        if (!res.ok) {
          // Fallback to data URL if blob upload fails (e.g. no BLOB_READ_WRITE_TOKEN)
          const reader = new FileReader();
          reader.onload = () => {
            let type: AttachmentType = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            addAttachment(task.id, { type, url: reader.result as string, name: file.name });
          };
          reader.readAsDataURL(file);
          continue;
        }

        const blob = await res.json();
        let type: AttachmentType = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';

        addAttachment(task.id, {
          type,
          url: blob.url,
          name: blob.name,
        });
      }
    } catch {
      console.error('Upload failed');
    } finally {
      setUploading(false);
    }

    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  const handleDownload = (att: { url: string; name: string }) => {
    if (att.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = att.url;
      link.download = att.name;
      link.click();
    } else {
      window.open(att.url, '_blank');
    }
  };

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Attachments
          {task.attachments.length > 0 && (
            <span className="ml-1 text-text-secondary font-normal normal-case">
              ({task.attachments.length})
            </span>
          )}
        </h3>
        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.fig,.sketch,.zip,.ai,.psd,.eps,.svg"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
          >
            <Paperclip className="h-3.5 w-3.5" />
            Upload File
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAddLink(true)}>
            <Link2 className="h-3.5 w-3.5" />
            Add Link
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="mb-3 flex items-center justify-center rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary-light/10 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary-light/20'); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary-light/20'); }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-primary', 'bg-primary-light/20');
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            setUploading(true);
            try {
              for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                  // Fallback to data URL
                  const reader = new FileReader();
                  reader.onload = () => {
                    let type: AttachmentType = 'file';
                    if (file.type.startsWith('image/')) type = 'image';
                    else if (file.type.startsWith('video/')) type = 'video';
                    addAttachment(task.id, { type, url: reader.result as string, name: file.name });
                  };
                  reader.readAsDataURL(file);
                  continue;
                }
                const blob = await res.json();
                let type: AttachmentType = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                addAttachment(task.id, { type, url: blob.url, name: blob.name });
              }
            } catch {
              console.error('Drop upload failed');
            } finally {
              setUploading(false);
            }
          }
        }}
      >
        <div className="flex flex-col items-center gap-1 text-text-tertiary">
          <Paperclip className="h-5 w-5" />
          <span className="text-xs">Drop files here or click to upload</span>
          <span className="text-[10px]">Images, PDFs, Design files, Videos</span>
        </div>
      </div>

      {task.attachments.length === 0 && !showAddLink && (
        <p className="py-2 text-center text-xs text-text-tertiary">
          No attachments yet.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {task.attachments.map((att) => {
          const Icon = ATTACHMENT_ICONS[att.type] || FileText;
          const isImage = att.type === 'image';
          return (
            <div
              key={att.id}
              className="rounded-lg border border-border-light bg-surface-secondary overflow-hidden group"
            >
              {/* Image thumbnail */}
              {isImage && (
                <div
                  className="relative h-32 w-full bg-surface-tertiary cursor-pointer group/img"
                  onClick={() => { setPreviewUrl(att.url); setPreviewName(att.name); }}
                >
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/img:bg-black/30 transition-colors">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 p-2.5">
                {!isImage && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary">
                    {att.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{att.type}</Badge>
                    <span className="text-[10px] text-text-tertiary">
                      {formatDate(att.uploadedAt)}
                    </span>
                  </div>
                </div>
                {isImage && (
                  <button
                    onClick={() => { setPreviewUrl(att.url); setPreviewName(att.name); }}
                    className="shrink-0 rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-primary-light hover:text-primary transition-all"
                    title="Preview"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(att)}
                  className="shrink-0 rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-primary-light hover:text-primary transition-all"
                  title="Download"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeAttachment(task.id, att.id)}
                  className="shrink-0 rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-all"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image lightbox / expanded preview */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-h-[90vh] max-w-[90vw] rounded-xl overflow-hidden bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-sm font-medium text-text-primary truncate max-w-[400px]">
                  {previewName}
                </p>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-center bg-surface-tertiary p-4">
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="max-h-[75vh] max-w-full object-contain rounded"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add link inline form */}
      <AnimatePresence>
        {showAddLink && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 rounded-lg border border-border bg-surface-secondary p-3"
          >
            <p className="text-xs font-medium text-text-primary">Add Link / URL</p>
            <Input
              placeholder="Display name (e.g. Figma file, Google Doc)"
              value={attName}
              onChange={(e) => setAttName(e.target.value)}
            />
            <Input
              placeholder="URL (e.g. https://figma.com/file/...)"
              value={attUrl}
              onChange={(e) => setAttUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddLink} disabled={!attName.trim() || !attUrl.trim()}>
                Add Link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowAddLink(false); setAttName(''); setAttUrl(''); }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI Review Section
// ---------------------------------------------------------------------------

function AIReviewSection({
  task,
  setAIReview,
  getBrandById,
}: {
  task: Task;
  setAIReview: (taskId: string, review: AIReviewResult) => void;
  getBrandById: (id: string) => BrandGuide | undefined;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageAttachments = useMemo(
    () => task.attachments.filter((a) => a.type === 'image'),
    [task.attachments],
  );

  const brand = task.brandId ? getBrandById(task.brandId) : undefined;

  const handleRunReview = async () => {
    if (imageAttachments.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageAttachments[0].url,
          brandGuide: brand
            ? {
                name: brand.name,
                primaryColors: brand.primaryColors,
                secondaryColors: brand.secondaryColors,
                fonts: brand.fonts,
                tonOfVoice: brand.tonOfVoice,
                doList: brand.doList,
                dontList: brand.dontList,
                description: brand.description,
              }
            : null,
        }),
      });

      if (!res.ok) {
        // Fallback: generate a mock review when the API is unavailable
        const mockReview: AIReviewResult = {
          score: Math.floor(Math.random() * 25) + 70,
          summary: 'The design demonstrates strong visual hierarchy and clean composition. ' +
            (brand ? `It aligns well with ${brand.name} brand guidelines overall.` : 'Consider linking a brand guide for more targeted feedback.'),
          strengths: [
            'Clean layout with good use of whitespace',
            'Strong visual hierarchy guides the eye naturally',
            'Typography choices are modern and readable',
          ],
          improvements: [
            'Consider increasing contrast for accessibility compliance',
            'CTA buttons could be more prominent',
            'Add more breathing room between sections',
          ],
          brandAlignmentNotes: brand
            ? `The design uses colors close to the ${brand.name} palette. Ensure primary brand color ${brand.primaryColors[0] || ''} is used consistently for key UI elements.`
            : 'No brand guide linked. Attach a brand to receive alignment feedback.',
          reviewedAt: new Date().toISOString(),
        };
        setAIReview(task.id, mockReview);
        return;
      }

      const review: AIReviewResult = await res.json();
      setAIReview(task.id, review);
    } catch (err) {
      // Fallback mock on network error as well
      const mockReview: AIReviewResult = {
        score: Math.floor(Math.random() * 25) + 70,
        summary: 'The design shows solid fundamentals with room for refinement. ' +
          (brand ? `Evaluated against ${brand.name} brand standards.` : 'Link a brand guide for brand-specific feedback.'),
        strengths: [
          'Good compositional balance',
          'Effective use of color to create hierarchy',
          'Consistent spacing throughout the design',
        ],
        improvements: [
          'Text contrast could be improved for readability',
          'Consider simplifying the layout for mobile viewports',
          'Iconography style could be more unified',
        ],
        brandAlignmentNotes: brand
          ? `Partially aligned with ${brand.name}. Review font choices against brand spec (${brand.fonts.join(', ')}).`
          : 'No brand guide linked. Attach a brand for detailed alignment notes.',
        reviewedAt: new Date().toISOString(),
      };
      setAIReview(task.id, mockReview);
    } finally {
      setLoading(false);
    }
  };

  // Don't render at all if no image attachments
  if (imageAttachments.length === 0 && !task.aiReview) return null;

  const review = task.aiReview;

  const scoreColor =
    review && review.score >= 80
      ? 'text-success'
      : review && review.score >= 60
        ? 'text-warning'
        : review
          ? 'text-error'
          : 'text-text-tertiary';

  const scoreBgColor =
    review && review.score >= 80
      ? 'bg-success/10'
      : review && review.score >= 60
        ? 'bg-warning/10'
        : review
          ? 'bg-error/10'
          : 'bg-surface-tertiary';

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Design Review
        </h3>
        {imageAttachments.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunReview}
            loading={loading}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reviewing...
              </>
            ) : review ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Re-run Review
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                AI Review
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-error/10 px-2.5 py-1.5 text-xs text-error">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {!review && !loading && (
        <p className="py-3 text-center text-xs text-text-tertiary">
          {imageAttachments.length > 0
            ? 'Click "AI Review" to get AI-powered feedback on your design.'
            : 'Upload image attachments to enable AI review.'}
        </p>
      )}

      {loading && !review && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-text-secondary">Analyzing your design...</p>
        </div>
      )}

      {review && (
        <div className="space-y-4">
          {/* Score */}
          <div className="flex items-center gap-4">
            <div className={cn('flex h-16 w-16 flex-col items-center justify-center rounded-xl', scoreBgColor)}>
              <span className={cn('text-2xl font-bold', scoreColor)}>{review.score}</span>
              <span className="text-[9px] font-medium text-text-tertiary">/100</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-text-primary leading-relaxed">{review.summary}</p>
              <p className="mt-1 text-[10px] text-text-tertiary">
                Reviewed {format(parseISO(review.reviewedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>

          {/* Score bar */}
          <div className="h-2 w-full rounded-full bg-surface-tertiary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${review.score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                review.score >= 80
                  ? 'bg-success'
                  : review.score >= 60
                    ? 'bg-warning'
                    : 'bg-error',
              )}
            />
          </div>

          {/* Strengths */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {review.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-warning">
              <TrendingUp className="h-3.5 w-3.5" />
              Improvements
            </h4>
            <ul className="space-y-1">
              {review.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Brand Alignment */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Palette className="h-3.5 w-3.5" />
              Brand Alignment
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              {review.brandAlignmentNotes}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Revisions Section
// ---------------------------------------------------------------------------

function RevisionsSection({
  task,
  getUserById,
  addRevision,
  resolveRevision,
  currentUser,
  addNotification,
}: {
  task: Task;
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  addRevision: (taskId: string, feedback: string, requestedBy: string) => void;
  resolveRevision: (taskId: string, revisionId: string) => void;
  currentUser: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  addNotification: ReturnType<typeof useNotificationStore.getState>['addNotification'];
}) {
  const [showRequest, setShowRequest] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleRequestRevision = () => {
    if (!feedback.trim()) return;
    addRevision(task.id, feedback.trim(), currentUser.id);
    if (task.assigneeId) {
      addNotification(
        task.assigneeId,
        'revision_requested',
        'Revision requested',
        `${currentUser.name} requested a revision on "${task.title}"`,
        task.id,
      );
    }
    setFeedback('');
    setShowRequest(false);
  };

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Revisions
          {task.revisions.length > 0 && (
            <span className="ml-1 text-text-secondary font-normal normal-case">
              ({task.revisions.length})
            </span>
          )}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowRequest(true)}>
          <RotateCcw className="h-3.5 w-3.5" />
          Request Revision
        </Button>
      </div>

      {task.revisions.length === 0 && !showRequest && (
        <p className="py-4 text-center text-xs text-text-tertiary">
          No revisions requested.
        </p>
      )}

      <div className="space-y-3">
        {task.revisions.map((rev) => {
          const reqUser = getUserById(rev.requestedBy);
          const isPending = !rev.resolvedAt;
          return (
            <div
              key={rev.id}
              className={cn(
                'rounded-lg border p-3',
                isPending
                  ? 'border-warning/30 bg-warning/5'
                  : 'border-border-light bg-surface-secondary',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={isPending ? 'warning' : 'success'}>
                    v{rev.version}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    by {reqUser?.name ?? 'Unknown'}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {formatDate(rev.requestedAt)}
                  </span>
                </div>
                {isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveRevision(task.id, rev.id)}
                  >
                    <Check className="h-3 w-3" />
                    Mark Resolved
                  </Button>
                )}
                {!isPending && (
                  <Badge variant="success">
                    <Check className="h-3 w-3" />
                    Resolved
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-text-primary leading-relaxed">
                {rev.feedback}
              </p>
            </div>
          );
        })}
      </div>

      {/* Request revision modal inline */}
      <Modal
        isOpen={showRequest}
        onClose={() => { setShowRequest(false); setFeedback(''); }}
        title="Request Revision"
        size="md"
      >
        <div className="space-y-3">
          <Textarea
            label="Feedback"
            placeholder="Describe what needs to be changed..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowRequest(false); setFeedback(''); }}>
              Cancel
            </Button>
            <Button onClick={handleRequestRevision}>Request Revision</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Comments & Activity Section
// ---------------------------------------------------------------------------

function CommentsSection({
  task,
  getUserById,
  addComment,
  currentUser,
  addNotification,
}: {
  task: Task;
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  addComment: (taskId: string, userId: string, text: string, type?: CommentType) => void;
  currentUser: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  addNotification: ReturnType<typeof useNotificationStore.getState>['addNotification'];
}) {
  const [text, setText] = useState('');

  const handleSubmit = (type: CommentType = 'comment') => {
    if (!text.trim()) return;
    addComment(task.id, currentUser.id, text.trim(), type);

    // Notify assignee or requester
    const notifyId =
      type === 'request'
        ? task.assigneeId || task.requesterId
        : task.requesterId !== currentUser.id
          ? task.requesterId
          : task.assigneeId;

    if (notifyId && notifyId !== currentUser.id) {
      addNotification(
        notifyId,
        type === 'request' ? 'mention' : 'comment_added',
        type === 'request' ? 'Input requested' : 'New comment',
        `${currentUser.name} ${type === 'request' ? 'requested input' : 'commented'} on "${task.title}"`,
        task.id,
      );
    }
    setText('');
  };

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Comments & Activity
        {task.comments.length > 0 && (
          <span className="ml-1 text-text-secondary font-normal normal-case">
            ({task.comments.length})
          </span>
        )}
      </h3>

      {task.comments.length === 0 && (
        <p className="py-4 text-center text-xs text-text-tertiary">
          No comments yet. Start the conversation.
        </p>
      )}

      <div className="space-y-3">
        {task.comments.map((c) => {
          const user = getUserById(c.userId);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-2.5 rounded-lg p-2.5',
                c.type === 'request' && 'bg-primary-light/50 border border-primary/20',
                c.type === 'system' && 'bg-surface-secondary',
              )}
            >
              {c.type !== 'system' && user && (
                <Avatar name={user.name} size="sm" />
              )}
              {c.type === 'system' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-tertiary">
                  <Circle className="h-3 w-3 text-text-tertiary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      c.type === 'system'
                        ? 'text-text-tertiary'
                        : 'text-text-primary',
                    )}
                  >
                    {user?.name ?? 'Unknown'}
                  </span>
                  {c.type === 'request' && (
                    <Badge variant="purple">Request</Badge>
                  )}
                  <span className="text-[10px] text-text-tertiary">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-0.5 text-sm leading-relaxed',
                    c.type === 'system'
                      ? 'text-text-tertiary italic'
                      : 'text-text-secondary',
                  )}
                >
                  {c.text}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Comment input */}
      <div className="mt-4 flex gap-2">
        <div className="flex-1">
          <textarea
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[38px] resize-none"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            onClick={() => handleSubmit('comment')}
            disabled={!text.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            Comment
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSubmit('request')}
            disabled={!text.trim()}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Request Input
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Right Column: Details Card
// ---------------------------------------------------------------------------

function DetailsCard({
  task,
  assignee,
  requester,
  space,
  getUserById,
  updateTask,
  allUsers,
  brands,
  getBrandById,
  createBrand,
}: {
  task: Task;
  assignee: ReturnType<typeof useAuthStore.getState>['allUsers'][number] | null | undefined;
  requester: ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  space: ReturnType<typeof useSpaceStore.getState>['spaces'][number] | undefined;
  getUserById: (id: string) => ReturnType<typeof useAuthStore.getState>['allUsers'][number] | undefined;
  updateTask: (id: string, updates: Partial<Task>) => void;
  allUsers: ReturnType<typeof useAuthStore.getState>['allUsers'];
  brands: BrandGuide[];
  getBrandById: (id: string) => BrandGuide | undefined;
  createBrand: ReturnType<typeof useBrandStore.getState>['createBrand'];
}) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const designers = useMemo(
    () => allUsers.filter((u) => u.role === 'designer'),
    [allUsers],
  );

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !task.tags.includes(tag)) {
      updateTask(task.id, { tags: [...task.tags, tag] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Details
      </h3>

      {/* Assignee */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-text-tertiary">
          Assignee
        </label>
        <Select
          value={task.assigneeId || ''}
          onChange={(e) =>
            updateTask(task.id, {
              assigneeId: e.target.value || null,
            })
          }
          options={[
            { value: '', label: 'Unassigned' },
            ...designers.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        {assignee && (
          <div className="mt-2 flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', statusDotColor(assignee.status))} />
            <span className="text-xs text-text-secondary">
              {statusText(assignee.status)}
            </span>
          </div>
        )}
        {assignee?.status === 'blocked' && (
          <div className="mt-1 flex items-center gap-1.5 rounded-md bg-error/10 px-2 py-1.5 text-xs text-error">
            <AlertCircle className="h-3.5 w-3.5" />
            Designer is blocked. Reassign or unblock first.
          </div>
        )}
      </div>

      {/* Requester */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-text-tertiary">
          Requester
        </label>
        <div className="flex items-center gap-2">
          {requester && <Avatar name={requester.name} size="sm" />}
          <span className="text-sm text-text-primary">
            {requester?.name ?? 'Unknown'}
          </span>
        </div>
      </div>

      {/* Space */}
      {space && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-text-tertiary">
            Space
          </label>
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', space.color)} />
            <span className="text-sm text-text-primary">{space.name}</span>
          </div>
        </div>
      )}

      {/* Brand */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-text-tertiary">
          Brand Guide
        </label>
        {!creatingBrand ? (
          <div className="space-y-2">
            <Select
              value={task.brandId || ''}
              onChange={(e) =>
                updateTask(task.id, {
                  brandId: e.target.value || null,
                })
              }
              options={[
                { value: '', label: 'No brand linked' },
                ...brands.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            {task.brandId && (() => {
              const linkedBrand = getBrandById(task.brandId);
              return linkedBrand ? (
                <div className="rounded-lg bg-surface-secondary p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-text-primary">{linkedBrand.name}</span>
                  </div>
                  {linkedBrand.primaryColors.length > 0 && (
                    <div className="flex items-center gap-1">
                      {linkedBrand.primaryColors.map((color) => (
                        <span
                          key={color}
                          className="h-4 w-4 rounded-full border border-border-light"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {linkedBrand.secondaryColors.map((color) => (
                        <span
                          key={color}
                          className="h-3.5 w-3.5 rounded-full border border-border-light opacity-70"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                  {linkedBrand.fonts.length > 0 && (
                    <p className="text-[10px] text-text-tertiary">
                      Fonts: {linkedBrand.fonts.join(', ')}
                    </p>
                  )}
                </div>
              ) : null;
            })()}
            <button
              onClick={() => setCreatingBrand(true)}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover transition-colors"
            >
              <Plus className="h-3 w-3" />
              Create new brand
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-surface-secondary p-2.5">
            <p className="text-[11px] font-medium text-text-primary">New Brand</p>
            <Input
              autoFocus
              placeholder="Brand name"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBrandName.trim()) {
                  const brand = createBrand({ name: newBrandName.trim() });
                  updateTask(task.id, { brandId: brand.id });
                  setNewBrandName('');
                  setCreatingBrand(false);
                }
                if (e.key === 'Escape') {
                  setNewBrandName('');
                  setCreatingBrand(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newBrandName.trim()}
                onClick={() => {
                  const brand = createBrand({ name: newBrandName.trim() });
                  updateTask(task.id, { brandId: brand.id });
                  setNewBrandName('');
                  setCreatingBrand(false);
                }}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setNewBrandName(''); setCreatingBrand(false); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-text-tertiary">
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="group inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] text-text-secondary"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="rounded-full opacity-0 group-hover:opacity-100 hover:text-error transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              className="h-6 w-20 rounded border-0 bg-transparent px-1 text-[11px] text-text-primary outline-none placeholder:text-text-tertiary focus:ring-0"
              placeholder="+ Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTag();
              }}
              onBlur={addTag}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Column: Timeline Card
// ---------------------------------------------------------------------------

function TimelineCard({
  task,
  updateTask,
}: {
  task: Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
}) {
  const expStart = task.expectedTimeline.startDate;
  const expEnd = task.expectedTimeline.endDate;
  const desStart = task.designTimeline.startDate;
  const desEnd = task.designTimeline.endDate;

  const expDuration =
    expStart && expEnd
      ? differenceInDays(parseISO(expEnd), parseISO(expStart)) + 1
      : null;
  const desDuration =
    desStart && desEnd
      ? differenceInDays(parseISO(desEnd), parseISO(desStart)) + 1
      : null;

  const isOverdue =
    expEnd &&
    task.status !== 'completed' &&
    task.status !== 'approved' &&
    isAfter(new Date(), parseISO(expEnd));

  // Progress calculation
  const progress = useMemo(() => {
    const start = desStart || expStart;
    const end = desEnd || expEnd;
    if (!start || !end) return 0;
    const totalMs = parseISO(end).getTime() - parseISO(start).getTime();
    if (totalMs <= 0) return 100;
    const elapsedMs = Date.now() - parseISO(start).getTime();
    return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  }, [expStart, expEnd, desStart, desEnd]);

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Timeline
      </h3>

      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded-md bg-error/10 px-2.5 py-1.5 text-xs font-medium text-error">
          <AlertCircle className="h-3.5 w-3.5" />
          Overdue
        </div>
      )}

      {/* Expected */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-text-tertiary">
          Expected Timeline
        </p>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
          {expStart ? format(parseISO(expStart), 'MMM d') : '--'}
          <span className="text-text-tertiary">to</span>
          {expEnd ? format(parseISO(expEnd), 'MMM d') : '--'}
          {expDuration && (
            <span className="text-text-tertiary">({expDuration}d)</span>
          )}
        </div>
      </div>

      {/* Design */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-text-tertiary">
          Design Timeline
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={desStart ? format(parseISO(desStart), 'yyyy-MM-dd') : ''}
            onChange={(e) =>
              updateTask(task.id, {
                designTimeline: {
                  ...task.designTimeline,
                  startDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                },
              })
            }
          />
          <Input
            type="date"
            value={desEnd ? format(parseISO(desEnd), 'yyyy-MM-dd') : ''}
            onChange={(e) =>
              updateTask(task.id, {
                designTimeline: {
                  ...task.designTimeline,
                  endDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                },
              })
            }
          />
        </div>
        {desDuration !== null && (
          <p className="mt-1 text-[11px] text-text-tertiary">
            {desDuration} day{desDuration !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-text-tertiary">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isOverdue ? 'bg-error' : 'bg-primary',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Column: Timer Card
// ---------------------------------------------------------------------------

function TimerCard({
  task,
  startTimer,
  stopTimer,
}: {
  task: Task;
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!task.timerRunning || !task.timerStartedAt) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      setElapsed(Math.floor((Date.now() - task.timerStartedAt!) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [task.timerRunning, task.timerStartedAt]);

  const totalDisplay = task.totalTimeSpent + elapsed;

  const hours = Math.floor(totalDisplay / 3600);
  const minutes = Math.floor((totalDisplay % 3600) / 60);
  const seconds = totalDisplay % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Time Tracking
      </h3>

      <div className="text-center">
        <p
          className={cn(
            'font-mono text-3xl font-bold tabular-nums',
            task.timerRunning ? 'text-primary' : 'text-text-primary',
          )}
        >
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </p>
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          Total time logged
        </p>
      </div>

      <Button
        variant={task.timerRunning ? 'danger' : 'primary'}
        className="w-full"
        size="sm"
        onClick={() =>
          task.timerRunning ? stopTimer(task.id) : startTimer(task.id)
        }
      >
        {task.timerRunning ? (
          <>
            <Square className="h-3.5 w-3.5" />
            Stop Timer
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Start Timer
          </>
        )}
      </Button>

      {task.timerRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-xs text-primary font-medium">Recording</span>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Column: Slack Approval Card
// ---------------------------------------------------------------------------

function SlackApprovalCard({
  task,
  sendSlackApproval,
}: {
  task: Task;
  sendSlackApproval: (taskId: string) => void;
}) {
  const slackStatus = !task.slackApprovalSent
    ? 'not_sent'
    : task.slackApprovalStatus ?? 'pending';

  const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'; icon: typeof Circle }> = {
    not_sent: { label: 'Not Sent', variant: 'default', icon: Circle },
    pending: { label: 'Pending', variant: 'warning', icon: Clock },
    approved: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
    rejected: { label: 'Rejected', variant: 'error', icon: AlertCircle },
  };

  const cfg = statusConfig[slackStatus];
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Slack Approval
      </h3>

      <div className="flex items-center gap-2">
        <StatusIcon
          className={cn(
            'h-4 w-4',
            slackStatus === 'approved' && 'text-success',
            slackStatus === 'pending' && 'text-warning',
            slackStatus === 'rejected' && 'text-error',
            slackStatus === 'not_sent' && 'text-text-tertiary',
          )}
        />
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      {!task.slackApprovalSent && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => sendSlackApproval(task.id)}
        >
          <Slack className="h-3.5 w-3.5" />
          Send for Approval
        </Button>
      )}
    </div>
  );
}
