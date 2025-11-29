import { ChatLayout } from "@/components/chat-layout";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  const user = session ? { id: session.userId, username: session.username } : null;

  return (
    <main className="flex h-dvh flex-col items-center justify-center">
      <ChatLayout user={user} />
    </main>
  );
}
