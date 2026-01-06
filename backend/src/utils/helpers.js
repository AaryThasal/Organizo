//Generate a random organization join code
// Format: 6 uppercase alphanumeric characters (e.g., "A1B2C3")

function generateJoinCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
}

function formatUserResponse(user) {
    if (!user) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
}

function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isEmpty(str) {
    return !str || str.trim().length === 0;
}

module.exports = {
    generateJoinCode,
    formatUserResponse,
    getInitials,
    isValidEmail,
    isEmpty
};
