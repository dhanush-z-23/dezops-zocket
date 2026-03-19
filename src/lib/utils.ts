import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TaskStatus, TaskPriority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    backlog: 'text-gray-400 bg-gray-400/10',
    todo: 'text-blue-400 bg-blue-400/10',
    'in-progress': 'text-yellow-400 bg-yellow-400/10',
    'in-review': 'text-purple-400 bg-purple-400/10',
    'revision-requested': 'text-orange-400 bg-orange-400/10',
    approved: 'text-emerald-400 bg-emerald-400/10',
    completed: 'text-green-400 bg-green-400/10',
  };
  return map[status] ?? 'text-gray-400 bg-gray-400/10';
}

export function getPriorityColor(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    urgent: 'text-red-500 bg-red-500/10',
    high: 'text-orange-500 bg-orange-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    low: 'text-blue-500 bg-blue-500/10',
  };
  return map[priority] ?? 'text-gray-500 bg-gray-500/10';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
