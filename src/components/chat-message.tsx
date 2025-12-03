"use client";

import type { Message } from "@/lib/types";
import { Bot, Pencil, Sparkles, User } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState } from "react";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import Image from "next/image";

interface ChatMessageProps {
  message: Message;
  isLastUserMessage: boolean;
  onEdit: (id: string, newContent: string) => void;
}

export function ChatMessage({ message, isLastUserMessage, onEdit }: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const { toast } = useToast();

  const handleEditSubmit = () => {
    if (editedContent.trim() && editedContent.trim() !== message.content) {
      onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleImprovePrompt = async () => {
    toast({
        title: "Coming Soon!",
        description: "The prompt improvement feature is not yet implemented.",
    });
  };

  const isUser = message.role === "user";

  if (message.isLoading) {
    return (
      <div className="flex items-start gap-4 p-4">
        <Avatar className="h-8 w-8 border">
            <AvatarFallback><Bot /></AvatarFallback>
        </Avatar>
        <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-4 p-4 transition-colors",
        isUser ? "" : "bg-muted/20"
      )}
    >
      <Avatar
        className={cn(
          "h-8 w-8 border",
          isUser ? "bg-background" : "bg-primary text-primary-foreground"
        )}
      >
        <AvatarFallback>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <p className="font-semibold">{isUser ? "You" : "SageSpark"}</p>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSubmit();
                }
              }}
              rows={Math.max(3, editedContent.split('\n').length)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSubmit}>
                Save & Submit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleImprovePrompt}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Improve with AI
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
      {isUser && !isEditing && isLastUserMessage && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
