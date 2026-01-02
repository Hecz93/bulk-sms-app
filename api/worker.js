import { db } from '@vercel/postgres';
import { getProvider } from './_lib/sms-providers';

export default async function handler(request, response) {
    // Security check: Only allow Cron or manual trigger with secret
    // For now, we'll keep it simple for the user to test.

    try {
        const client = await db.connect();

        // 1. Find campaigns that are 'pending' or 'sending' and scheduled for now or earlier
        const activeCampaigns = await client.sql`
      SELECT * FROM campaigns 
      WHERE (status = 'pending' OR status = 'sending')
      AND scheduled_at <= CURRENT_TIMESTAMP
      LIMIT 1;
    `;

        if (activeCampaigns.rows.length === 0) {
            return response.status(200).json({ message: 'No active campaigns to process' });
        }

        const campaign = activeCampaigns.rows[0];

        // Mark campaign as 'sending' if it was pending
        if (campaign.status === 'pending') {
            await client.sql`UPDATE campaigns SET status = 'sending' WHERE id = ${campaign.id}`;
        }

        // 2. Pick next batch of messages (e.g., 5 at a time to stay within human delay/limits)
        // In a real worker, we'd process one by one with delays, 
        // but in Serverless, we process a small batch and stop.
        const pendingMessages = await client.sql`
      SELECT * FROM messages 
      WHERE campaign_id = ${campaign.id} 
      AND status = 'pending' 
      LIMIT 5;
    `;

        if (pendingMessages.rows.length === 0) {
            // All messages processed for this campaign
            await client.sql`UPDATE campaigns SET status = 'completed' WHERE id = ${campaign.id}`;
            return response.status(200).json({ message: 'Campaign completed' });
        }

        const provider = getProvider(campaign.provider_type);
        const results = [];

        for (const msg of pendingMessages.rows) {
            const result = await provider.send(msg.phone_number, msg.content, campaign.provider_config);

            if (result.success) {
                await client.sql`
          UPDATE messages 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP, id = ${result.id} 
          WHERE id = ${msg.id}
        `;
                await client.sql`UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ${campaign.id}`;
            } else {
                await client.sql`
          UPDATE messages 
          SET status = 'failed', error_message = ${result.error} 
          WHERE id = ${msg.id}
        `;
                await client.sql`UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ${campaign.id}`;
            }

            results.push({ phone: msg.phone_number, success: result.success });

            // Artificial short delay between messages in the batch
            await new Promise(r => setTimeout(r, 2000));
        }

        return response.status(200).json({
            message: `Processed ${results.length} messages`,
            results
        });
    } catch (error) {
        console.error('Worker error:', error);
        return response.status(500).json({ error: error.message });
    }
}
