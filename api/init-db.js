import { db } from '@vercel/postgres';

export default async function handler(request, response) {
    try {
        const client = await db.connect();

        // Create campaigns table
        await client.sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        template TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        provider_config JSONB NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, sending, completed, paused
        total_messages INTEGER NOT NULL,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        // Create messages table (the queue)
        await client.sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        phone_number TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, sent, failed
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        // Index for the worker to find pending messages quickly
        await client.sql`CREATE INDEX IF NOT EXISTS idx_messages_status_pending ON messages(status) WHERE status = 'pending';`;

        return response.status(200).json({ message: 'Database initialized successfully' });
    } catch (error) {
        console.error('Database initialization error:', error);
        return response.status(500).json({ error: error.message });
    }
}
