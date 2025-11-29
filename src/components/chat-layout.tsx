'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ConversationSidebar } from './conversation-sidebar';
import { ChatView } from './chat-view';
import { useState, useEffect } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { generateResponse, getConversationTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

// A simple in-memory store for conversations.
// In a real app, you would use a database.
const conversationStore: { [key: string]: Conversation } = {};

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations from our "store" on initial render
  useEffect(() => {
    const loadedConversations = Object.values(conversationStore).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    setConversations(loadedConversations);
    if (loadedConversations.length > 0) {
      setActiveConversationId(loadedConversations[0].id);
    } else {
      // Create a new one if none exist
      handleNewConversation();
    }
    setIsLoading(false);
  }, []);

  const handleNewConversation = () => {
    const newId = nanoid();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    conversationStore[newId] = newConversation;
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Update local state immediately for optimistic UI
    const activeConv = conversationStore[activeConversationId];
    activeConv.messages.push(userMessage);

    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...activeConv } : c));

    // Handle title generation for the first message
    if (activeConv.messages.length === 1) {
      const newTitle = await getConversationTitle(content);
      activeConv.title = newTitle;
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...activeConv, title: newTitle } : c));
    }
    
    // Add a temporary loading message
    const loadingMessageId = nanoid();
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: new Date(),
    };
    activeConv.messages.push(loadingMessage);
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...activeConv } : c));

    try {
      const aiResponse = await generateResponse(content);
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      // Replace loading message with the actual response
      activeConv.messages = activeConv.messages.filter(m => m.id !== loadingMessageId);
      activeConv.messages.push(assistantMessage);
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...activeConv } : c));

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get response from AI.',
      });
      // Remove loading message on error
      activeConv.messages = activeConv.messages.filter(m => m.id !== loadingMessageId);
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...activeConv } : c));
    }
  };
  
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    const activeConv = conversationStore[activeConversationId];
    if (!activeConv) return;
    
    const messageIndex = activeConv.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Create a new history up to the edited message
    const newMessages = activeConv.messages.slice(0, messageIndex);
    
    // Update the edited message
    const updatedMessage = { ...activeConv.messages[messageIndex], content: newContent, timestamp: new Date() };
    newMessages.push(updatedMessage);
    
    activeConv.messages = newMessages;

    // Re-render with the truncated history
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...activeConv } : c));
    
    // Regenerate response from the new content
    await handleSendMessage(newContent);
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <SidebarProvider>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={setActiveConversationId}
        onNewConversation={handleNewConversation}
        isLoading={isLoading}
      />
      <SidebarInset>
        <ChatView
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          isLoading={isLoading && !activeConversation}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
