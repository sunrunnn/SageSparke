import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { login } from '@/lib/session';

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { username, password } = validation.data;
    const database = await db.read();

    const existingUser = database.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (existingUser) {
      return NextResponse.json({ message: 'Username already taken' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: nanoid(),
      username,
      password: hashedPassword,
    };

    database.users.push(newUser);
    await db.write(database);
    
    // Create session for the new user
    await login(newUser.id, newUser.username);

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
