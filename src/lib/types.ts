export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  isLoading?: boolean;
  timestamp: Date;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};

export type User = {
    id: string;
    username: string;
    image?: string;
};
