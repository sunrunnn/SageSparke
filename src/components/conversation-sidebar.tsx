
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
  SidebarProvider
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { Plus, Search, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "./ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversationSidebarProps {
  conversations: Omit<Conversation, 'messages'>[];
  activeConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isLoading: boolean;
  isNewChatLoading: boolean;
  userNav: React.ReactNode;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  isLoading,
  isNewChatLoading,
  userNav,
}: ConversationSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredConversations = conversations
    .filter((conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleDeleteConfirm = () => {
    if (deletingId) {
        onDeleteConversation(deletingId);
        setDeletingId(null);
    }
  }

  return (
    <SidebarProvider>
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
              <SidebarMenuItem key={conv.id} className="group">
                <SidebarMenuButton
                  onClick={() => onConversationSelect(conv.id)}
                  isActive={activeConversationId === conv.id}
                  className="flex flex-col items-start h-auto py-2 pr-8"
                >
                  <span className="w-full truncate">{conv.title}</span>
                   <span className="text-xs text-muted-foreground">
                    {conv.createdAt ? formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true }) : 'Just now'}
                  </span>
                </SidebarMenuButton>
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(conv.id);
                    }}
                >
                    <Trash2 size={16} />
                </Button>
              </SidebarMenuItem>
            )))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="flex-row items-center gap-2">
         {userNav}
         <Button
          variant="outline"
          className="flex-1 justify-start"
          onClick={onNewConversation}
          disabled={isNewChatLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isNewChatLoading ? 'Creating...' : 'New Chat'}
        </Button>
      </SidebarFooter>
    </Sidebar>
    <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this conversation.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </SidebarProvider>
  );
}
