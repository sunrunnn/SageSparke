
"use client";

import type { Conversation } from "@/lib/types";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  SidebarTrigger,
  SidebarInput,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { Plus, Search } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "./ui/skeleton";

interface ConversationSidebarProps {
  conversations: Omit<Conversation, 'messages'>[];
  activeConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  isLoading
}: ConversationSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations
    .filter((conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between">
            <Logo />
            <SidebarTrigger />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <SidebarInput
            placeholder="Search..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {isLoading ? (
              <div className="p-2 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              filteredConversations.map((conv) => (
              <SidebarMenuItem key={conv.id}>
                <SidebarMenuButton
                  onClick={() => onConversationSelect(conv.id)}
                  isActive={activeConversationId === conv.id}
                  className="flex flex-col items-start h-auto py-2"
                >
                  <span className="w-full truncate">{conv.title}</span>
                   <span className="text-xs text-muted-foreground">
                    {conv.createdAt ? formatDistanceToNow(conv.createdAt, { addSuffix: true }) : 'Just now'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onNewConversation}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
