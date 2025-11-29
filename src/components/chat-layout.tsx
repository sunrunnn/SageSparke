'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ConversationSidebar } from './conversation-sidebar';
import { UserNav } from './user-nav';
import { ChatView } from './chat-view';
import { useState, useEffect } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { generateResponse, getConversationTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

// A simple in-memory store for conversations for guest users.
// Logged-in user conversations will be fetched from the backend.
const guestConversationStore: { [key: string]: Conversation } = {};

export function ChatLayout({ initialConversations, user }: { initialConversations: Conversation[], user: { username: string } | null }) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If there are initial conversations, set the first one as active.
    // Otherwise, create a new one.
    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    } else {
      handleNewConversation();
    }
  }, [conversations]);


  const handleNewConversation = async () => {
    setIsLoading(true);
    const newId = nanoid();
    const newConversation: Conversation = {
      id: newId,
      userId: user?.username || 'guest',
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };

    if (user) {
        // TODO: API call to create conversation in the backend
    } else {
        guestConversationStore[newId] = newConversation;
    }
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setIsLoading(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Optimistically update UI
    setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, userMessage] }
                : c
        )
    );

    const currentConversation = conversations.find(c => c.id === activeConversationId);
    
    // Generate title for first message
    if (currentConversation && currentConversation.messages.length === 1) {
        const newTitle = await getConversationTitle(content);
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: newTitle } : c));
        // TODO: API call to update title
    }

    const loadingMessageId = nanoid();
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: new Date(),
    };

    setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, loadingMessage] }
                : c
        )
    );

    try {
      const aiResponse = await generateResponse(content);
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      setConversations(prev =>
          prev.map(c =>
              c.id === activeConversationId
                  ? { ...c, messages: c.messages.filter(m => m.id !== loadingMessageId).concat(assistantMessage) }
                  : c
          )
      );

      // TODO: API call to save messages
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get response from AI.',
      });
      setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: c.messages.filter(m => m.id !== loadingMessageId) }
                : c
        )
      );
    }
  };
  
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    // Find conversation and message index
    const conversationIndex = conversations.findIndex(c => c.id === activeConversationId);
    if (conversationIndex === -1) return;

    const messageIndex = conversations[conversationIndex].messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Create a new history up to the edited message
    const newMessages = conversations[conversationIndex].messages.slice(0, messageIndex);
    const updatedMessage = { ...conversations[conversationIndex].messages[messageIndex], content: newContent, timestamp: new Date() };
    newMessages.push(updatedMessage);

    // Optimistically update the conversation
    setConversations(prev => {
        const newConversations = [...prev];
        newConversations[conversationIndex] = { ...newConversations[conversationIndex], messages: newMessages };
        return newConversations;
    });
    
    // Regenerate response from the new content, which will handle the rest
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
        userNav={<UserNav user={user} />}
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
