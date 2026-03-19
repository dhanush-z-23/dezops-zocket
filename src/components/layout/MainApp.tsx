'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import DashboardPage from '@/components/pages/DashboardPage';
import MyTasksPage from '@/components/pages/MyTasksPage';
import { SpaceViewPage } from '@/components/pages/SpaceViewPage';
import { TaskDetailPage } from '@/components/pages/TaskDetailPage';
import { TeamPage } from '@/components/pages/TeamPage';
import { ReportsPage } from '@/components/pages/ReportsPage';
import AIAssistantPage from '@/components/pages/AIAssistantPage';
import SettingsPage from '@/components/pages/SettingsPage';
import NotificationsPage from '@/components/pages/NotificationsPage';

interface ViewState {
  page: string;
  taskId?: string;
  spaceId?: string;
  previousPage?: string;
}

export function MainApp() {
  const [view, setView] = useState<ViewState>({ page: 'dashboard' });

  const navigate = useCallback((page: string) => {
    setView({ page });
  }, []);

  const openTask = useCallback((taskId: string) => {
    setView((prev) => ({
      page: 'task-detail',
      taskId,
      previousPage: prev.page,
      spaceId: prev.spaceId,
    }));
  }, []);

  const goBack = useCallback(() => {
    setView((prev) => ({
      page: prev.previousPage || 'dashboard',
      spaceId: prev.spaceId,
    }));
  }, []);

  // Sidebar uses flat string IDs — map space-{id} to space view
  const handleNavigation = useCallback((viewId: string) => {
    if (viewId.startsWith('space-')) {
      const spaceId = viewId.replace('space-', '');
      setView({ page: 'space', spaceId });
    } else {
      setView({ page: viewId });
    }
  }, []);

  // Compute what the sidebar should highlight
  const sidebarView = view.page === 'space' && view.spaceId
    ? `space-${view.spaceId}`
    : view.page === 'task-detail'
      ? view.previousPage || 'dashboard'
      : view.page;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar currentView={sidebarView} setCurrentView={handleNavigation} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <PageContent view={view} openTask={openTask} goBack={goBack} navigate={navigate} />
        </div>
      </main>
    </div>
  );
}

function PageContent({
  view,
  openTask,
  goBack,
  navigate,
}: {
  view: ViewState;
  openTask: (taskId: string) => void;
  goBack: () => void;
  navigate: (page: string) => void;
}) {
  switch (view.page) {
    case 'dashboard':
      return <DashboardPage onOpenTask={openTask} onNavigate={navigate} />;
    case 'my-tasks':
      return <MyTasksPage onOpenTask={openTask} />;
    case 'space':
      return view.spaceId ? (
        <SpaceViewPage spaceId={view.spaceId} onOpenTask={openTask} />
      ) : (
        <DashboardPage onOpenTask={openTask} onNavigate={navigate} />
      );
    case 'task-detail':
      return view.taskId ? (
        <TaskDetailPage taskId={view.taskId} onBack={goBack} />
      ) : (
        <DashboardPage onOpenTask={openTask} onNavigate={navigate} />
      );
    case 'team':
      return <TeamPage />;
    case 'reports':
      return <ReportsPage />;
    case 'ai-assistant':
      return <AIAssistantPage />;
    case 'settings':
      return <SettingsPage />;
    case 'notifications':
      return <NotificationsPage onOpenTask={openTask} />;
    default:
      return <DashboardPage onOpenTask={openTask} onNavigate={navigate} />;
  }
}
