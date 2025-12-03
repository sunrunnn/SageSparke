'use client';

import type { Conversation } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { ChatMessage } from './chat-message';
import { Button } from './ui/button';
import { SendHorizonal, Plus } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useState, useRef, useEffect } from 'react';
import { Logo } from './logo';
import { Skeleton } from './ui/skeleton';

interface ChatViewProps {
  conversation: Conversation | undefined;
  onSendMessage: (content: string) => Promise<void>;
  onEditMessage: (conversationId: string, messageId: string, newContent: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
}

export function ChatView({
  conversation,
  onSendMessage,
  onEditMessage,
  onNewConversation,
  isLoading
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const currentInput = input.trim();
    
    setInput('');
    
    await onSendMessage(currentInput);
    setIsSending(false);
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [conversation?.messages, isLoading, isSending]);

  const renderContent = () => {
    if (isLoading && !conversation) {
      return (
        <div className="p-4 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }
    
    const messages = conversation?.messages || [];

    if (messages.length > 0) {
      const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf('user');
      return (
        <div className="p-4">
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLastUserMessage={msg.role === 'user' && index === lastUserMessageIndex}
              onEdit={(messageId, newContent) => onEditMessage(conversation!.id, messageId, newContent)}
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
        <Button onClick={onNewConversation} variant="ghost" className="mt-4">
          <Plus className="mr-2 h-4 w-4" /> New Chat
        </Button>
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
              className="pr-14 text-base resize-none border-0 shadow-none focus-visible:ring-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
              disabled={isSending || conversation?.messages.some(m => m.isLoading) || isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isSending || conversation?.messages.some(m => m.isLoading) || isLoading}
                >
                  <SendHorizonal size={20} />
                </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
