'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Building2,
  Bell,
  Slack,
  AlertTriangle,
  Plus,
  X,
  Check,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/stores/useAuthStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/types';

// ---------------------------------------------------------------------------
// Animation preset
// ---------------------------------------------------------------------------

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      {...fadeUp}
      className="rounded-xl border border-border bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-tertiary">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'left-0.5 translate-x-4' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill tag chip
// ---------------------------------------------------------------------------

function SkillChip({ skill, onRemove }: { skill: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
      {skill}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

function ProfileSection() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateCurrentUser = useAuthStore((s) => s.updateCurrentUser);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [department, setDepartment] = useState(currentUser?.department ?? '');
  const [skills, setSkills] = useState<string[]>(currentUser?.skills ?? []);
  const [newSkill, setNewSkill] = useState('');
  const [capacity, setCapacity] = useState(String(currentUser?.weeklyCapacityHours ?? 40));
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const roleBadgeVariant = (): 'purple' | 'info' | 'default' => {
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') return 'purple';
    if (currentUser.role === 'designer') return 'info';
    return 'default';
  };

  const roleLabel = () => {
    const map: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      designer: 'Designer',
      requester: 'Requester',
    };
    return map[currentUser.role] ?? currentUser.role;
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateCurrentUser({
      name: name.trim() || currentUser.name,
      department: department.trim() || currentUser.department,
      skills,
      weeklyCapacityHours: Math.max(1, parseInt(capacity) || 40),
    });
    setSaving(false);
    toast.success('Profile updated successfully');
  };

  return (
    <SettingSection
      icon={UserIcon}
      title="Profile Settings"
      description="Update your personal information visible to your team."
    >
      {/* Avatar + role */}
      <div className="flex items-center gap-4">
        <Avatar name={currentUser.name} size="lg" status={currentUser.status} />
        <div>
          <p className="font-medium text-text-primary">{currentUser.name}</p>
          <p className="text-xs text-text-tertiary">{currentUser.email}</p>
          <div className="mt-1">
            <Badge variant={roleBadgeVariant()}>{roleLabel()}</Badge>
          </div>
        </div>
      </div>

      {/* Name */}
      <Input
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your full name"
      />

      {/* Email (read-only) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">Email</label>
        <div className="flex h-9 items-center rounded-lg border border-border bg-surface-secondary px-3 text-sm text-text-tertiary">
          {currentUser.email}
        </div>
        <p className="text-xs text-text-tertiary">Email cannot be changed.</p>
      </div>

      {/* Department */}
      <Input
        label="Department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="e.g. Design, Marketing"
      />

      {/* Skills */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">Skills</label>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <SkillChip key={skill} skill={skill} onRemove={() => removeSkill(skill)} />
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            placeholder="Add a skill…"
            className={cn(
              'h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            )}
          />
          <Button variant="outline" size="sm" onClick={addSkill} disabled={!newSkill.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Weekly capacity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">Weekly capacity (hours)</label>
        <input
          type="number"
          min={1}
          max={80}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className={cn(
            'h-9 w-32 rounded-lg border border-border bg-white px-3 text-sm text-text-primary',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          )}
        />
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {!saving && <Check className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </SettingSection>
  );
}

// ---------------------------------------------------------------------------
// Company section (admin only)
// ---------------------------------------------------------------------------

function CompanySection() {
  const company = useAuthStore((s) => s.company);
  const updateCompany = useAuthStore((s) => s.updateCompany);

  const [companyName, setCompanyName] = useState(company?.name ?? '');
  const [departments, setDepartments] = useState<string[]>(company?.departments ?? []);
  const [newDept, setNewDept] = useState('');
  const [saving, setSaving] = useState(false);

  if (!company) return null;

  const addDept = () => {
    const trimmed = newDept.trim();
    if (!trimmed || departments.includes(trimmed)) return;
    setDepartments((prev) => [...prev, trimmed]);
    setNewDept('');
  };

  const removeDept = (dept: string) => {
    setDepartments((prev) => prev.filter((d) => d !== dept));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateCompany({
      name: companyName.trim() || company.name,
      departments,
    });
    setSaving(false);
    toast.success('Company settings saved');
  };

  return (
    <SettingSection
      icon={Building2}
      title="Company Settings"
      description="Manage your company details and departments."
    >
      {/* Logo placeholder */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-light text-xl font-bold text-primary">
          {company.logo}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{company.name}</p>
          <p className="text-xs text-text-tertiary">Logo upload coming soon</p>
        </div>
      </div>

      {/* Company name */}
      <Input
        label="Company name"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Your company name"
      />

      {/* Departments */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">Departments</label>
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => (
            <span
              key={dept}
              className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-text-secondary"
            >
              {dept}
              <button
                onClick={() => removeDept(dept)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-border transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDept()}
            placeholder="Add department…"
            className={cn(
              'h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            )}
          />
          <Button variant="outline" size="sm" onClick={addDept} disabled={!newDept.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {!saving && <Check className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </SettingSection>
  );
}

// ---------------------------------------------------------------------------
// Notification preferences section
// ---------------------------------------------------------------------------

const NOTIFICATION_OPTIONS: { key: NotificationType; label: string; description: string }[] = [
  { key: 'task_assigned', label: 'Task assigned', description: 'When a task is assigned to you' },
  { key: 'task_updated', label: 'Task updated', description: 'When a task you follow is updated' },
  { key: 'comment_added', label: 'New comment', description: 'When someone comments on your task' },
  {
    key: 'revision_requested',
    label: 'Revision requested',
    description: 'When revisions are requested on your work',
  },
  {
    key: 'approval_received',
    label: 'Approval received',
    description: 'When your design is approved',
  },
  {
    key: 'mention',
    label: 'Mentions',
    description: 'When someone mentions you in a comment',
  },
];

function NotificationSection() {
  const [prefs, setPrefs] = useState<Record<NotificationType, boolean>>({
    task_assigned: true,
    task_updated: true,
    comment_added: true,
    revision_requested: true,
    approval_received: true,
    status_changed: false,
    mention: true,
    system: false,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: NotificationType) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('Notification preferences saved');
  };

  return (
    <SettingSection
      icon={Bell}
      title="Notification Preferences"
      description="Choose which events trigger notifications for you."
    >
      <div className="divide-y divide-border">
        {NOTIFICATION_OPTIONS.map(({ key, label, description }) => (
          <Toggle
            key={key}
            checked={prefs[key]}
            onChange={() => toggle(key)}
            label={label}
            description={description}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {!saving && <Check className="h-4 w-4" />}
          Save preferences
        </Button>
      </div>
    </SettingSection>
  );
}

// ---------------------------------------------------------------------------
// Slack integration section
// ---------------------------------------------------------------------------

function SlackSection() {
  const company = useAuthStore((s) => s.company);
  const updateCompany = useAuthStore((s) => s.updateCompany);

  const [webhookUrl, setWebhookUrl] = useState(company?.slackWebhookUrl ?? '');
  const [enabled, setEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setTesting(false);
    toast.success('Slack connection test successful!');
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateCompany({ slackWebhookUrl: webhookUrl });
    setSaving(false);
    toast.success('Slack integration saved');
  };

  return (
    <SettingSection
      icon={Slack}
      title="Slack Integration"
      description="Connect Slack to receive approval notifications and send design reviews."
    >
      <Toggle
        checked={enabled}
        onChange={setEnabled}
        label="Enable Slack integration"
        description="Send approval requests and updates to Slack"
      />

      <div className={cn('space-y-3 transition-opacity', !enabled && 'pointer-events-none opacity-40')}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Incoming Webhook URL</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className={cn(
                  'h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-text-primary',
                  'placeholder:text-text-tertiary',
                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                )}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={!webhookUrl.trim() || testing}
              loading={testing}
            >
              {!testing && <Check className="h-3.5 w-3.5" />}
              Test
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            Find this in your Slack app settings under Incoming Webhooks.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={!enabled}>
          {!saving && <Check className="h-4 w-4" />}
          Save integration
        </Button>
      </div>
    </SettingSection>
  );
}

// ---------------------------------------------------------------------------
// Danger zone section (admin only)
// ---------------------------------------------------------------------------

function DangerZoneSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setResetting(false);
    setConfirmOpen(false);
    toast.success('Demo data has been reset');
  };

  return (
    <>
      <motion.div
        {...fadeUp}
        className="rounded-xl border border-error/30 bg-error/5 p-6"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error/10">
            <AlertTriangle className="h-4.5 w-4.5 text-error" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-error">Danger Zone</h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              These actions are irreversible. Please proceed with caution.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-error/20 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Reset demo data</p>
            <p className="text-xs text-text-secondary">
              Restore all tasks, users, and spaces to the original demo state.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
            Reset
          </Button>
        </div>
      </motion.div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset demo data?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will restore all tasks, users, and spaces to the original demo state. Any changes
            you&apos;ve made will be lost. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleReset}
              loading={resetting}
            >
              {!resetting && <AlertTriangle className="h-4 w-4" />}
              Reset data
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page Export
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  const isAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your profile, company, and integrations.
        </p>
      </motion.div>

      {/* Sections */}
      <div className="space-y-5">
        <ProfileSection />
        {isAdmin && <CompanySection />}
        <NotificationSection />
        <SlackSection />
        {isAdmin && <DangerZoneSection />}
      </div>
    </div>
  );
}
