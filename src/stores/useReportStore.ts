import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Report, DesignerReport, DetailedDesignerReport, TaskStatus, TaskPriority } from '@/types';
import { generateId } from '@/lib/utils';
import { useTaskStore } from './useTaskStore';
import { useAuthStore } from './useAuthStore';
import { useSpaceStore } from './useSpaceStore';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';

interface ReportState {
  reports: Report[];

  generateWeeklyReport: () => Report;
  generateMonthlyReport: () => Report;
  generateCustomReport: (startDate: Date, endDate: Date) => Report;
  getDesignerReport: (designerId: string) => DesignerReport;
  generateDetailedDesignerReport: (designerId: string, startDate: Date, endDate: Date) => DetailedDesignerReport;
}

function buildDesignerBreakdown(
  startDate: Date,
  endDate: Date,
): DesignerReport[] {
  const tasks = useTaskStore.getState().tasks;
  const users = useAuthStore.getState().allUsers;
  const designers = users.filter(
    (u) => u.role === 'designer' || u.role === 'super_admin',
  );

  return designers.map((designer) => {
    const assignedTasks = tasks.filter((t) => t.assigneeId === designer.id);

    const completedTasks = assignedTasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt) >= startDate &&
        new Date(t.completedAt) <= endDate,
    );

    const totalTimeSpent = assignedTasks.reduce(
      (acc, t) => acc + t.totalTimeSpent,
      0,
    );

    const avgTaskTime =
      completedTasks.length > 0
        ? completedTasks.reduce((acc, t) => acc + t.totalTimeSpent, 0) /
          completedTasks.length
        : 0;

    const tasksWithRevisions = assignedTasks.filter(
      (t) => t.revisions.length > 0,
    ).length;
    const revisionRate =
      assignedTasks.length > 0 ? tasksWithRevisions / assignedTasks.length : 0;

    const completedWithTimeline = completedTasks.filter(
      (t) => t.designTimeline.endDate && t.completedAt,
    );
    const onTimeTasks = completedWithTimeline.filter(
      (t) =>
        new Date(t.completedAt!) <= new Date(t.designTimeline.endDate!),
    ).length;
    const onTimeRate =
      completedWithTimeline.length > 0
        ? onTimeTasks / completedWithTimeline.length
        : 1;

    const activeTasksCount = assignedTasks.filter(
      (t) => !['completed', 'approved'].includes(t.status),
    ).length;

    return {
      designerId: designer.id,
      designerName: designer.name,
      tasksCompleted: completedTasks.length,
      totalTimeSpent,
      avgTaskTime: Math.round(avgTaskTime),
      revisionRate: Math.round(revisionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      activeTasksCount,
    };
  });
}

function buildReport(period: 'weekly' | 'monthly', startDate?: Date, endDate?: Date): Report {
  const now = endDate ?? new Date();
  const start = startDate ?? new Date(now);
  if (!startDate) {
    if (period === 'weekly') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
    }
  }

  const breakdown = buildDesignerBreakdown(start, now);

  const totalTasksCompleted = breakdown.reduce(
    (acc, d) => acc + d.tasksCompleted,
    0,
  );
  const totalTimeSpent = breakdown.reduce(
    (acc, d) => acc + d.totalTimeSpent,
    0,
  );
  const avgTaskTime =
    totalTasksCompleted > 0
      ? Math.round(totalTimeSpent / totalTasksCompleted)
      : 0;

  const totalRevisionRate =
    breakdown.length > 0
      ? breakdown.reduce((acc, d) => acc + d.revisionRate, 0) /
        breakdown.length
      : 0;

  const totalOnTimeRate =
    breakdown.length > 0
      ? breakdown.reduce((acc, d) => acc + d.onTimeRate, 0) /
        breakdown.length
      : 1;

  return {
    id: generateId(),
    period,
    startDate: start.toISOString(),
    endDate: now.toISOString(),
    generatedAt: new Date().toISOString(),
    totalTasksCompleted,
    totalTimeSpent,
    avgTaskTime,
    overallRevisionRate: Math.round(totalRevisionRate * 100) / 100,
    overallOnTimeRate: Math.round(totalOnTimeRate * 100) / 100,
    designerBreakdown: breakdown,
  };
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: [],

      generateWeeklyReport: () => {
        const report = buildReport('weekly');
        set((state) => ({ reports: [...state.reports, report] }));
        return report;
      },

      generateMonthlyReport: () => {
        const report = buildReport('monthly');
        set((state) => ({ reports: [...state.reports, report] }));
        return report;
      },

      generateCustomReport: (startDate: Date, endDate: Date) => {
        const report = buildReport('weekly', startDate, endDate);
        set((state) => ({ reports: [...state.reports, report] }));
        return report;
      },

      getDesignerReport: (designerId: string) => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const breakdown = buildDesignerBreakdown(thirtyDaysAgo, now);
        const report = breakdown.find((d) => d.designerId === designerId);

        if (report) return report;

        const user = useAuthStore.getState().allUsers.find(
          (u) => u.id === designerId,
        );
        return {
          designerId,
          designerName: user?.name ?? 'Unknown',
          tasksCompleted: 0,
          totalTimeSpent: 0,
          avgTaskTime: 0,
          revisionRate: 0,
          onTimeRate: 1,
          activeTasksCount: 0,
        };
      },

      generateDetailedDesignerReport: (designerId: string, startDate: Date, endDate: Date) => {
        const tasks = useTaskStore.getState().tasks;
        const users = useAuthStore.getState().allUsers;
        const spaces = useSpaceStore.getState().spaces;
        const designer = users.find((u) => u.id === designerId);

        if (!designer) {
          return {
            designerId,
            designerName: 'Unknown',
            tasksCompleted: 0,
            totalTimeSpent: 0,
            avgTaskTime: 0,
            revisionRate: 0,
            onTimeRate: 1,
            activeTasksCount: 0,
            taskDetails: [],
            timeBySpace: [],
            weeklyBreakdown: [],
            recentActivity: [],
            skills: [],
            department: '',
            performanceScore: 0,
            teamAvgTaskTime: 0,
            teamAvgRevisionRate: 0,
            teamAvgOnTimeRate: 0,
          };
        }

        const assignedTasks = tasks.filter((t) => t.assigneeId === designerId);
        const tasksInPeriod = assignedTasks.filter((t) => {
          const created = new Date(t.createdAt);
          const completed = t.completedAt ? new Date(t.completedAt) : null;
          return (
            isWithinInterval(created, { start: startDate, end: endDate }) ||
            (completed && isWithinInterval(completed, { start: startDate, end: endDate })) ||
            (created <= endDate && (!completed || completed >= startDate) && !['completed', 'approved'].includes(t.status))
          );
        });

        const completedTasks = tasksInPeriod.filter(
          (t) => t.status === 'completed' && t.completedAt &&
            new Date(t.completedAt) >= startDate && new Date(t.completedAt) <= endDate,
        );

        const totalTimeSpent = tasksInPeriod.reduce((acc, t) => acc + t.totalTimeSpent, 0);
        const avgTaskTime = completedTasks.length > 0
          ? completedTasks.reduce((acc, t) => acc + t.totalTimeSpent, 0) / completedTasks.length
          : 0;

        const tasksWithRevisions = tasksInPeriod.filter((t) => t.revisions.length > 0).length;
        const revisionRate = tasksInPeriod.length > 0 ? tasksWithRevisions / tasksInPeriod.length : 0;

        const completedWithTimeline = completedTasks.filter(
          (t) => t.designTimeline.endDate && t.completedAt,
        );
        const onTimeTasks = completedWithTimeline.filter(
          (t) => new Date(t.completedAt!) <= new Date(t.designTimeline.endDate!),
        ).length;
        const onTimeRate = completedWithTimeline.length > 0
          ? onTimeTasks / completedWithTimeline.length
          : 1;

        const activeTasksCount = assignedTasks.filter(
          (t) => !['completed', 'approved'].includes(t.status),
        ).length;

        // Task details
        const taskDetails = tasksInPeriod.map((t) => {
          const space = spaces.find((s) => s.id === t.spaceId);
          const isOverdue = t.expectedTimeline.endDate &&
            !['completed', 'approved'].includes(t.status) &&
            new Date(t.expectedTimeline.endDate) < new Date();
          return {
            taskId: t.id,
            taskTitle: t.title,
            spaceName: space?.name ?? 'Unknown',
            status: t.status as TaskStatus,
            priority: t.priority as TaskPriority,
            timeSpent: t.totalTimeSpent,
            startDate: t.designTimeline.startDate ?? t.expectedTimeline.startDate,
            endDate: t.designTimeline.endDate ?? t.expectedTimeline.endDate,
            completedAt: t.completedAt,
            revisionCount: t.revisions.length,
            isOverdue: !!isOverdue,
          };
        });

        // Time by space
        const spaceTimeMap: Record<string, number> = {};
        tasksInPeriod.forEach((t) => {
          const space = spaces.find((s) => s.id === t.spaceId);
          const name = space?.name ?? 'Unknown';
          spaceTimeMap[name] = (spaceTimeMap[name] || 0) + t.totalTimeSpent;
        });
        const timeBySpace = Object.entries(spaceTimeMap).map(([spaceName, seconds]) => ({
          spaceName,
          hours: Math.round((seconds / 3600) * 10) / 10,
        }));

        // Weekly breakdown
        const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
        const weeklyBreakdown = weeks.map((weekStart) => {
          const weekEnd = endOfWeek(weekStart);
          const completedInWeek = completedTasks.filter((t) =>
            t.completedAt && isWithinInterval(new Date(t.completedAt), { start: weekStart, end: weekEnd }),
          ).length;
          const hoursInWeek = tasksInPeriod
            .filter((t) => {
              if (t.completedAt && isWithinInterval(new Date(t.completedAt), { start: weekStart, end: weekEnd })) return true;
              if (t.status === 'in-progress') return true;
              return false;
            })
            .reduce((acc, t) => acc + t.totalTimeSpent, 0);
          return {
            week: format(weekStart, 'MMM d'),
            completed: completedInWeek,
            hoursLogged: Math.round((hoursInWeek / 3600) * 10) / 10,
          };
        });

        // Recent activity from comments
        const recentActivity: Array<{ date: string; action: string; taskTitle: string }> = [];
        tasksInPeriod.forEach((t) => {
          t.comments
            .filter((c) => c.userId === designerId)
            .forEach((c) => {
              recentActivity.push({
                date: c.createdAt,
                action: c.type === 'request' ? 'Requested input' : 'Commented',
                taskTitle: t.title,
              });
            });
          if (t.completedAt && new Date(t.completedAt) >= startDate && new Date(t.completedAt) <= endDate) {
            recentActivity.push({
              date: t.completedAt,
              action: 'Completed task',
              taskTitle: t.title,
            });
          }
        });
        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Team averages for comparison
        const teamBreakdown = buildDesignerBreakdown(startDate, endDate);
        const teamDesigners = teamBreakdown.filter((d) => d.designerId !== designerId);
        const teamAvgTaskTime = teamDesigners.length > 0
          ? teamDesigners.reduce((acc, d) => acc + d.avgTaskTime, 0) / teamDesigners.length
          : 0;
        const teamAvgRevisionRate = teamDesigners.length > 0
          ? teamDesigners.reduce((acc, d) => acc + d.revisionRate, 0) / teamDesigners.length
          : 0;
        const teamAvgOnTimeRate = teamDesigners.length > 0
          ? teamDesigners.reduce((acc, d) => acc + d.onTimeRate, 0) / teamDesigners.length
          : 1;

        // Performance score
        const onTimeScore = onTimeRate * 40;
        const revisionScore = (1 - revisionRate) * 30;
        const completionScore = Math.min(completedTasks.length / 5, 1) * 30;
        const performanceScore = Math.round(onTimeScore + revisionScore + completionScore);

        return {
          designerId,
          designerName: designer.name,
          tasksCompleted: completedTasks.length,
          totalTimeSpent,
          avgTaskTime: Math.round(avgTaskTime),
          revisionRate: Math.round(revisionRate * 100) / 100,
          onTimeRate: Math.round(onTimeRate * 100) / 100,
          activeTasksCount,
          taskDetails,
          timeBySpace,
          weeklyBreakdown,
          recentActivity: recentActivity.slice(0, 20),
          skills: designer.skills,
          department: designer.department,
          performanceScore,
          teamAvgTaskTime: Math.round(teamAvgTaskTime),
          teamAvgRevisionRate: Math.round(teamAvgRevisionRate * 100) / 100,
          teamAvgOnTimeRate: Math.round(teamAvgOnTimeRate * 100) / 100,
        };
      },
    }),
    { name: 'designops-reports' },
  ),
);
