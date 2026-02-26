export function formatPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a standard 10-digit US number
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Check if it's an 11-digit US number starting with 1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    // Return the original string trimmed if it doesn't match standard US formats
    return phone.trim();
}

/**
 * Validates if the given string is a valid 10 or 11 digit US phone number.
 * Allows empty/null/undefined values (use required validation separately if needed).
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
    if (!phone || phone.trim() === '') return true; // Optional field

    const cleaned = phone.replace(/\D/g, '');

    // Must be 10 digits, or 11 digits starting with 1
    if (cleaned.length === 10) return true;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return true;

    return false;
}

