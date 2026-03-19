'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoginPage } from '@/components/auth/LoginPage';
import { OnboardingPage } from '@/components/auth/OnboardingPage';
import { MainApp } from '@/components/layout/MainApp';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  const { isAuthenticated, isNewUser, company } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const needsOnboarding = isAuthenticated && (isNewUser || (company && !company.onboardingComplete));

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '14px',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        }}
      />
      {!hydrated ? (
        <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm text-text-secondary">Loading DesignOps...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <LoginPage />
      ) : needsOnboarding ? (
        <OnboardingPage />
      ) : (
        <MainApp />
      )}
    </>
  );
}
