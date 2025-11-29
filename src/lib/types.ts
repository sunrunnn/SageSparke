import { Timestamp } from "firebase/firestore";

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  timestamp: Timestamp;
};

export type Conversation = {
  id:string;
  title: string;
  messages: Message[];
  createdAt: Timestamp;
  userId: string;
};
