'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  BarChart3,
  Users,
  ClipboardList,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

// ---------------------------------------------------------------------------
// Suggestion chips by role
// ---------------------------------------------------------------------------

const SUGGESTION_ICONS: Record<string, React.ElementType> = {
  tasks: ClipboardList,
  team: Users,
  workload: BarChart3,
  summary: MessageSquare,
};

interface Suggestion {
  text: string;
  icon: string;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  admin: [
    { text: 'How many creatives are pending?', icon: 'tasks' },
    { text: 'Who is available right now?', icon: 'team' },
    { text: 'Show team workload', icon: 'workload' },
    { text: 'Weekly summary', icon: 'summary' },
  ],
  super_admin: [
    { text: 'How many creatives are pending?', icon: 'tasks' },
    { text: 'Who is available right now?', icon: 'team' },
    { text: 'Show team workload', icon: 'workload' },
    { text: 'Weekly summary', icon: 'summary' },
  ],
  requester: [
    { text: "What's the status of my tasks?", icon: 'tasks' },
    { text: "Who's working on my requests?", icon: 'team' },
    { text: 'Any updates today?', icon: 'summary' },
  ],
  designer: [
    { text: 'What tasks are assigned to me?', icon: 'tasks' },
    { text: 'Show my timer status', icon: 'workload' },
    { text: 'Tasks due this week', icon: 'summary' },
  ],
};

// ---------------------------------------------------------------------------
// Markdown-like message renderer
// ---------------------------------------------------------------------------

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line === '') return <div key={i} className="h-1.5" />;

        // Inline formatting: **bold** and `code`
        const formatInline = (text: string) => {
          const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
          return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="font-semibold text-text-primary">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={j}
                  className="rounded bg-primary/8 px-1.5 py-0.5 text-[13px] font-mono text-primary"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            return <span key={j}>{part}</span>;
          });
        };

        // Numbered list
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {numberedMatch[1]}
              </span>
              <p className="text-[13.5px] leading-relaxed text-text-primary/90">
                {formatInline(numberedMatch[2])}
              </p>
            </div>
          );
        }

        // Bullet list
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
              <p className="text-[13.5px] leading-relaxed text-text-primary/90">
                {formatInline(line.slice(2))}
              </p>
            </div>
          );
        }

        return (
          <p key={i} className="text-[13.5px] leading-relaxed text-text-primary/90">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator with smooth dot animation
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-start gap-3 max-w-[768px] mx-auto w-full px-4"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm border border-border/50">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-[7px] w-[7px] rounded-full bg-primary/50"
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Auto-expanding textarea hook
// ---------------------------------------------------------------------------

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  return ref;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AIAssistantPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { messages, isTyping, sendMessage, clearMessages } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useAutoResize(input);

  const role: Role = currentUser?.role ?? 'requester';
  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.requester;
  const firstName = currentUser?.name?.split(' ')[0] ?? '';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    sendMessage(trimmed);
    setInput('');
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    if (isTyping) return;
    sendMessage(text);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-surface-secondary to-white">
      {/* ---- Header ---- */}
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 flex items-center justify-between border-b border-border/60 bg-white/80 backdrop-blur-xl px-6 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-sm">
            <Sparkles className="h-4.5 w-4.5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-available" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary tracking-tight">
              DesignOps AI
            </h1>
            <p className="text-[11px] text-text-tertiary">
              Always ready to help
            </p>
          </div>
        </div>

        {hasMessages && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearMessages}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:bg-error/8 hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </motion.button>
        )}
      </motion.header>

      {/* ---- Chat body ---- */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[768px] flex-col px-4 py-6">
            {/* ---- Welcome state ---- */}
            <AnimatePresence mode="wait">
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex flex-col items-center pt-16 pb-8"
                >
                  {/* Hero icon */}
                  <div className="relative mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-available border-[3px] border-white"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>

                  {/* Greeting */}
                  <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                    {firstName ? `Hi ${firstName}, how can I help?` : 'How can I help you today?'}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary max-w-md text-center leading-relaxed">
                    I can answer questions about your tasks, team availability, workload distribution, and more.
                  </p>

                  {/* Suggestion chips */}
                  <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => {
                      const IconComp = SUGGESTION_ICONS[s.icon] ?? MessageSquare;
                      return (
                        <motion.button
                          key={s.text}
                          whileHover={{ scale: 1.01, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSuggestion(s.text)}
                          disabled={isTyping}
                          className={cn(
                            'group flex items-center gap-3 rounded-xl border border-border/70 bg-white px-4 py-3.5 text-left',
                            'shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
                            <IconComp className="h-4 w-4" />
                          </div>
                          <span className="flex-1 text-[13px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                            {s.text}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-text-tertiary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- Messages ---- */}
            {hasMessages && (
              <div className="flex flex-col gap-5">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className={cn(
                          'flex items-start gap-3',
                          isUser ? 'flex-row-reverse' : 'flex-row',
                        )}
                      >
                        {/* Avatar */}
                        {isUser ? (
                          currentUser ? (
                            <Avatar name={currentUser.name} size="sm" className="mt-0.5" />
                          ) : (
                            <div className="mt-0.5 h-7 w-7 rounded-full bg-primary" />
                          )
                        ) : (
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-3',
                            isUser
                              ? 'rounded-tr-sm bg-primary text-white shadow-sm shadow-primary/20'
                              : 'rounded-tl-sm bg-white text-text-primary border border-border/50 shadow-sm',
                          )}
                        >
                          {isUser ? (
                            <p className="text-[13.5px] leading-relaxed">{msg.content}</p>
                          ) : (
                            <MessageContent content={msg.content} />
                          )}
                          <p
                            className={cn(
                              'mt-2 text-[10px] tabular-nums',
                              isUser ? 'text-white/50 text-right' : 'text-text-tertiary/70',
                            )}
                          >
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <div className="pb-3">
              <TypingIndicator />
            </div>
          )}
        </AnimatePresence>

        {/* ---- Input area ---- */}
        <div className="border-t border-border/40 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[768px] px-4 py-3">
            <div
              className={cn(
                'flex items-end gap-2 rounded-2xl border bg-white px-4 py-2.5 transition-all duration-200',
                'shadow-sm',
                'focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/5',
                !input.trim() ? 'border-border/60' : 'border-primary/30',
              )}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder="Ask anything about your team or tasks..."
                rows={1}
                className={cn(
                  'flex-1 resize-none bg-transparent text-[13.5px] text-text-primary outline-none',
                  'placeholder:text-text-tertiary leading-relaxed',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'max-h-[200px]',
                )}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                  input.trim() && !isTyping
                    ? 'bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-dark'
                    : 'bg-surface-tertiary text-text-tertiary',
                  'disabled:cursor-not-allowed',
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </motion.button>
            </div>
            <p className="mt-2 text-center text-[10.5px] text-text-tertiary/60">
              AI responses are generated from your workspace data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
