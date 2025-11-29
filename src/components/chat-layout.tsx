"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import type { Conversation, Message, User } from "@/lib/types";
import { generateResponse } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";
import { ChatView } from "./chat-view";
import { ConversationSidebar } from "./conversation-sidebar";
import { getConversationTitle } from "@/app/actions";
import { UserNav } from "./user-nav";

// In-memory store for guest conversations
const guestConversationStore: Record<string, Conversation> = {};

async function fetchUserConversations(): Promise<Conversation[]> {
  try {
    const response = await fetch(`/api/conversations`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch conversations");
    }
    const conversations = await response.json();
    return conversations.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function ChatLayout({ user }: { user: User | null }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isNewChatLoading, setIsNewChatLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    if (user) {
      const userConversations = await fetchUserConversations();
      setConversations(userConversations);
      if (userConversations.length > 0) {
        setActiveConversationId(userConversations[0].id);
      }
    } else {
      const guestConversations = Object.values(guestConversationStore);
      setConversations(guestConversations);
      if (guestConversations.length > 0) {
        setActiveConversationId(guestConversations[0].id);
      }
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewConversation = async () => {
    setIsNewChatLoading(true);
    const newConversation: Conversation = {
      id: nanoid(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      userId: user?.id,
    };

    if (user) {
      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newConversation.id,
            title: newConversation.title,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to create new conversation"
          );
        }
        const createdConversation = await response.json();
        createdConversation.createdAt = new Date(createdConversation.createdAt);
        setConversations((prev) => [createdConversation, ...prev]);
        setActiveConversationId(createdConversation.id);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      }
    } else {
      guestConversationStore[newConversation.id] = newConversation;
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
    }
    setIsNewChatLoading(false);
  };

  const handleSendMessage = async (
    messageContent: string,
    imageUrl?: string
  ) => {
    let finalConversationId = activeConversationId;
    let currentConversation = conversations.find(
      (c) => c.id === finalConversationId
    );

    // If there is no active conversation, create a new one first.
    if (!currentConversation) {
      const newConvId = nanoid();
      const newConv: Conversation = {
        id: newConvId,
        title: "New Chat",
        messages: [],
        createdAt: new Date(),
        userId: user?.id,
      };

      if (user) {
        try {
          const response = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: newConv.id, title: newConv.title }),
          });
          if (!response.ok) throw new Error("Failed to create conversation");
          const createdConv = await response.json();
          createdConv.createdAt = new Date(createdConv.createdAt);
          setConversations((prev) => [createdConv, ...prev]);
          currentConversation = createdConv;
        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not start a new conversation.",
          });
          return;
        }
      } else {
        guestConversationStore[newConv.id] = newConv;
        setConversations((prev) => [newConv, ...prev]);
        currentConversation = newConv;
      }
      setActiveConversationId(newConv.id);
      finalConversationId = newConv.id;
    }


    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: messageContent,
      imageUrl: imageUrl,
      timestamp: new Date(),
    };

    const updatedMessagesForUI = [
      ...currentConversation.messages,
      userMessage,
    ];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === finalConversationId
          ? { ...c, messages: updatedMessagesForUI }
          : c
      )
    );

    const loadingMessage: Message = {
      id: nanoid(),
      role: "assistant",
      content: "",
      isLoading: true,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === finalConversationId
          ? { ...c, messages: [...updatedMessagesForUI, loadingMessage] }
          : c
      )
    );

    try {
      const aiResponseText = await generateResponse(updatedMessagesForUI);

      const aiMessage: Message = {
        id: loadingMessage.id, // Use the same ID as the loading message
        role: "assistant",
        content: aiResponseText,
        isLoading: false,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessagesForUI, aiMessage];

      setConversations((prev) =>
        prev.map((c) =>
          c.id === finalConversationId ? { ...c, messages: finalMessages } : c
        )
      );

      // Save to backend
      if (user) {
        try {
          await fetch(`/api/conversations/${finalConversationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: finalMessages }),
          });
        } catch (error) {
          console.error("Failed to save messages", error);
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Could not save conversation to the server.",
          });
        }
      } else {
        guestConversationStore[finalConversationId].messages = finalMessages;
      }

      // After the first proper exchange, generate a title
      const conversationForTitle = conversations.find(
        (c) => c.id === finalConversationId
      );
      if (
        conversationForTitle &&
        conversationForTitle.messages.length === 2 && // After user's first message and AI response
        conversationForTitle.title === "New Chat"
      ) {
        setTimeout(async () => {
          try {
            const title = await getConversationTitle(finalMessages);
            if (title) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === finalConversationId ? { ...c, title } : c
                )
              );
              if (user) {
                await fetch(`/api/conversations/${finalConversationId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title }),
                });
              } else {
                guestConversationStore[finalConversationId].title = title;
              }
            }
          } catch (error) {
            console.error("Failed to generate title", error);
          }
        }, 1000);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get response from AI.",
      });
      // Remove loading message on error
      setConversations((prev) =>
        prev.map((c) =>
          c.id === finalConversationId
            ? { ...c, messages: updatedMessagesForUI }
            : c
        )
      );
    }
  };

  const handleEditMessage = async (
    conversationId: string,
    messageId: string,
    newContent: string
  ) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const messageIndex = conversation.messages.findIndex(
      (m) => m.id === messageId
    );
    if (messageIndex === -1) return;

    // Create the history up to the edited message
    const history = conversation.messages.slice(0, messageIndex);
    const editedMessage = {
      ...conversation.messages[messageIndex],
      content: newContent,
    };

    const updatedMessagesForGeneration = [...history, editedMessage];
    
    const loadingMessage: Message = {
      id: nanoid(),
      role: "assistant",
      content: "",
      isLoading: true,
      timestamp: new Date(),
    };
    
    // Update the UI to show the edited message and a loading state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...updatedMessagesForGeneration, loadingMessage] }
          : c
      )
    );

    try {
      // Pass the correct full history to the AI
      const aiResponseText = await generateResponse(updatedMessagesForGeneration);
      const aiMessage: Message = {
        id: loadingMessage.id, // Replace loading message
        role: "assistant",
        content: aiResponseText,
        isLoading: false,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessagesForGeneration, aiMessage];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, messages: finalMessages } : c
        )
      );

      // Save to backend
      if (user) {
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: finalMessages }),
        });
      } else {
        guestConversationStore[conversationId].messages = finalMessages;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get response from AI.",
      });
      // On error, revert to the state before the AI call
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: updatedMessagesForGeneration } // Keep the user's edit, remove loading
            : c
        )
      );
    }
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel
        defaultSize={20}
        minSize={15}
        maxSize={25}
        className={cn("hidden md:block")}
      >
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={setActiveConversationId}
          onNewConversation={handleNewConversation}
          isLoading={isLoading}
          isNewChatLoading={isNewChatLoading}
          userNav={<UserNav user={user} />}
        />
      </ResizablePanel>
      <ResizableHandle withHandle className="hidden md:flex" />
      <ResizablePanel defaultSize={80}>
        <ChatView
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          isLoading={!activeConversation && isLoading}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
