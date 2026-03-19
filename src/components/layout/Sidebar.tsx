'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Home,
  Layout,
  CheckSquare,
  Users,
  BarChart3,
  Bot,
  Settings,
  Bell,
  ChevronLeft,
  ChevronDown,
  LogOut,
  Plus,
} from 'lucide-react';
import type { Role } from '@/types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'team', label: 'Team', icon: Users, adminOnly: true },
  { id: 'reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SPACE_COLORS: Record<string, string> = {
  'bg-violet-500': '#7c3aed',
  'bg-emerald-500': '#10b981',
  'bg-amber-500': '#f59e0b',
  'bg-cyan-500': '#06b6d4',
  'bg-rose-500': '#ef4444',
  'bg-blue-500': '#3b82f6',
};

const roleLabels: Record<Role, string> = {
  super_admin: 'Admin',
  admin: 'Admin',
  designer: 'Designer',
  requester: 'Requester',
};

const roleBadgeVariant: Record<Role, 'purple' | 'info' | 'success' | 'warning'> = {
  super_admin: 'purple',
  admin: 'info',
  designer: 'success',
  requester: 'warning',
};

const CREATE_SPACE_COLORS = [
  '#7c3aed', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#3b82f6', '#8b5cf6',
];

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { currentUser, logout } = useAuthStore();
  const { spaces, createSpace } = useSpaceStore();
  const { getUnreadCount } = useNotificationStore();
  const [collapsed, setCollapsed] = useState(false);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;

  // Create Space form state
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState('#7c3aed');

  // Filter spaces to those the user is a member of (or all for admins)
  const userSpaces = currentUser
    ? currentUser.role === 'super_admin' || currentUser.role === 'admin'
      ? spaces
      : spaces.filter((s) => s.members.some((m) => m.userId === currentUser.id))
    : [];

  if (!currentUser) return null;

  const isAdminOrLead =
    currentUser.role === 'super_admin' || currentUser.role === 'admin';

  const filteredNav = mainNavItems.filter(
    (item) => !item.adminOnly || isAdminOrLead
  );

  const handleCreateSpace = () => {
    if (!newSpaceName.trim()) {
      toast.error('Please enter a space name');
      return;
    }
    const space = createSpace({
      name: newSpaceName.trim(),
      description: newSpaceDescription.trim(),
      color: newSpaceColor,
      icon: 'Layout',
      createdBy: currentUser.id,
      members: [{ userId: currentUser.id, role: currentUser.role }],
    });
    toast.success(`Space "${space.name}" created!`);
    setShowCreateSpace(false);
    setNewSpaceName('');
    setNewSpaceDescription('');
    setNewSpaceColor('#7c3aed');
    setCurrentView(`space-${space.id}`);
  };

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 64 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex h-screen flex-col border-r border-border bg-sidebar"
      >
        {/* Logo / Company */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border-light px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-bold text-text-primary"
              >
                DesignOps
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* User info */}
        <div className="border-b border-border-light px-3 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar
              name={currentUser.name}
              size="sm"
              status={currentUser.status}
            />
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium text-text-primary">
                    {currentUser.name}
                  </p>
                  <Badge variant={roleBadgeVariant[currentUser.role]}>
                    {roleLabels[currentUser.role]}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {/* Main nav */}
          <div className="space-y-0.5">
            {filteredNav.slice(0, 1).map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                active={currentView === item.id}
                collapsed={collapsed}
                onClick={() => setCurrentView(item.id)}
              />
            ))}
          </div>

          {/* Spaces section */}
          <div className="mt-4">
            <button
              onClick={() => setSpacesExpanded(!spacesExpanded)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary',
                collapsed && 'justify-center'
              )}
            >
              {!collapsed && (
                <>
                  <Layout className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">Spaces</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      !spacesExpanded && '-rotate-90'
                    )}
                  />
                </>
              )}
              {collapsed && <Layout className="h-4 w-4" />}
            </button>
            <AnimatePresence>
              {spacesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-0.5 space-y-0.5">
                    {userSpaces.map((space) => (
                      <button
                        key={space.id}
                        onClick={() => setCurrentView(`space-${space.id}`)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                          currentView === `space-${space.id}`
                            ? 'bg-primary-light text-primary font-medium'
                            : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
                          collapsed && 'justify-center px-0'
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: SPACE_COLORS[space.color] || space.color }}
                        />
                        {!collapsed && (
                          <span className="truncate">{space.name}</span>
                        )}
                      </button>
                    ))}
                    {!collapsed && (
                      <button
                        onClick={() => setShowCreateSpace(true)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>New Space</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Remaining nav items */}
          <div className="mt-4 space-y-0.5">
            {filteredNav.slice(1).map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                active={currentView === item.id}
                collapsed={collapsed}
                onClick={() => setCurrentView(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border-light px-2 py-2 space-y-0.5">
          {/* Notifications */}
          <button
            onClick={() => setCurrentView('notifications')}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
              'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              collapsed && 'justify-center'
            )}
          >
            <div className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {!collapsed && <span>Notifications</span>}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
              'text-text-secondary hover:bg-surface-tertiary hover:text-error',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
              'text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary',
              collapsed && 'justify-center'
            )}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180'
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Create Space Modal */}
      <Modal
        isOpen={showCreateSpace}
        onClose={() => setShowCreateSpace(false)}
        title="Create New Space"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Space Name"
            placeholder="e.g. Marketing Designs"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What is this space for?"
            value={newSpaceDescription}
            onChange={(e) => setNewSpaceDescription(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Color
            </label>
            <div className="flex gap-2">
              {CREATE_SPACE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewSpaceColor(color)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    newSpaceColor === color
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateSpace(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSpace} disabled={!newSpaceName.trim()}>
              Create Space
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-primary-light text-primary font-medium'
          : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
        collapsed && 'justify-center'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
