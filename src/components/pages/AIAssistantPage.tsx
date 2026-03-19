'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Trash2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

// ---------------------------------------------------------------------------
// Suggestion chips by role
// ---------------------------------------------------------------------------

const SUGGESTIONS: Record<string, string[]> = {
  admin: [
    'How many creatives are pending?',
    'Who is available right now?',
    'Show team workload',
    'Weekly summary',
  ],
  super_admin: [
    'How many creatives are pending?',
    'Who is available right now?',
    'Show team workload',
    'Weekly summary',
  ],
  requester: [
    "What's the status of my tasks?",
    "Who's working on my requests?",
    'Any updates today?',
  ],
  designer: [
    'What tasks are assigned to me?',
    'Show my timer status',
    'Tasks due this week',
  ],
};

// ---------------------------------------------------------------------------
// Render AI message content with basic markdown-like formatting
// ---------------------------------------------------------------------------

function MessageContent({ content }: { content: string }) {
  // Split on newlines and handle **bold**, numbered lists, bullet points
  const lines = content.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line === '') return <div key={i} className="h-1" />;

        // Parse **bold** inline
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={j}>{part}</span>;
        });

        // Bullet lines
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
              <p className="text-sm leading-relaxed">{rendered.slice(1)}</p>
            </div>
          );
        }

        return (
          <p key={i} className="text-sm leading-relaxed">
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-end gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-surface-tertiary px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-text-tertiary"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AIAssistantPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { messages, isTyping, sendMessage, clearMessages } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const role: Role = currentUser?.role ?? 'requester';
  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.requester;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    sendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    if (isTyping) return;
    sendMessage(text);
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between border-b border-border bg-white px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">AI Assistant</h1>
            <p className="text-xs text-text-tertiary">Powered by DesignOps AI</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          className="text-text-tertiary hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
          Clear chat
        </Button>
      </motion.div>

      {/* ── Chat area ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-secondary">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 py-6">

          {/* Suggestion chips */}
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mb-8 flex flex-col items-center gap-6"
              >
                {/* Welcome illustration */}
                <div className="flex flex-col items-center gap-3 pt-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light shadow-sm">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-text-primary">
                      Hello{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}!
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Ask me anything about your team, tasks, or workload.
                    </p>
                  </div>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      disabled={isTyping}
                      className={cn(
                        'rounded-full border border-border bg-white px-4 py-2 text-xs font-medium text-text-secondary',
                        'shadow-sm transition-all hover:border-primary/40 hover:bg-primary-light hover:text-primary',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn('flex items-end gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* Avatar */}
                    {isUser ? (
                      currentUser ? (
                        <Avatar name={currentUser.name} size="sm" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary" />
                      )
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-3',
                        isUser
                          ? 'rounded-br-sm bg-primary text-white'
                          : 'rounded-bl-sm bg-surface-tertiary text-text-primary',
                      )}
                    >
                      {isUser ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <MessageContent content={msg.content} />
                      )}
                      <p
                        className={cn(
                          'mt-1.5 text-[10px]',
                          isUser ? 'text-white/60 text-right' : 'text-text-tertiary',
                        )}
                      >
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Ask anything about your team or tasks…"
              className={cn(
                'flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                input.trim() && !isTyping
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-surface-tertiary text-text-tertiary',
                'disabled:cursor-not-allowed',
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
