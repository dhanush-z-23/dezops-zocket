'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

const roleLabels: Record<Role, string> = {
  super_admin: 'SuperAdmin',
  admin: 'Admin',
  designer: 'Senior Designer',
  requester: 'Requester',
};

const roleBadgeVariant: Record<Role, 'purple' | 'info' | 'success' | 'warning'> = {
  super_admin: 'purple',
  admin: 'info',
  designer: 'success',
  requester: 'warning',
};

const demoDescriptions: Record<string, string> = {
  'user-1': 'Design Lead',
  'user-2': 'Senior Designer',
  'user-5': 'Marketing Manager',
  'user-7': 'HR Coordinator',
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage() {
  const { allUsers, login, loginWithGoogle, signUpWithGoogle } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showGooglePopup, setShowGooglePopup] = useState(false);
  const [googleAction, setGoogleAction] = useState<'signin' | 'signup'>('signin');

  // Sign-in form
  const [signInEmail, setSignInEmail] = useState('');

  // Sign-up form
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');

  // Google popup
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  const demoUsers = allUsers.filter(u =>
    ['user-1', 'user-2', 'user-5', 'user-7'].includes(u.id)
  );

  const handleSignInEmail = () => {
    if (!signInEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    const success = login(signInEmail.trim());
    if (!success) {
      toast.error('No account found with that email');
    }
  };

  const handleSignUpEmail = () => {
    if (!signUpName.trim() || !signUpEmail.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    signUpWithGoogle(signUpName.trim(), signUpEmail.trim());
    toast.success('Account created! Let\'s set up your workspace.');
  };

  const openGooglePopup = (action: 'signin' | 'signup') => {
    setGoogleAction(action);
    setShowGooglePopup(true);
    setShowCustomEmailInput(false);
    setGoogleCustomEmail('');
    setGoogleCustomName('');
  };

  const handleGoogleAccountSelect = (email: string, name: string) => {
    setShowGooglePopup(false);
    if (googleAction === 'signin') {
      const success = loginWithGoogle(email);
      if (success) {
        toast.success(`Welcome back, ${name}!`);
      } else {
        toast.error('No account found. Please sign up first.');
        setMode('signup');
      }
    } else {
      signUpWithGoogle(name, email);
      toast.success('Account created! Let\'s set up your workspace.');
    }
  };

  const handleGoogleCustomSubmit = () => {
    if (!googleCustomEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (googleAction === 'signup' && !googleCustomName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    const name = googleCustomName.trim() || googleCustomEmail.split('@')[0];
    handleGoogleAccountSelect(googleCustomEmail.trim(), name);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">DesignOps</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Streamline your design team operations
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-lg border border-border bg-white p-1">
            <button
              onClick={() => setMode('signin')}
              className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <AnimatePresence mode="wait">
            {mode === 'signin' ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Google Sign In */}
                <button
                  onClick={() => openGooglePopup('signin')}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-all hover:bg-surface-secondary hover:shadow"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Sign in with Google
                </button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-text-tertiary">or sign in with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Email sign in */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter your email"
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignInEmail()}
                    />
                  </div>
                  <Button onClick={handleSignInEmail} size="md">
                    <Mail className="h-4 w-4" />
                    Sign In
                  </Button>
                </div>

                {/* Demo accounts */}
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium text-text-tertiary">Or try a demo account</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid gap-2">
                    {demoUsers.map((user, index) => (
                      <motion.button
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                        onClick={() => login(user.id)}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary/30 hover:bg-primary-light/30 hover:shadow-sm"
                      >
                        <Avatar name={user.name} size="md" status={user.status} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {user.name}
                            </span>
                            <Badge variant={roleBadgeVariant[user.role]}>
                              {roleLabels[user.role]}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-tertiary">
                            {demoDescriptions[user.id]} &middot; {user.department}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Switch to sign up */}
                <p className="mt-5 text-center text-sm text-text-secondary">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="font-medium text-primary hover:text-primary-dark"
                  >
                    Sign up
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Google Sign Up */}
                <button
                  onClick={() => openGooglePopup('signup')}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-all hover:bg-surface-secondary hover:shadow"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Sign up with Google
                </button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-text-tertiary">or create account with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Email sign up */}
                <div className="space-y-3">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                  />
                  <Input
                    label="Email"
                    placeholder="Enter your email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignUpEmail()}
                  />
                  <Button onClick={handleSignUpEmail} size="lg" className="w-full">
                    Create Account
                  </Button>
                </div>

                {/* Switch to sign in */}
                <p className="mt-5 text-center text-sm text-text-secondary">
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="font-medium text-primary hover:text-primary-dark"
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          This is a demo environment. No real data is stored.
        </p>
      </motion.div>

      {/* Google OAuth Simulation Modal */}
      <Modal isOpen={showGooglePopup} onClose={() => setShowGooglePopup(false)} size="sm">
        <div className="text-center">
          {/* Google branding header */}
          <div className="mb-1 flex items-center justify-center gap-2">
            <GoogleIcon className="h-6 w-6" />
            <span className="text-lg font-medium text-text-primary">Google</span>
          </div>
          <h3 className="mb-1 text-base font-medium text-text-primary">
            {googleAction === 'signin' ? 'Choose an account' : 'Sign up with Google'}
          </h3>
          <p className="mb-5 text-xs text-text-tertiary">
            to continue to DesignOps
          </p>

          {/* Existing accounts */}
          <div className="space-y-1 mb-3">
            {demoUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleGoogleAccountSelect(user.email, user.name)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {user.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{user.name}</p>
                  <p className="text-xs text-text-tertiary">{user.email}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-border" />

          {/* Use another account */}
          {!showCustomEmailInput ? (
            <button
              onClick={() => setShowCustomEmailInput(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border">
                <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-text-primary">Use another account</span>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 overflow-hidden"
            >
              {googleAction === 'signup' && (
                <Input
                  placeholder="Full name"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                />
              )}
              <Input
                placeholder="Email address"
                type="email"
                value={googleCustomEmail}
                onChange={(e) => setGoogleCustomEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoogleCustomSubmit()}
              />
              <Button onClick={handleGoogleCustomSubmit} size="md" className="w-full">
                Continue
              </Button>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  );
}
