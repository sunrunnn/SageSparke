import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { Conversation } from '@/lib/types';
import { nanoid } from 'nanoid';

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
        const body = await req.json();
        const { title, messages } = body;

        if (!title) {
            return NextResponse.json({ message: 'Title is required' }, { status: 400 });
        }
        
        const newConversation: Conversation = {
            id: nanoid(),
            userId: session.userId,
            title: title,
            messages: messages || [],
            createdAt: new Date(),
        };

        const database = await db.read();
        
        // Ensure conversations array exists
        if (!database.conversations) {
            database.conversations = [];
        }
        
        database.conversations.push(newConversation);
        await db.write(database);
        
        return NextResponse.json(newConversation, { status: 201 });
    } catch (error) {
        console.error('Failed to create conversation:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
