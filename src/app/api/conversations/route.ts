import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { Conversation } from '@/lib/types';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { conversations } = await db.read();
        const userConversations = conversations
            .filter(c => c.userId === session.userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return NextResponse.json(userConversations);
    } catch (error) {
        console.error('Failed to get conversations:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { conversation } = await req.json() as { conversation: Conversation };
        if (conversation.userId !== session.userId) {
             return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const database = await db.read();
        
        // Check for duplicates
        const existingConversation = database.conversations.find(c => c.id === conversation.id);
        if (existingConversation) {
            return NextResponse.json({ message: 'Conversation already exists' }, { status: 409 });
        }
        
        database.conversations.push(conversation);
        await db.write(database);
        
        return NextResponse.json(conversation, { status: 201 });
    } catch (error) {
        console.error('Failed to create conversation:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
