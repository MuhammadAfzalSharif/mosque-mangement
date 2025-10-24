// Centralized validation utilities for mosque management system

// Allowed email domains
const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];

// Validation regex patterns
const PATTERNS = {
    // Email with domain restriction
    EMAIL_DOMAIN: new RegExp(`^[a-zA-Z0-9._%+-]+@(${ALLOWED_EMAIL_DOMAINS.join('|').replace(/\./g, '\\.')})$`, 'i'),

    // Pakistani phone number: +923xxxxxxxxx
    PHONE: /^\+923[0-9]{9}$/,

    // Password: min 8 chars, uppercase, lowercase, number, special char
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,

    // Name: letters, spaces, hyphens, apostrophes only
    NAME: /^[a-zA-Z\s\-']+$/,

    // Mosque name: letters, numbers, spaces, hyphens, apostrophes
    MOSQUE_NAME: /^[a-zA-Z0-9\s\-']+$/
};

// Field length constraints
const LENGTHS = {
    NAME: { MIN: 2, MAX: 50 },
    MOSQUE_NAME: { MIN: 3, MAX: 100 },
    LOCATION: { MIN: 5, MAX: 200 },
    DESCRIPTION: { MAX: 1000 },
    ADMIN_INSTRUCTIONS: { MAX: 500 },
    APPLICATION_NOTES: { MAX: 500 },
    PASSWORD: { MIN: 8, MAX: 50 }
};

/**
 * Validate email format and domain
 * @param {string} email - Email to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateEmail(email) {
    if (!email || !email.trim()) {
        return { valid: false, error: 'Email is required' };
    }

    if (!PATTERNS.EMAIL_DOMAIN.test(email.trim())) {
        return {
            valid: false,
            error: `Email must be from one of these providers: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @param {boolean} required - Whether phone is required
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validatePhone(phone, required = true) {
    if (!phone || !phone.trim()) {
        return required
            ? { valid: false, error: 'Phone number is required' }
            : { valid: true, error: null };
    }

    if (!PATTERNS.PHONE.test(phone.trim())) {
        return {
            valid: false,
            error: 'Phone number must be in format +923xxxxxxxxx (e.g., +923001234567)'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validatePassword(password) {
    if (!password) {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < LENGTHS.PASSWORD.MIN) {
        return {
            valid: false,
            error: `Password must be at least ${LENGTHS.PASSWORD.MIN} characters long`
        };
    }

    if (password.length > LENGTHS.PASSWORD.MAX) {
        return {
            valid: false,
            error: `Password must not exceed ${LENGTHS.PASSWORD.MAX} characters`
        };
    }

    if (!PATTERNS.PASSWORD.test(password)) {
        return {
            valid: false,
            error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate name (person name)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateName(name, fieldName = 'Name') {
    if (!name || !name.trim()) {
        return { valid: false, error: `${fieldName} is required` };
    }

    if (name.trim().length < LENGTHS.NAME.MIN) {
        return {
            valid: false,
            error: `${fieldName} must be at least ${LENGTHS.NAME.MIN} characters long`
        };
    }

    if (name.trim().length > LENGTHS.NAME.MAX) {
        return {
            valid: false,
            error: `${fieldName} must not exceed ${LENGTHS.NAME.MAX} characters`
        };
    }

    if (!PATTERNS.NAME.test(name.trim())) {
        return {
            valid: false,
            error: `${fieldName} can only contain letters, spaces, hyphens and apostrophes`
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate mosque name
 * @param {string} name - Mosque name to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateMosqueName(name) {
    if (!name || !name.trim()) {
        return { valid: false, error: 'Mosque name is required' };
    }

    if (name.trim().length < LENGTHS.MOSQUE_NAME.MIN) {
        return {
            valid: false,
            error: `Mosque name must be at least ${LENGTHS.MOSQUE_NAME.MIN} characters long`
        };
    }

    if (name.trim().length > LENGTHS.MOSQUE_NAME.MAX) {
        return {
            valid: false,
            error: `Mosque name must not exceed ${LENGTHS.MOSQUE_NAME.MAX} characters`
        };
    }

    if (!PATTERNS.MOSQUE_NAME.test(name.trim())) {
        return {
            valid: false,
            error: 'Mosque name can only contain letters, numbers, spaces, hyphens and apostrophes'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate location
 * @param {string} location - Location to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateLocation(location) {
    if (!location || !location.trim()) {
        return { valid: false, error: 'Location is required' };
    }

    if (location.trim().length < LENGTHS.LOCATION.MIN) {
        return {
            valid: false,
            error: `Location must be at least ${LENGTHS.LOCATION.MIN} characters long`
        };
    }

    if (location.trim().length > LENGTHS.LOCATION.MAX) {
        return {
            valid: false,
            error: `Location must not exceed ${LENGTHS.LOCATION.MAX} characters`
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate description
 * @param {string} description - Description to validate
 * @param {boolean} required - Whether description is required
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateDescription(description, required = false) {
    if (!description || !description.trim()) {
        return required
            ? { valid: false, error: 'Description is required' }
            : { valid: true, error: null };
    }

    if (description.trim().length > LENGTHS.DESCRIPTION.MAX) {
        return {
            valid: false,
            error: `Description must not exceed ${LENGTHS.DESCRIPTION.MAX} characters`
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate admin instructions
 * @param {string} instructions - Instructions to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateAdminInstructions(instructions) {
    if (!instructions || !instructions.trim()) {
        return { valid: true, error: null };
    }

    if (instructions.trim().length > LENGTHS.ADMIN_INSTRUCTIONS.MAX) {
        return {
            valid: false,
            error: `Admin instructions must not exceed ${LENGTHS.ADMIN_INSTRUCTIONS.MAX} characters`
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate application notes
 * @param {string} notes - Notes to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateApplicationNotes(notes) {
    if (!notes || !notes.trim()) {
        return { valid: true, error: null };
    }

    if (notes.trim().length > LENGTHS.APPLICATION_NOTES.MAX) {
        return {
            valid: false,
            error: `Application notes must not exceed ${LENGTHS.APPLICATION_NOTES.MAX} characters`
        };
    }

    return { valid: true, error: null };
}

/**
 * Sanitize and trim string
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
    return str ? str.trim() : '';
}

/**
 * Sanitize email (trim and lowercase)
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
function sanitizeEmail(email) {
    return email ? email.trim().toLowerCase() : '';
}

export {
    ALLOWED_EMAIL_DOMAINS,
    PATTERNS,
    LENGTHS,
    validateEmail,
    validatePhone,
    validatePassword,
    validateName,
    validateMosqueName,
    validateLocation,
    validateDescription,
    validateAdminInstructions,
    validateApplicationNotes,
    sanitizeString,
    sanitizeEmail
};
