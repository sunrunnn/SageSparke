'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ConversationSidebar } from './conversation-sidebar';
import { UserNav } from './user-nav';
import { ChatView } from './chat-view';
import { useState, useEffect, useCallback } from 'react';
import type { Conversation, Message, User } from '@/lib/types';
import { generateResponse, getConversationTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

// A simple in-memory store for conversations for guest users.
const guestConversationStore: { [key: string]: Conversation } = {};

async function fetchUserConversations(): Promise<Conversation[]> {
    try {
        const response = await fetch(`/api/conversations`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch conversations');
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
      let fetchedConversations: Conversation[] = [];
      if (user) {
        fetchedConversations = await fetchUserConversations();
      } else {
        // For guest users, load from in-memory store
        fetchedConversations = Object.values(guestConversationStore).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setConversations(fetchedConversations);
      
      if (fetchedConversations.length > 0) {
        setActiveConversationId(fetchedConversations[0].id);
      } else {
        setActiveConversationId(null);
      }
      setIsLoading(false);
    };
    loadConversations();
  }, [user]);


  const handleNewConversation = async () => {
    setIsNewChatLoading(true);
    
    if (user) {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat', messages: [] }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to create new conversation');
            }
            const newConversation: Conversation = await response.json();
            newConversation.createdAt = new Date(newConversation.createdAt);
            
            setConversations(prev => [newConversation, ...prev]);
            setActiveConversationId(newConversation.id);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create new conversation.'});
        }
    } else {
        // Guest user logic
        const newId = nanoid();
        const newConversation: Conversation = {
          id: newId,
          userId: 'guest',
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
        };
        guestConversationStore[newId] = newConversation;
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
    }
    
    setIsNewChatLoading(false);
  };
  
  const createNewConversation = useCallback(async (initialPrompt: string): Promise<Conversation | null> => {
    setIsNewChatLoading(true);
    let newConversation: Conversation | null = null;
    const initialTitle = await getConversationTitle(initialPrompt);

    if (user) {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: initialTitle, messages: [] }),
            });
            if (!response.ok) throw new Error('Failed to create new conversation.');
            const createdConv = await response.json();
            createdConv.createdAt = new Date(createdConv.createdAt);
            newConversation = createdConv;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create new conversation.'});
            setIsNewChatLoading(false);
            return null;
        }
    } else {
        const newId = nanoid();
        newConversation = {
          id: newId,
          userId: 'guest',
          title: initialTitle,
          messages: [],
          createdAt: new Date(),
        };
        guestConversationStore[newId] = newConversation;
    }

    if (newConversation) {
        setConversations(prev => [newConversation!, ...prev]);
        setActiveConversationId(newConversation!.id);
    }
    setIsNewChatLoading(false);
    return newConversation;
  }, [user, toast]);


  const handleSendMessage = async (prompt: string) => {
    let currentConversationId = activeConversationId;
    let conversation = conversations.find(c => c.id === currentConversationId);

    // If there's no active conversation, create one first.
    if (!conversation) {
      const newConversation = await createNewConversation(prompt);
      if (!newConversation) return; // Stop if conversation creation failed
      conversation = newConversation;
      currentConversationId = newConversation.id;
    }
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    // Optimistically update the UI with the user's message
    const updatedMessages = [...(conversation.messages || []), userMessage];
    let updatedConversation = { ...conversation, messages: updatedMessages };
    
    // Update title for the very first message
    if (conversation.messages.length === 0 && conversation.title === 'New Chat') {
      const newTitle = await getConversationTitle(prompt);
      updatedConversation.title = newTitle;
      if (user) {
         try {
            await fetch(`/api/conversations/${currentConversationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
            });
        } catch (error) {
            console.error("Failed to update title", error);
        }
      } else {
          guestConversationStore[currentConversationId!].title = newTitle;
      }
    }
    
    const finalConversationId = currentConversationId!;
    setConversations(prev => prev.map(c => c.id === finalConversationId ? updatedConversation : c));

    // Add a loading message
    const loadingMessage: Message = {
      id: nanoid(),
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: new Date(),
    };
    
    setConversations(prev => prev.map(c => c.id === finalConversationId ? { ...c, messages: [...c.messages, loadingMessage] } : c));
    
    // Generate AI response
    try {
      const aiResponse = await generateResponse(prompt);
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      // Replace loading message with the actual response
      const finalMessages = [...updatedMessages, assistantMessage];
      updatedConversation = { ...updatedConversation, messages: finalMessages };

      setConversations(prev => prev.map(c => c.id === finalConversationId ? updatedConversation : c));

      // Save to backend
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
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to get response from AI.'});
      // Remove loading message on error
      setConversations(prev => prev.map(c => c.id === finalConversationId ? { ...c, messages: updatedMessages } : c));
    }
  };
  
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    const conversationIndex = conversations.findIndex(c => c.id === activeConversationId);
    if (conversationIndex === -1) return;
    
    const originalConversation = conversations[conversationIndex];
    const messageIndex = originalConversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const newMessages = originalConversation.messages.slice(0, messageIndex);
    const updatedMessage = { ...originalConversation.messages[messageIndex], content: newContent, timestamp: new Date() };
    newMessages.push(updatedMessage);

    const updatedConversation = { ...originalConversation, messages: newMessages };

    setConversations(prev => {
        const newConversations = [...prev];
        newConversations[conversationIndex] = updatedConversation;
        return newConversations;
    });

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
          isLoading={isLoading && conversations.length === 0}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
