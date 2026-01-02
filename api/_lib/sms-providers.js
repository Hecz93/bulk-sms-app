/**
 * SMS Provider Interface for Serverless
 */

export const PROVIDERS = {
    MOCK: 'mock',
    TWILIO: 'twilio',
    TEXTBEE: 'textbee',
};

class MockProvider {
    async send(to, message, config) {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[CLOUD MOCK SEND] To: ${to} | Msg: ${message}`);
        return { success: true, id: `mock-${Date.now()}` };
    }
}

class TwilioProvider {
    async send(to, message, config) {
        if (!config.accountSid || !config.authToken || !config.fromNumber) {
            return { success: false, error: "Missing Twilio credentials" };
        }

        // Buffer.from because btoa is not reliable in all Node environments
        const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

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

class TextBeeProvider {
    async send(to, message, config) {
        if (!config.apiKey || !config.deviceId) {
            return { success: false, error: "Missing TextBee API Key or Device ID" };
        }

        try {
            const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${config.deviceId}/send-sms`, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients: [to],
                    message: message,
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.message || response.statusText };
            }

            return { success: true, id: result.data?.id || 'sent' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

export const getProvider = (type) => {
    switch (type) {
        case PROVIDERS.TWILIO:
            return new TwilioProvider();
        case PROVIDERS.TEXTBEE:
            return new TextBeeProvider();
        case PROVIDERS.MOCK:
        default:
            return new MockProvider();
    }
};
