import { ChatLayout } from "@/components/chat-layout";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Conversation } from "@/lib/types";

async function getConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
    const { conversations } = await db.read();
    // In a real app, you'd parse the date strings into Date objects.
    // For this file-based DB, we'll do it here.
    return conversations
        .filter(c => c.userId === userId)
        .map(c => ({...c, createdAt: new Date(c.createdAt)}))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export default async function Home() {
  const session = await getSession();
  const initialConversations = session ? await getConversations(session.userId) : [];
  const user = session ? { username: session.username } : null;

  return (
    <main className="flex h-dvh flex-col items-center justify-center">
      <ChatLayout initialConversations={initialConversations} user={user} />
    </main>
  );
}
