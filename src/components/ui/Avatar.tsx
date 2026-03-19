'use client';

import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { UserStatus } from '@/types';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  status?: UserStatus;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

const statusDotSizes: Record<AvatarSize, string> = {
  sm: 'w-2 h-2 -bottom-0 -right-0',
  md: 'w-2.5 h-2.5 -bottom-0 -right-0',
  lg: 'w-3 h-3 -bottom-0.5 -right-0.5',
};

const statusColors: Record<UserStatus, string> = {
  available: 'bg-available',
  busy: 'bg-busy',
  'on-leave': 'bg-on-leave',
  blocked: 'bg-blocked',
};

function hashColor(name: string): string {
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, size = 'md', status, className }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = hashColor(name);

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white',
          bgColor,
          sizeStyles[size]
        )}
      >
        {initials}
      </div>
      {status && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-white',
            statusColors[status],
            statusDotSizes[size]
          )}
        />
      )}
    </div>
  );
}
