'use client';

import type { Conversation } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { ChatMessage } from './chat-message';
import { Button } from './ui/button';
import { SendHorizonal } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useState, useRef, useEffect } from 'react';
import { Logo } from './logo';
import { Skeleton } from './ui/skeleton';

interface ChatViewProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => Promise<void>;
  onEditMessage: (id: string, newContent: string) => void;
  isLoading: boolean;
}

export function ChatView({
  conversation,
  onSendMessage,
  onEditMessage,
  isLoading
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversation) return;
    setInput('');
    await onSendMessage(input.trim());
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [conversation?.messages, isLoading]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }

    if (conversation && conversation.messages.length > 0) {
      return (
        <div className="p-4">
          {conversation.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onEdit={onEditMessage}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Logo className="mb-4" />
        <h2 className="text-2xl font-semibold text-foreground">Welcome to SageSpark</h2>
        <p className="text-muted-foreground">Start a new conversation by typing your prompt below.</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full pt-10">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {renderContent()}
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              placeholder="Type your message here..."
              className="pr-16 text-base resize-none border-0 shadow-none focus-visible:ring-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
              disabled={!conversation || isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              disabled={!input.trim() || !conversation || isLoading}
            >
              <SendHorizonal size={20} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
