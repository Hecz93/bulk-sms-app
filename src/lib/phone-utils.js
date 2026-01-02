/**
 * Phone Number Normalization Utility
 * Converts various phone number formats to E.164 format (+1XXXXXXXXXX)
 * Accepts: (555) 123-4567, 555-123-4567, 5551234567, +15551234567, etc.
 */

export function normalizePhoneNumber(phone) {
    if (!phone) return '';

    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +, keep it
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // Remove any leading 1 (US country code) if present
    if (cleaned.startsWith('1') && cleaned.length === 11) {
        cleaned = cleaned.substring(1);
    }

    // If we have 10 digits, assume US number and add +1
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }

    // If we have 11 digits starting with 1, format as +1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // Otherwise, if it doesn't have a +, add it
    if (!cleaned.startsWith('+')) {
        return `+${cleaned}`;
    }

    return cleaned;
}

/**
 * Format phone number for display (US format)
 * Converts +15551234567 to (555) 123-4567
 */
export function formatPhoneDisplay(phone) {
    const normalized = normalizePhoneNumber(phone);

    // Extract digits only
    const digits = normalized.replace(/\D/g, '');

    // US number (11 digits starting with 1)
    if (digits.length === 11 && digits.startsWith('1')) {
        const areaCode = digits.substring(1, 4);
        const prefix = digits.substring(4, 7);
        const lineNumber = digits.substring(7, 11);
        return `(${areaCode}) ${prefix}-${lineNumber}`;
    }

    // 10 digit number (assume US)
    if (digits.length === 10) {
        const areaCode = digits.substring(0, 3);
        const prefix = digits.substring(3, 6);
        const lineNumber = digits.substring(6, 10);
        return `(${areaCode}) ${prefix}-${lineNumber}`;
    }

    // Return as-is if we can't format
    return normalized;
}
