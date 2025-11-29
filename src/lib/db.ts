import path from 'path';
import fs from 'fs/promises';
import { User, Conversation } from './types';

// This is a simple file-based database for demonstration purposes.
// In a real application, you would use a more robust database solution.

const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');

type DbData = {
    users: User[];
    conversations: Conversation[];
}

async function readDb(): Promise<DbData> {
    try {
        const fileContent = await fs.readFile(dbPath, 'utf-8');
        const data = JSON.parse(fileContent);
        // Ensure both users and conversations arrays exist
        return {
            users: data.users || [],
            conversations: data.conversations || [],
        };
    } catch (error) {
        // If the file doesn't exist or is invalid, return a default structure
        return { users: [], conversations: [] };
    }
}

async function writeDb(data: DbData): Promise<void> {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
    read: readDb,
    write: writeDb,
};
