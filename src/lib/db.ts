import path from 'path';
import fs from 'fs/promises';
import { User, Conversation } from './types';

// This is a simple file-based database for demonstration purposes.
// In a real application, you would use a more robust database solution.

const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');

async function readDb(): Promise<{ users: User[], conversations: Conversation[] }> {
    try {
        const fileContent = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        // If the file doesn't exist, return a default structure
        return { users: [], conversations: [] };
    }
}

async function writeDb(data: { users: User[], conversations: Conversation[] }): Promise<void> {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
    read: readDb,
    write: writeDb,
};
