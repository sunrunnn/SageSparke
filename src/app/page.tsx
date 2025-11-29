'use client';

import { ChatLayout } from "@/components/chat-layout";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex h-dvh flex-col items-center justify-center">
      <ChatLayout />
    </main>
  );
}
