// ============================================================
// Design Ops Management Tool — Type Definitions
// ============================================================

// --- Enums / Unions ----------------------------------------

export type Role = 'super_admin' | 'admin' | 'designer' | 'requester';

export type UserStatus = 'available' | 'busy' | 'on-leave' | 'blocked';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in-progress'
  | 'in-review'
  | 'revision-requested'
  | 'approved'
  | 'completed';

export type SlackApprovalStatus = 'pending' | 'approved' | 'rejected';

export type CommentType = 'comment' | 'request' | 'system';

export type AttachmentType = 'file' | 'link' | 'image' | 'figma' | 'video';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'comment_added'
  | 'revision_requested'
  | 'approval_received'
  | 'status_changed'
  | 'mention'
  | 'system';

export type ChatRole = 'user' | 'assistant';

// --- Core Models -------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string; // initials-based, e.g. "AC"
  role: Role;
  department: string;
  status: UserStatus;
  currentTaskId: string | null;
  joinedAt: string; // ISO date
  invitedBy: string | null; // userId
  weeklyCapacityHours: number;
  skills: string[];
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  onboardingComplete: boolean;
  slackWebhookUrl: string;
  departments: string[];
}

export interface SpaceMember {
  userId: string;
  role: Role;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  color: string; // tailwind color
  icon: string; // lucide icon name
  createdBy: string; // userId
  members: SpaceMember[];
  createdAt: string; // ISO date
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  uploadedAt: string; // ISO date
}

export interface Revision {
  id: string;
  version: number;
  feedback: string;
  attachments: Attachment[];
  requestedBy: string; // userId
  requestedAt: string; // ISO date
  resolvedAt: string | null; // ISO date
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string; // ISO date
  type: CommentType;
}

export interface Timeline {
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
}

export interface Task {
  id: string;
  title: string;
  description: string;
  spaceId: string;
  parentTaskId: string | null; // for subtasks
  assigneeId: string | null;
  requesterId: string;
  priority: TaskPriority;
  status: TaskStatus;
  attachments: Attachment[];
  expectedTimeline: Timeline; // requester sets
  designTimeline: Timeline; // designer/lead sets
  timerStartedAt: number | null; // Date.now() timestamp
  totalTimeSpent: number; // seconds
  timerRunning: boolean;
  revisions: Revision[];
  comments: Comment[];
  tags: string[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  completedAt: string | null; // ISO date
  slackApprovalSent: boolean;
  slackApprovalStatus: SlackApprovalStatus | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  taskId?: string;
  createdAt: string; // ISO date
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO date
}

export interface DesignerReport {
  designerId: string;
  designerName: string;
  tasksCompleted: number;
  totalTimeSpent: number; // seconds
  avgTaskTime: number; // seconds
  revisionRate: number; // 0-1
  onTimeRate: number; // 0-1
  activeTasksCount: number;
}

export interface Report {
  id: string;
  period: 'weekly' | 'monthly';
  startDate: string; // ISO date
  endDate: string; // ISO date
  generatedAt: string; // ISO date
  totalTasksCompleted: number;
  totalTimeSpent: number; // seconds
  avgTaskTime: number; // seconds
  overallRevisionRate: number; // 0-1
  overallOnTimeRate: number; // 0-1
  designerBreakdown: DesignerReport[];
}

export interface DetailedDesignerReport extends DesignerReport {
  taskDetails: Array<{
    taskId: string;
    taskTitle: string;
    spaceName: string;
    status: TaskStatus;
    priority: TaskPriority;
    timeSpent: number;
    startDate: string | null;
    endDate: string | null;
    completedAt: string | null;
    revisionCount: number;
    isOverdue: boolean;
  }>;
  timeBySpace: Array<{ spaceName: string; hours: number }>;
  weeklyBreakdown: Array<{ week: string; completed: number; hoursLogged: number }>;
  recentActivity: Array<{ date: string; action: string; taskTitle: string }>;
  skills: string[];
  department: string;
  performanceScore: number;
  teamAvgTaskTime: number;
  teamAvgRevisionRate: number;
  teamAvgOnTimeRate: number;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string; // ISO date
}
