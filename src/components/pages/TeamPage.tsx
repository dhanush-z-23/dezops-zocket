'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  Briefcase,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Role, UserStatus } from '@/types';

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'designer', label: 'Designer' },
  { value: 'requester', label: 'Requester' },
];

const roleBadgeVariant: Record<Role, 'purple' | 'info' | 'success' | 'warning'> = {
  super_admin: 'purple',
  admin: 'info',
  designer: 'success',
  requester: 'warning',
};

const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  designer: 'Designer',
  requester: 'Requester',
};

const statusConfig: Record<UserStatus, { label: string; color: string; dotClass: string }> = {
  available: { label: 'Available', color: 'text-success', dotClass: 'bg-available' },
  busy: { label: 'Busy', color: 'text-warning', dotClass: 'bg-busy' },
  'on-leave': { label: 'On Leave', color: 'text-text-tertiary', dotClass: 'bg-on-leave' },
  blocked: { label: 'Blocked', color: 'text-error', dotClass: 'bg-blocked' },
};

const statusOptions: { value: string; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'on-leave', label: 'On Leave' },
];

export function TeamPage() {
  const { currentUser, allUsers, inviteUser, updateUserStatus, blockDesigner, unblockDesigner, removeUser, company } = useAuthStore();
  const { tasks, getDesignerWorkload, getTaskById } = useTaskStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('designer');
  const [inviteDept, setInviteDept] = useState<string>('');
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string }>({});

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const departments = company?.departments ?? [];
  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map((d) => ({ value: d, label: d })),
  ];

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterDepartment !== 'all' && u.department !== filterDepartment) return false;
      if (filterStatus !== 'all' && u.status !== filterStatus) return false;
      return true;
    });
  }, [allUsers, filterRole, filterDepartment, filterStatus]);

  const designers = allUsers.filter((u) => u.role === 'designer');
  const workloadData = designers.map((d) => {
    const workload = getDesignerWorkload(d.id);
    return { name: d.name, tasks: workload };
  });

  function getWorkloadColor(count: number) {
    if (count < 3) return '#10b981';
    if (count <= 5) return '#f59e0b';
    return '#ef4444';
  }

  function getCompletedThisMonth(userId: string) {
    const now = new Date();
    return tasks.filter(
      (t) =>
        t.assigneeId === userId &&
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt).getMonth() === now.getMonth() &&
        new Date(t.completedAt).getFullYear() === now.getFullYear(),
    ).length;
  }

  function getActiveTasksCount(userId: string) {
    return tasks.filter(
      (t) => t.assigneeId === userId && !['completed', 'approved'].includes(t.status),
    ).length;
  }

  function handleInvite() {
    const errors: { name?: string; email?: string } = {};
    if (!inviteName.trim()) errors.name = 'Name is required';
    if (!inviteEmail.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) errors.email = 'Invalid email';

    if (Object.keys(errors).length > 0) {
      setInviteErrors(errors);
      return;
    }

    inviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole as Role, inviteDept || departments[0] || 'Design');
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('designer');
    setInviteDept('');
    setInviteErrors({});
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Team Management</h1>
            <p className="text-sm text-text-secondary">
              {allUsers.length} member{allUsers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          options={[{ value: 'all', label: 'All Roles' }, ...roleOptions]}
        />
        <Select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          options={departmentOptions}
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            ...statusOptions,
            { value: 'blocked', label: 'Blocked' },
          ]}
        />
      </div>

      {/* Team Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user, i) => {
          const status = statusConfig[user.status];
          const currentTask = user.currentTaskId ? getTaskById(user.currentTaskId) : null;
          const activeCount = getActiveTasksCount(user.id);
          const completedMonth = getCompletedThisMonth(user.id);

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-white p-5 space-y-4"
            >
              {/* User info */}
              <div className="flex items-start gap-3">
                <Avatar name={user.name} size="lg" status={user.status} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                    <span className="text-[11px] text-text-tertiary">{user.department}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                {user.status === 'busy' && currentTask && (
                  <span className="text-xs text-text-tertiary truncate">
                    Working on: {currentTask.title}
                  </span>
                )}
                {user.status === 'blocked' && (
                  <span className="text-xs text-error">Blocked by admin</span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <div className="flex items-center gap-1">
                  <ListTodo className="h-3.5 w-3.5" />
                  <span>{activeCount} active</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{completedMonth} this month</span>
                </div>
              </div>

              {/* Skills */}
              {user.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Admin actions */}
              {isAdmin && user.id !== currentUser?.id && (
                <div className="flex items-center gap-2 border-t border-border-light pt-3">
                  {user.status === 'blocked' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unblockDesigner(user.id)}
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      Unblock
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => blockDesigner(user.id)}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Block
                    </Button>
                  )}
                  <Select
                    value={user.status === 'blocked' ? '' : user.status}
                    onChange={(e) => updateUserStatus(user.id, e.target.value as UserStatus)}
                    options={statusOptions}
                    className="!h-8 text-xs"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeUser(user.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">No team members match your filters.</p>
        </div>
      )}

      {/* Designer Workload Overview */}
      {designers.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Designer Workload
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(200, designers.length * 48)}>
            <BarChart data={workloadData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#1e293b' }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="tasks" radius={[0, 6, 6, 0]} barSize={24}>
                {workloadData.map((entry, index) => (
                  <Cell key={index} fill={getWorkloadColor(entry.tasks)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-text-tertiary">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Under 3 tasks</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> 3-5 tasks</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-error" /> 5+ tasks</span>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Member" size="md">
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Jane Smith"
            value={inviteName}
            onChange={(e) => { setInviteName(e.target.value); setInviteErrors((p) => ({ ...p, name: undefined })); }}
            error={inviteErrors.name}
          />
          <Input
            label="Email"
            placeholder="e.g. jane@company.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteErrors((p) => ({ ...p, email: undefined })); }}
            error={inviteErrors.email}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={roleOptions}
          />
          <Select
            label="Department"
            value={inviteDept}
            onChange={(e) => setInviteDept(e.target.value)}
            options={departments.map((d) => ({ value: d, label: d }))}
            placeholder="Select department"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button onClick={handleInvite}>
              <UserPlus className="h-4 w-4" />
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
