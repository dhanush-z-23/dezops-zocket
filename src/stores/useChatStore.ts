import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/types';
import { generateId } from '@/lib/utils';
import { useTaskStore } from './useTaskStore';
import { useAuthStore } from './useAuthStore';
import { useSpaceStore } from './useSpaceStore';

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;

  sendMessage: (content: string) => void;
  clearMessages: () => void;
}

function generateAIResponse(content: string): string {
  const lowerContent = content.toLowerCase();
  const tasks = useTaskStore.getState().tasks;
  const users = useAuthStore.getState().allUsers;
  const spaces = useSpaceStore.getState().spaces;

  // Pending / active tasks
  if (
    lowerContent.includes('pending') ||
    lowerContent.includes('how many tasks') ||
    lowerContent.includes('active tasks')
  ) {
    const activeTasks = tasks.filter(
      (t) => !['completed', 'approved'].includes(t.status),
    );
    const byStatus: Record<string, number> = {};
    activeTasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });
    const breakdown = Object.entries(byStatus)
      .map(([s, c]) => `${s}: ${c}`)
      .join(', ');
    return `There are currently **${activeTasks.length} active tasks** across all spaces.\n\nBreakdown: ${breakdown}.`;
  }

  // Who worked on X
  if (lowerContent.includes('who worked on') || lowerContent.includes('who is working on')) {
    const keyword = content
      .replace(/who (worked on|is working on)/i, '')
      .trim()
      .replace(/[?"']/g, '');
    const matching = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(keyword.toLowerCase()) ||
        t.description.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (matching.length === 0) {
      return `I couldn't find any tasks matching "${keyword}".`;
    }
    const lines = matching.map((t) => {
      const assignee = users.find((u) => u.id === t.assigneeId);
      return `- **${t.title}** — ${assignee ? assignee.name : 'Unassigned'} (${t.status})`;
    });
    return `Here are the tasks matching "${keyword}":\n\n${lines.join('\n')}`;
  }

  // Designer availability
  if (
    lowerContent.includes('available') ||
    lowerContent.includes('availability') ||
    lowerContent.includes('who is free') ||
    lowerContent.includes("who's free")
  ) {
    const designers = users.filter((u) => u.role === 'designer');
    const lines = designers.map((d) => {
      const activeTasks = tasks.filter(
        (t) =>
          t.assigneeId === d.id &&
          !['completed', 'approved'].includes(t.status),
      ).length;
      return `- **${d.name}** — ${d.status} (${activeTasks} active task${activeTasks !== 1 ? 's' : ''}, ${d.weeklyCapacityHours}h/week capacity)`;
    });
    return `Here's the designer availability:\n\n${lines.join('\n')}`;
  }

  // Task stats / summary / report
  if (
    lowerContent.includes('stats') ||
    lowerContent.includes('summary') ||
    lowerContent.includes('report') ||
    lowerContent.includes('overview')
  ) {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const totalTime = tasks.reduce((acc, t) => acc + t.totalTimeSpent, 0);
    const hours = Math.round(totalTime / 3600);
    const withRevisions = tasks.filter((t) => t.revisions.length > 0).length;
    return `Here's a quick overview:\n\n- **Total tasks:** ${tasks.length}\n- **Completed:** ${completed}\n- **In progress:** ${inProgress}\n- **Total time tracked:** ${hours} hours\n- **Tasks with revisions:** ${withRevisions}\n- **Spaces:** ${spaces.length} (${spaces.map((s) => s.name).join(', ')})`;
  }

  // Urgent / priority
  if (lowerContent.includes('urgent') || lowerContent.includes('priority')) {
    const urgent = tasks.filter(
      (t) => t.priority === 'urgent' && t.status !== 'completed',
    );
    const high = tasks.filter(
      (t) => t.priority === 'high' && t.status !== 'completed',
    );
    if (urgent.length === 0 && high.length === 0) {
      return 'Great news — there are no urgent or high-priority open tasks right now!';
    }
    const lines = [...urgent, ...high].map(
      (t) =>
        `- **[${t.priority.toUpperCase()}]** ${t.title} — ${t.status}`,
    );
    return `Here are the high-priority open tasks:\n\n${lines.join('\n')}`;
  }

  // Space info
  if (lowerContent.includes('space') || lowerContent.includes('team')) {
    const lines = spaces.map((s) => {
      const taskCount = tasks.filter((t) => t.spaceId === s.id).length;
      return `- **${s.name}** — ${s.members.length} members, ${taskCount} tasks`;
    });
    return `Here are your spaces:\n\n${lines.join('\n')}`;
  }

  // Fallback
  return `I can help you with:\n\n- **Pending tasks** — "How many pending tasks?"\n- **Who worked on something** — "Who worked on banners?"\n- **Designer availability** — "Who is free?"\n- **Task stats** — "Give me a summary"\n- **Priority tasks** — "What's urgent?"\n- **Spaces** — "Tell me about our spaces"\n\nFeel free to ask!`;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isTyping: false,

      sendMessage: (content: string) => {
        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isTyping: true,
        }));

        // Simulate AI response delay
        setTimeout(() => {
          const aiResponse = generateAIResponse(content);
          const aiMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: aiResponse,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            messages: [...state.messages, aiMessage],
            isTyping: false,
          }));
        }, 800);
      },

      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    { name: 'designops-chat' },
  ),
);
