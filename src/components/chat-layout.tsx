"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatView } from "./chat-view";
import { useState, useEffect, useCallback } from "react";
import type { Conversation, Message } from "@/lib/types";
import { generateResponse, getConversationTitle } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

const initialConversations: Conversation[] = [
  {
    id: "1",
    title: "Welcome to SageSpark!",
    createdAt: new Date(),
    messages: [
      {
        id: "1-1",
        role: "assistant",
        content: "Hello! I'm SageSpark. How can I help you today?",
      },
    ],
  },
];

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const { toast } = useToast();

  useEffect(() => {
    // In a real app, you'd fetch this from a DB.
    // We'll use local storage for persistence.
    const savedConversations = localStorage.getItem("sagespark_conversations");
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations).map((c: any) => ({...c, createdAt: new Date(c.createdAt)}));
      setConversations(parsed);
      if(parsed.length > 0) {
        const sorted = [...parsed].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActiveConversationId(sorted[0].id);
      }
    } else {
      setConversations(initialConversations);
      setActiveConversationId(initialConversations[0].id);
    }
  }, []);

  useEffect(() => {
    if(conversations.length > 0) {
        localStorage.setItem("sagespark_conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "New Chat",
      createdAt: new Date(),
      messages: [],
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const updateConversation = (
    id: string,
    updateFn: (conv: Conversation) => Conversation
  ) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? updateFn(conv) : conv))
    );
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      isLoading: true,
    }

    // Add user message and loading indicator
    updateConversation(activeConversationId, (conv) => ({
      ...conv,
      messages: [...conv.messages, userMessage, loadingMessage],
    }));

    // If it's a new chat, generate a title
    const activeConv = conversations.find(c => c.id === activeConversationId);
    if(activeConv && activeConv.messages.length === 0) {
      const newTitle = await getConversationTitle(content);
      updateConversation(activeConversationId, (conv) => ({
        ...conv,
        title: newTitle
      }));
    }

    try {
      const aiResponse = await generateResponse(content);
      const assistantMessage: Message = {
        id: loadingMessage.id,
        role: "assistant",
        content: aiResponse,
      };

      updateConversation(activeConversationId, (conv) => ({
        ...conv,
        messages: conv.messages.map(m => m.id === loadingMessage.id ? assistantMessage : m),
      }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get response from AI.",
      });
      // Remove loading message on error
      updateConversation(activeConversationId, (conv) => ({
        ...conv,
        messages: conv.messages.filter(m => m.id !== loadingMessage.id),
      }));
    }
  };
  
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;
    
    const messageIndex = activeConv.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Truncate conversation from the point of edit
    const newMessages = activeConv.messages.slice(0, messageIndex);
    
    // Update the edited message
    const updatedMessage = { ...activeConv.messages[messageIndex], content: newContent };
    newMessages.push(updatedMessage);

    updateConversation(activeConversationId, (conv) => ({
        ...conv,
        messages: newMessages
    }));

    // Regenerate response
    handleSendMessage(newContent);
  };

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <SidebarProvider>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={setActiveConversationId}
        onNewConversation={handleNewConversation}
      />
      <SidebarInset>
        <ChatView
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
