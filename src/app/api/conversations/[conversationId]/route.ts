import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { conversationId } = params;
  
  try {
    const body = await req.json();
    const database = await db.read();
    
    const conversationIndex = database.conversations.findIndex(c => c.id === conversationId);

    if (conversationIndex === -1) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 });
    }
    
    const originalConversation = database.conversations[conversationIndex];

    if (originalConversation.userId !== session.userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Update only the fields that are sent in the body
    const updatedConversation = { ...originalConversation, ...body };
    database.conversations[conversationIndex] = updatedConversation;

    await db.write(database);
    
    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error(`Failed to update conversation ${conversationId}:`, error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { conversationId } = params;
  
  try {
    const database = await db.read();
    
    const conversationIndex = database.conversations.findIndex(c => c.id === conversationId);

    if (conversationIndex === -1) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 });
    }
    
    const originalConversation = database.conversations[conversationIndex];

    if (originalConversation.userId !== session.userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    database.conversations.splice(conversationIndex, 1);

    await db.write(database);
    
    return NextResponse.json({ message: 'Conversation deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete conversation ${conversationId}:`, error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
