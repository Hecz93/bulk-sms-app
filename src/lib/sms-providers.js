/**
 * SMS Provider Interface
 * Each provider must implement:
 * - send(to, message, config): Promise<{success: boolean, id: string, error?: string}>
 */

export const PROVIDERS = {
    MOCK: 'mock',
    TWILIO: 'twilio',
    BULKSMS: 'bulksms', // Cloud provider example
};

class MockProvider {
    async send(to, message, config) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

        // Random failure simulation (5% chance)
        if (Math.random() < 0.05) {
            return { success: false, error: "Simulated network error" };
        }

        console.log(`[MOCK SEND] To: ${to} | Msg: ${message}`);
        return { success: true, id: `mock-${Date.now()}` };
    }
}

class TwilioProvider {
    async send(to, message, config) {
        if (!config.accountSid || !config.authToken || !config.fromNumber) {
            return { success: false, error: "Missing Twilio credentials" };
        }

        const auth = btoa(`${config.accountSid}:${config.authToken}`);

        try {
            const formData = new URLSearchParams();
            formData.append('To', to);
            formData.append('From', config.fromNumber);
            formData.append('Body', message);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.message || response.statusText };
            }

            return { success: true, id: result.sid };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

export const getProvider = (type) => {
    switch (type) {
        case PROVIDERS.TWILIO:
            return new TwilioProvider();
        case PROVIDERS.MOCK:
        default:
            return new MockProvider();
    }
};
