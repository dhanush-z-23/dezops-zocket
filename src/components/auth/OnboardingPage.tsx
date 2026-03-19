'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, FolderPlus, Check, Plus, X, Upload, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

const PRESET_DEPARTMENTS = ['Marketing', 'HR', 'CSM', 'Engineering'];
const TOTAL_STEPS = 4;

interface InviteMember {
  name: string;
  email: string;
  role: Role;
  sent: boolean;
}

export function OnboardingPage() {
  const { completeOnboarding, sendInvite, pendingInvites, currentUser } = useAuthStore();
  const { createSpace } = useSpaceStore();
  const [step, setStep] = useState(1);

  // Step 1
  const [companyName, setCompanyName] = useState('');

  // Step 2
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDept, setNewDept] = useState('');

  // Step 3
  const [members, setMembers] = useState<InviteMember[]>([
    { name: '', email: '', role: 'designer', sent: false },
  ]);

  // Step 4
  const [spaceName, setSpaceName] = useState('');
  const [spaceColor, setSpaceColor] = useState('#7c3aed');

  const progress = (step / TOTAL_STEPS) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return companyName.trim().length > 0;
      case 2:
        return departments.length > 0;
      case 3:
        return true;
      case 4:
        return spaceName.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      completeOnboarding(companyName, departments);

      // Create the first space
      if (spaceName.trim() && currentUser) {
        createSpace({
          name: spaceName.trim(),
          description: `${spaceName.trim()} workspace`,
          color: spaceColor,
          icon: 'FolderPlus',
          createdBy: currentUser.id,
          members: [{ userId: currentUser.id, role: currentUser.role }],
        });
      }

      toast.success('Workspace setup complete! Welcome aboard.');
    }
  };

  const toggleDepartment = (dept: string) => {
    setDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const addCustomDept = () => {
    const trimmed = newDept.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setDepartments((prev) => [...prev, trimmed]);
      setNewDept('');
    }
  };

  const addMember = () => {
    setMembers((prev) => [...prev, { name: '', email: '', role: 'designer', sent: false }]);
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof InviteMember, value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handleSendInvite = (index: number) => {
    const member = members[index];
    if (!member.name.trim() || !member.email.trim()) {
      toast.error('Please fill in both name and email');
      return;
    }
    const department = departments.length > 0 ? departments[0] : 'General';
    sendInvite(member.email.trim(), member.name.trim(), member.role, department);
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, sent: true } : m))
    );
    toast.success(`Invite sent to ${member.email}!`);
  };

  const getInviteStatus = (email: string): 'pending' | 'accepted' | null => {
    const invite = pendingInvites.find((inv) => inv.email === email);
    return invite ? invite.status : null;
  };

  const spaceColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#8b5cf6'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        Company Details
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Tell us about your organization
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Input
                      label="Company Name"
                      placeholder="e.g. Acme Design Studio"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">
                        Company Logo
                      </label>
                      <div className="flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary-light/20 transition-colors">
                        <div className="flex flex-col items-center gap-1 text-text-tertiary">
                          <Upload className="h-5 w-5" />
                          <span className="text-xs">Click to upload</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        Add Departments
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Select or create the departments in your company
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {PRESET_DEPARTMENTS.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => toggleDepartment(dept)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          departments.includes(dept)
                            ? 'border-primary bg-primary-light text-primary'
                            : 'border-border text-text-secondary hover:border-primary/30'
                        }`}
                      >
                        {departments.includes(dept) && (
                          <Check className="mr-1 inline h-3.5 w-3.5" />
                        )}
                        {dept}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom department..."
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomDept()}
                    />
                    <Button variant="outline" onClick={addCustomDept} size="md">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {departments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {departments
                        .filter((d) => !PRESET_DEPARTMENTS.includes(d))
                        .map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-text-secondary"
                          >
                            {dept}
                            <button
                              onClick={() => toggleDepartment(dept)}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-border"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        Invite Team Members
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Add people to your workspace
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {members.map((member, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="grid flex-1 grid-cols-3 gap-2">
                            <Input
                              placeholder="Name"
                              value={member.name}
                              onChange={(e) =>
                                updateMember(index, 'name', e.target.value)
                              }
                              disabled={member.sent}
                            />
                            <Input
                              placeholder="Email"
                              value={member.email}
                              onChange={(e) =>
                                updateMember(index, 'email', e.target.value)
                              }
                              disabled={member.sent}
                            />
                            <Select
                              value={member.role}
                              onChange={(e) =>
                                updateMember(index, 'role', e.target.value)
                              }
                              options={[
                                { value: 'designer', label: 'Designer' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'requester', label: 'Requester' },
                              ]}
                              disabled={member.sent}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {!member.sent ? (
                              <button
                                onClick={() => handleSendInvite(index)}
                                className="mt-0.5 rounded-lg p-1.5 text-primary hover:bg-primary-light transition-colors"
                                title="Send invite"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            ) : (
                              <Badge variant={getInviteStatus(member.email) === 'accepted' ? 'success' : 'warning'}>
                                {getInviteStatus(member.email) === 'accepted' ? 'Accepted' : 'Pending'}
                              </Badge>
                            )}
                            {members.length > 1 && !member.sent && (
                              <button
                                onClick={() => removeMember(index)}
                                className="mt-0.5 rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-error"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addMember}
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
                  >
                    <Plus className="h-4 w-4" />
                    Add another member
                  </button>
                  <p className="mt-4 rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-tertiary">
                    Team members will receive an email invitation to join your workspace.
                  </p>
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                      <FolderPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        Create Your First Space
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Spaces help organize work by project or team
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Input
                      label="Space Name"
                      placeholder="e.g. Marketing Designs"
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">
                        Color
                      </label>
                      <div className="flex gap-2">
                        {spaceColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSpaceColor(color)}
                            className={`h-8 w-8 rounded-full transition-all ${
                              spaceColor === color
                                ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canProceed()}>
              {step === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
