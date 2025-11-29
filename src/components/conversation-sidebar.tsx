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
  SidebarGroup,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { MessageSquare, Plus, Search } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
}: ConversationSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations
    .filter((conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
            {filteredConversations.map((conv) => (
              <SidebarMenuItem key={conv.id}>
                <SidebarMenuButton
                  onClick={() => onConversationSelect(conv.id)}
                  isActive={activeConversationId === conv.id}
                  className="flex flex-col items-start h-auto py-2"
                >
                  <span className="w-full truncate">{conv.title}</span>
                   <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(conv.createdAt, { addSuffix: true })}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
