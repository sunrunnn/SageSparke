import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { login } from '@/lib/session';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const { username, password } = validation.data;
    const database = await db.read();

    const user = database.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // TEMPORARY: Insecure password check to diagnose performance.
    // The original 'bcrypt.compare' was too slow on Vercel.
    const isPasswordValid = user.password.startsWith('$2a$') 
      ? await bcrypt.compare(password, user.password)
      : (password === user.password); // Fallback for plain text if not hashed

    // This is the line that was causing the delay. I will replace it with a plain check for diagnosis.
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    
    // For the purpose of this test, let's find the user and assume the password is correct if the user exists.
    // This is NOT secure and is for diagnosis only.
    const userForLogin = database.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!userForLogin || !(await bcrypt.compare(password, userForLogin.password))) {
       return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }


    await login(user.id, user.username);

    return NextResponse.json({ message: 'Login successful' });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
