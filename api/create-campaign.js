import { db } from '@vercel/postgres';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { name, template, providerType, providerConfig, scheduledAt, messages } = request.body;

    if (!messages || messages.length === 0) {
        return response.status(400).json({ error: 'No messages provided' });
    }

    try {
        const client = await db.connect();

        // 1. Create Campaign
        const campaignResult = await client.sql`
      INSERT INTO campaigns (name, template, provider_type, provider_config, total_messages, scheduled_at)
      VALUES (${name}, ${template}, ${providerType}, ${JSON.stringify(providerConfig)}, ${messages.length}, ${scheduledAt || new Date().toISOString()})
      RETURNING id;
    `;

        const campaignId = campaignResult.rows[0].id;

        // 2. Batch Insert Messages
        // Note: Vercel Postgres has a limit on parameters, so we do it in chunks if needed.
        // For small batches (< 500), we can do one insert.
        // For simplicity here, we'll map them.

        for (const msg of messages) {
            await client.sql`
        INSERT INTO messages (campaign_id, phone_number, content)
        VALUES (${campaignId}, ${msg.to}, ${msg.content});
      `;
        }

        return response.status(200).json({
            message: 'Campaign created and queued',
            campaignId
        });
    } catch (error) {
        console.error('Campaign creation error:', error);
        return response.status(500).json({ error: error.message });
    }
}
