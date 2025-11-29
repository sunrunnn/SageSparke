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

async function fetchConversations(): Promise<Conversation[]> {
    try {
        const response = await fetch(`/api/conversations`);
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
        const fetchedConversations = await fetchConversations();
        setConversations(fetchedConversations);
        if (fetchedConversations.length > 0) {
          setActiveConversationId(fetchedConversations[0].id);
        }
      } else {
        // Handle guest user
        const guestConvos = Object.values(guestConversationStore);
        setConversations(guestConvos);
        if (guestConvos.length > 0) {
            setActiveConversationId(guestConvos[0].id);
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
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: newConversation }),
            });
            if (!response.ok) throw new Error('Failed to save conversation');
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

  const handleSendMessage = async (prompt: string, conversationId?: string) => {
    const activeId = conversationId || activeConversationId;
    let conversationToUpdate = conversations.find(c => c.id === activeId);

    // If there is no active conversation, create a new one first.
    if (!conversationToUpdate) {
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
                return;
            }
        } else {
            guestConversationStore[newId] = newConversation;
        }
        
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newId);
        conversationToUpdate = newConversation;
    }
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    // Optimistically update UI
    const updatedMessages = [...(conversationToUpdate.messages || []), userMessage];
    let updatedConversation = {...conversationToUpdate, messages: updatedMessages};

    const finalConversationId = conversationToUpdate.id;
    setConversations(prev =>
        prev.map(c =>
            c.id === finalConversationId
                ? updatedConversation
                : c
        )
    );
    
    // Generate title for first message
    if (conversationToUpdate.messages.length === 0) {
        const newTitle = await getConversationTitle(prompt);
        updatedConversation = {...updatedConversation, title: newTitle};

        setConversations(prev => prev.map(c => c.id === finalConversationId ? updatedConversation : c));
        
        if (user) {
            try {
                await fetch(`/api/conversations/${finalConversationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle }),
                });
            } catch (error) {
                console.error("Failed to update title", error);
            }
        } else {
            guestConversationStore[finalConversationId].title = newTitle;
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
            c.id === finalConversationId
                ? { ...c, messages: [...c.messages, loadingMessage] }
                : c
        )
    );

    try {
      const aiResponse = await generateResponse(prompt);
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      
      updatedConversation = { ...updatedConversation, messages: finalMessages };

      setConversations(prev =>
          prev.map(c =>
              c.id === finalConversationId
                  ? updatedConversation
                  : c
          )
      );

      if (user) {
        try {
             await fetch(`/api/conversations/${finalConversationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: finalMessages }),
            });
        } catch (error) {
             console.error("Failed to save messages", error);
             toast({ variant: 'destructive', title: 'Sync Error', description: 'Could not save conversation to the server.'})
        }
      } else {
          guestConversationStore[finalConversationId].messages = finalMessages;
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get response from AI.',
      });
      setConversations(prev =>
        prev.map(c =>
            c.id === finalConversationId
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
    
    const originalConversation = conversations[conversationIndex];
    const messageIndex = originalConversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Create a new history up to the edited message
    const newMessages = originalConversation.messages.slice(0, messageIndex);
    const updatedMessage = { ...originalConversation.messages[messageIndex], content: newContent, timestamp: new Date() };
    newMessages.push(updatedMessage);

    // Optimistically update the conversation
    const updatedConversation = { ...originalConversation, messages: newMessages };

    setConversations(prev => {
        const newConversations = [...prev];
        newConversations[conversationIndex] = updatedConversation;
        return newConversations;
    });

    await handleSendMessage(newContent, activeConversationId);
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
          isLoading={isLoading && !user}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
