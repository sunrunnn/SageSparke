'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ConversationSidebar } from './conversation-sidebar';
import { UserNav } from './user-nav';
import { ChatView } from './chat-view';
import { useState, useEffect } from 'react';
import type { Conversation, Message, User } from '@/lib/types';
import { generateResponse, getConversationTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

// A simple in-memory store for conversations for guest users.
const guestConversationStore: { [key: string]: Conversation } = {};

async function fetchConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
    try {
        const response = await fetch(`/api/conversations?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }
        const conversations = await response.json();
        return conversations.map((c: any) => ({...c, createdAt: new Date(c.createdAt)}));
    } catch (error) {
        console.error(error);
        return [];
    }
}


export function ChatLayout({ user }: { user: User | null }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isNewChatLoading, setIsNewChatLoading] = useState(false);

  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      if (user) {
        const fetchedConversations = await fetchConversations(user.id);
        setConversations(fetchedConversations);
        if (fetchedConversations.length > 0) {
          setActiveConversationId(fetchedConversations[0].id);
        } else {
          handleNewConversation();
        }
      } else {
        // Handle guest user
        const guestConvos = Object.values(guestConversationStore);
        setConversations(guestConvos);
        if (guestConvos.length > 0) {
            setActiveConversationId(guestConvos[0].id);
        } else {
            handleNewConversation();
        }
      }
      setIsLoading(false);
    };
    loadConversations();
  }, [user]);


  const handleNewConversation = async () => {
    setIsNewChatLoading(true);
    const newId = nanoid();
    const newConversation: Conversation = {
      id: newId,
      userId: user?.id || 'guest',
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };

    if (user) {
        try {
            await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: newConversation }),
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create new conversation.'});
            setIsNewChatLoading(false);
            return;
        }
    } else {
        guestConversationStore[newId] = newConversation;
    }
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setIsNewChatLoading(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation) return;

    // Optimistically update UI
    setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, userMessage] }
                : c
        )
    );
    
    // Generate title for first message
    if (currentConversation.messages.length === 0) {
        const newTitle = await getConversationTitle(content);
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: newTitle } : c));
        if (user) {
            try {
                await fetch(`/api/conversations/${activeConversationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle }),
                });
            } catch (error) {
                console.error("Failed to update title", error);
            }
        }
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
      
      const finalMessages = [...currentConversation.messages, userMessage, assistantMessage];

      setConversations(prev =>
          prev.map(c =>
              c.id === activeConversationId
                  ? { ...c, messages: c.messages.filter(m => m.id !== loadingMessageId).concat(assistantMessage) }
                  : c
          )
      );

      if (user) {
        try {
             await fetch(`/api/conversations/${activeConversationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: finalMessages }),
            });
        } catch (error) {
             console.error("Failed to save messages", error);
        }
      }

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
    
    // Create a new temporary conversation object for regeneration
    const tempConversation = {
      ...conversations[conversationIndex],
      messages: newMessages,
    }

    // Call a modified send message that takes the conversation context
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
        isNewChatLoading={isNewChatLoading}
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
