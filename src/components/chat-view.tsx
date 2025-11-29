'use client';

import type { Conversation } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { ChatMessage } from './chat-message';
import { Button } from './ui/button';
import { Paperclip, SendHorizonal, X } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useState, useRef, useEffect } from 'react';
import { Logo } from './logo';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';

interface ChatViewProps {
  conversation: Conversation | null;
  onSendMessage: (content: string, imageUrl?: string) => Promise<void>;
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageUrl) return;
    const currentInput = input.trim();
    const currentImageUrl = imageUrl;
    
    setInput('');
    setImageUrl(null);
    
    await onSendMessage(currentInput, currentImageUrl || undefined);
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
        {imageUrl && (
          <div className="relative mb-2 w-24 h-24 rounded-md overflow-hidden border">
            <Image src={imageUrl} alt="Upload preview" layout="fill" objectFit="cover" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6 bg-black/50 hover:bg-black/75 text-white"
              onClick={() => setImageUrl(null)}
            >
              <X size={14}/>
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="relative">
             <Textarea
              placeholder="Type your message here or upload an image..."
              className="pr-24 text-base resize-none border-0 shadow-none focus-visible:ring-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                >
                    <Paperclip size={20} />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!input.trim() && !imageUrl) || isLoading}
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
