
'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ConversationSidebar } from './conversation-sidebar';
import { ChatView } from './chat-view';
import { useState, useEffect } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { generateResponse, getConversationTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc, writeBatch } from 'firebase/firestore';
import { ProfileMenu } from './profile-menu';

export function ChatLayout() {
  const { user } = useUser();
  const firestore = useFirestore();

  const conversationsQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, 'users', user.uid, 'conversations'), orderBy('createdAt', 'desc')) : null
  , [firestore, user]);

  const { data: conversations, isLoading: conversationsLoading } = useCollection<Omit<Conversation, 'messages'>>(conversationsQuery);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const messagesQuery = useMemoFirebase(() => 
    (user && activeConversationId) ? query(collection(firestore, 'users', user.uid, 'conversations', activeConversationId, 'messages'), orderBy('timestamp', 'asc')) : null
  , [firestore, user, activeConversationId]);
  
  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    if (!conversationsLoading && conversations && conversations.length > 0) {
      if (!activeConversationId || !conversations.some(c => c.id === activeConversationId)) {
        setActiveConversationId(conversations[0].id);
      }
    }
  }, [conversations, conversationsLoading, activeConversationId]);

  const handleNewConversation = async () => {
    if (!user) return;
    const newConversationRef = await addDoc(collection(firestore, 'users', user.uid, 'conversations'), {
      title: 'New Chat',
      createdAt: serverTimestamp(),
      userId: user.uid,
    });
    setActiveConversationId(newConversationRef.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || !user) return;

    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      role: 'user',
      content,
    };

    const messagesCol = collection(firestore, 'users', user.uid, 'conversations', activeConversationId, 'messages');
    
    await addDoc(messagesCol, {
      ...userMessage,
      timestamp: serverTimestamp(),
    });

    const activeConv = conversations?.find(c => c.id === activeConversationId);
    if(activeConv && messages?.length === 0) {
        const newTitle = await getConversationTitle(content);
        await setDoc(doc(firestore, 'users', user.uid, 'conversations', activeConversationId), { title: newTitle }, { merge: true });
    }

    // Add a temporary loading message locally
    const loadingMessageId = 'loading-' + Date.now();
    const tempMessages = [...(messages || []), { id: 'temp-user', role: 'user', content, timestamp: serverTimestamp() as any}, { id: loadingMessageId, role: 'assistant', content: '', isLoading: true, timestamp: serverTimestamp() as any }];

    try {
      const aiResponse = await generateResponse(content);
      const assistantMessage: Omit<Message, 'id' | 'timestamp'> = {
        role: 'assistant',
        content: aiResponse,
      };
      await addDoc(messagesCol, {
        ...assistantMessage,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get response from AI.',
      });
    }
  };
  
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId || !user) return;

    const activeConv = conversations?.find(c => c.id === activeConversationId);
    if (!activeConv || !messages) return;
    
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const batch = writeBatch(firestore);

    // Delete all messages after the edited one
    for (let i = messageIndex + 1; i < messages.length; i++) {
        const msgDocRef = doc(firestore, 'users', user.uid, 'conversations', activeConversationId, 'messages', messages[i].id);
        batch.delete(msgDocRef);
    }
    
    // Update the edited message
    const editedMsgRef = doc(firestore, 'users', user.uid, 'conversations', activeConversationId, 'messages', messageId);
    batch.update(editedMsgRef, { content: newContent, timestamp: serverTimestamp() });

    await batch.commit();

    // Regenerate response
    await handleSendMessage(newContent);
  };

  const activeConversation = conversations?.find((c) => c.id === activeConversationId) || null;
  const fullActiveConversation = activeConversation ? {
    ...activeConversation,
    messages: messages || []
  } : null;

  return (
    <SidebarProvider>
      <ConversationSidebar
        conversations={conversations || []}
        activeConversationId={activeConversationId}
        onConversationSelect={setActiveConversationId}
        onNewConversation={handleNewConversation}
        isLoading={conversationsLoading}
      />
      <SidebarInset>
        <div className="absolute top-2 right-2 z-10">
          <ProfileMenu />
        </div>
        <ChatView
          conversation={fullActiveConversation}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          isLoading={messagesLoading}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
