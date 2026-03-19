'use client';

import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Timer,
  RotateCcw,
  TrendingUp,
  FileText,
  Printer,
  Download,
  ChevronRight,
  AlertTriangle,
  Target,
  Award,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useReportStore } from '@/stores/useReportStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatTime, formatDate } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import type { Report, DesignerReport, DetailedDesignerReport, TaskStatus } from '@/types';

const PIE_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#64748b', '#ec4899', '#8b5cf6'];

const STATUS_COLORS: Record<string, string> = {
  'completed': '#10b981',
  'approved': '#06b6d4',
  'in-progress': '#f59e0b',
  'in-review': '#7c3aed',
  'revision-requested': '#ef4444',
  'todo': '#3b82f6',
  'backlog': '#94a3b8',
};

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress',
    'in-review': 'In Review', 'revision-requested': 'Revision', approved: 'Approved', completed: 'Completed',
  };
  return map[s] ?? s;
}

function statusBadge(s: TaskStatus): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    backlog: 'default', todo: 'info', 'in-progress': 'warning', 'in-review': 'purple',
    'revision-requested': 'error', approved: 'success', completed: 'success',
  };
  return map[s] ?? 'default';
}

function priorityBadge(p: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' {
  const map: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    urgent: 'error', high: 'warning', medium: 'info', low: 'default',
  };
  return map[p] ?? 'default';
}

// ---------------------------------------------------------------------------
// Metric Bar (visual comparison bar)
// ---------------------------------------------------------------------------
function MetricBar({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">{value}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Score Ring
// ---------------------------------------------------------------------------
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={6} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={6} fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export function ReportsPage() {
  const { generateWeeklyReport, generateMonthlyReport, generateCustomReport, generateDetailedDesignerReport } = useReportStore();
  const { tasks } = useTaskStore();
  const { allUsers } = useAuthStore();
  const { spaces } = useSpaceStore();

  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Designer report state
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [reportRange, setReportRange] = useState<'7' | '30' | '90' | 'custom'>('30');
  const [designerCustomStart, setDesignerCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [designerCustomEnd, setDesignerCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [detailedReport, setDetailedReport] = useState<DetailedDesignerReport | null>(null);
  const [showDetailedReport, setShowDetailedReport] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const designers = useMemo(
    () => allUsers.filter((u) => u.role === 'designer' || u.role === 'super_admin'),
    [allUsers],
  );

  // Generate team report
  const report: Report = useMemo(() => {
    if (period === 'custom') {
      return generateCustomReport(new Date(customStart), new Date(customEnd));
    }
    return period === 'weekly' ? generateWeeklyReport() : generateMonthlyReport();
  }, [period, customStart, customEnd, generateWeeklyReport, generateMonthlyReport, generateCustomReport]);

  // Task status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: statusLabel(status),
      value: count,
      color: STATUS_COLORS[status] || '#94a3b8',
    }));
  }, [tasks]);

  const performanceData = report.designerBreakdown.map((d) => ({
    name: d.designerName.split(' ')[0],
    completed: d.tasksCompleted,
    active: d.activeTasksCount,
    hours: Math.round(d.totalTimeSpent / 3600),
  }));

  const overviewCards = [
    { icon: CheckCircle2, label: 'Total Completed', value: report.totalTasksCompleted, color: 'text-success', bg: 'bg-success/10' },
    { icon: Clock, label: 'Total Time Spent', value: formatTime(report.totalTimeSpent), color: 'text-secondary', bg: 'bg-secondary/10' },
    { icon: Timer, label: 'Avg Task Time', value: formatTime(report.avgTaskTime), color: 'text-primary', bg: 'bg-primary-light' },
    { icon: RotateCcw, label: 'Revision Rate', value: `${Math.round(report.overallRevisionRate * 100)}%`, color: 'text-warning', bg: 'bg-warning/10' },
    { icon: TrendingUp, label: 'On-Time Rate', value: `${Math.round(report.overallOnTimeRate * 100)}%`, color: 'text-success', bg: 'bg-success/10' },
  ];

  const handleGenerateDesignerReport = () => {
    if (!selectedDesignerId) return;
    let start: Date, end: Date;
    if (reportRange === 'custom') {
      start = new Date(designerCustomStart);
      end = new Date(designerCustomEnd);
    } else {
      end = new Date();
      start = subDays(end, parseInt(reportRange));
    }
    const report = generateDetailedDesignerReport(selectedDesignerId, start, end);
    setDetailedReport(report);
    setShowDetailedReport(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Reports & Analytics</h1>
            <p className="text-sm text-text-secondary">
              {formatDate(report.startDate)} - {formatDate(report.endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-secondary p-0.5">
            {(['weekly', 'monthly', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {p === 'custom' ? 'Custom' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom date range picker */}
      {period === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-3 rounded-xl border border-border bg-white p-4"
        >
          <Calendar className="h-4 w-4 text-text-secondary" />
          <label className="text-sm text-text-secondary">From:</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <label className="text-sm text-text-secondary">To:</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </motion.div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {overviewCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-white p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-text-primary">{card.value}</p>
              <p className="text-xs text-text-secondary mt-0.5">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Team Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-white p-5 lg:col-span-3"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Team Performance</h2>
          {performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={performanceData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="completed" name="Completed" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="active" name="Active" fill="#ede9fe" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="hours" name="Hours" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-text-tertiary">
              No data available for this period.
            </div>
          )}
        </motion.div>

        {/* Status Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-border bg-white p-5 lg:col-span-2"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Status Distribution</h2>
          {statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                <Legend
                  formatter={(value) => <span className="text-xs text-text-secondary">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-text-tertiary">No data.</div>
          )}
        </motion.div>
      </div>

      {/* Designer Breakdown Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-border bg-white overflow-hidden"
      >
        <div className="border-b border-border-light px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Designer Breakdown</h2>
          <p className="text-xs text-text-tertiary">Click a row to view detailed report</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-surface-secondary">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary">Designer</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Completed</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Time Spent</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Avg Time</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Revision Rate</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">On-Time</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary">Active</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary"></th>
              </tr>
            </thead>
            <tbody>
              {report.designerBreakdown.map((dr) => {
                const user = allUsers.find((u) => u.id === dr.designerId);
                return (
                  <tr
                    key={dr.designerId}
                    onClick={() => {
                      setSelectedDesignerId(dr.designerId);
                      handleQuickReport(dr.designerId);
                    }}
                    className="border-b border-border-light cursor-pointer hover:bg-surface-secondary transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={dr.designerName} size="sm" status={user?.status} />
                        <div>
                          <span className="font-medium text-text-primary">{dr.designerName}</span>
                          {user && <p className="text-[10px] text-text-tertiary">{user.skills.slice(0, 2).join(', ')}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary font-medium">{dr.tasksCompleted}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{formatTime(dr.totalTimeSpent)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{formatTime(dr.avgTaskTime)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={dr.revisionRate > 0.5 ? 'warning' : 'success'}>
                        {Math.round(dr.revisionRate * 100)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={dr.onTimeRate >= 0.8 ? 'success' : 'warning'}>
                        {Math.round(dr.onTimeRate * 100)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">{dr.activeTasksCount}</td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-text-tertiary" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Generate Designer Report Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl border border-border bg-white p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Generate Designer Report</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-52">
            <Select
              label="Select Designer"
              value={selectedDesignerId}
              onChange={(e) => setSelectedDesignerId(e.target.value)}
              options={[
                { value: '', label: 'Choose a designer...' },
                ...designers.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>
          <div className="w-36">
            <Select
              label="Period"
              value={reportRange}
              onChange={(e) => setReportRange(e.target.value as '7' | '30' | '90' | 'custom')}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />
          </div>
          {reportRange === 'custom' && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">From</label>
                <input
                  type="date"
                  value={designerCustomStart}
                  onChange={(e) => setDesignerCustomStart(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">To</label>
                <input
                  type="date"
                  value={designerCustomEnd}
                  onChange={(e) => setDesignerCustomEnd(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </>
          )}
          <Button
            onClick={handleGenerateDesignerReport}
            disabled={!selectedDesignerId}
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </motion.div>

      {/* ================================================================= */}
      {/* DETAILED DESIGNER REPORT (full-page structured view)              */}
      {/* ================================================================= */}
      {showDetailedReport && detailedReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          ref={reportRef}
          className="space-y-6"
          id="printable-report"
        >
          {/* Report Header */}
          <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary-light/50 to-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar name={detailedReport.designerName} size="lg" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{detailedReport.designerName}</h2>
                  <p className="text-sm text-text-secondary">{detailedReport.department} Department</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {detailedReport.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ScoreRing score={detailedReport.performanceScore} />
                <div className="text-right">
                  <p className="text-xs text-text-tertiary">Performance</p>
                  <p className="text-xs text-text-tertiary">Score</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-text-tertiary">
                Report Period: {reportRange === 'custom'
                  ? `${formatDate(designerCustomStart)} - ${formatDate(designerCustomEnd)}`
                  : `Last ${reportRange} days`
                } | Generated: {format(new Date(), 'MMM d, yyyy h:mm a')}
              </p>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailedReport(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: CheckCircle2, label: 'Tasks Completed', value: detailedReport.tasksCompleted, color: 'bg-success/10', iconColor: 'text-success' },
              { icon: Clock, label: 'Total Hours Logged', value: `${Math.round(detailedReport.totalTimeSpent / 3600)}h`, color: 'bg-secondary/10', iconColor: 'text-secondary' },
              { icon: Timer, label: 'Avg Time / Task', value: formatTime(detailedReport.avgTaskTime), color: 'bg-primary-light', iconColor: 'text-primary' },
              { icon: Target, label: 'On-Time Delivery', value: `${Math.round(detailedReport.onTimeRate * 100)}%`, color: 'bg-success/10', iconColor: 'text-success' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl border border-border bg-white p-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color} mb-2`}>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                  <p className="text-xs text-text-secondary">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Performance Analysis + Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Comparison */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-text-primary">Performance vs Team Average</h3>
              </div>
              <div className="space-y-4">
                <MetricBar
                  label="On-Time Rate"
                  value={Math.round(detailedReport.onTimeRate * 100)}
                  max={100}
                  color="#10b981"
                  suffix="%"
                />
                <div className="text-[10px] text-text-tertiary -mt-2 text-right">
                  Team avg: {Math.round(detailedReport.teamAvgOnTimeRate * 100)}%
                </div>
                <MetricBar
                  label="Revision Rate (lower is better)"
                  value={Math.round(detailedReport.revisionRate * 100)}
                  max={100}
                  color={detailedReport.revisionRate > 0.5 ? '#ef4444' : '#f59e0b'}
                  suffix="%"
                />
                <div className="text-[10px] text-text-tertiary -mt-2 text-right">
                  Team avg: {Math.round(detailedReport.teamAvgRevisionRate * 100)}%
                </div>
                <MetricBar
                  label="Avg Task Time"
                  value={Math.round(detailedReport.avgTaskTime / 60)}
                  max={Math.max(Math.round(detailedReport.teamAvgTaskTime / 60), Math.round(detailedReport.avgTaskTime / 60)) * 1.5}
                  color="#7c3aed"
                  suffix=" min"
                />
                <div className="text-[10px] text-text-tertiary -mt-2 text-right">
                  Team avg: {Math.round(detailedReport.teamAvgTaskTime / 60)} min
                </div>
                <MetricBar
                  label="Active Tasks"
                  value={detailedReport.activeTasksCount}
                  max={10}
                  color="#06b6d4"
                />
              </div>
            </div>

            {/* Charts Column */}
            <div className="space-y-6">
              {/* Time by Space Pie */}
              {detailedReport.timeBySpace.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Time Distribution by Space</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={detailedReport.timeBySpace.map((s) => ({ name: s.spaceName, value: s.hours }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        paddingAngle={3}
                        label={({ name, value }) => `${name}: ${value}h`}
                      >
                        {detailedReport.timeBySpace.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Weekly Breakdown Bar */}
              {detailedReport.weeklyBreakdown.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Weekly Breakdown</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={detailedReport.weeklyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="completed" name="Completed" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Task Breakdown Table */}
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="border-b border-border-light px-5 py-3">
              <h3 className="text-sm font-semibold text-text-primary">
                Task Breakdown ({detailedReport.taskDetails.length} tasks)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-secondary">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Task</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Space</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Priority</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Time Spent</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Timeline</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Revisions</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedReport.taskDetails.map((task) => (
                    <tr
                      key={task.taskId}
                      className={`border-b border-border-light ${
                        task.status === 'completed'
                          ? 'bg-success/5'
                          : task.isOverdue
                            ? 'bg-error/5'
                            : task.status === 'in-progress'
                              ? 'bg-warning/5'
                              : ''
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{task.taskTitle}</span>
                          {task.isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-error" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">{task.spaceName}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={statusBadge(task.status)}>{statusLabel(task.status)}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={priorityBadge(task.priority)}>{task.priority}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-text-primary">
                        {formatTime(task.timeSpent)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-text-secondary">
                        {task.startDate && task.endDate
                          ? `${formatDate(task.startDate)} - ${formatDate(task.endDate)}`
                          : 'Not set'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {task.revisionCount > 0 ? (
                          <Badge variant={task.revisionCount > 2 ? 'error' : 'warning'}>
                            {task.revisionCount} rev
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-tertiary">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          {detailedReport.recentActivity.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Recent Activity</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detailedReport.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-primary">
                        <span className="font-medium">{activity.action}</span> on <span className="font-medium">{activity.taskTitle}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-text-tertiary">{formatDate(activity.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="rounded-xl border border-border bg-surface-secondary p-4 text-center">
            <p className="text-xs text-text-tertiary">
              Report generated by <span className="font-medium text-primary">DesignOps</span> on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );

  // Quick report when clicking a designer row
  function handleQuickReport(designerId: string) {
    const days = period === 'monthly' ? 30 : period === 'custom' ? 0 : 7;
    const end = period === 'custom' ? new Date(customEnd) : new Date();
    const start = period === 'custom' ? new Date(customStart) : subDays(end, days || 7);
    const report = generateDetailedDesignerReport(designerId, start, end);
    setDetailedReport(report);
    setShowDetailedReport(true);
  }
}
