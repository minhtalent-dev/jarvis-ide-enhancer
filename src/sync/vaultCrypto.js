const crypto = require('crypto');
const zlib = require('zlib');

const MAGIC_HEADER_STRING = 'JARVIS_VAULT';
const MAGIC_HEADER = Buffer.from(MAGIC_HEADER_STRING, 'utf8'); // 12 bytes
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_OVERHEAD = MAGIC_HEADER.length + SALT_LENGTH + IV_LENGTH + TAG_LENGTH; // 56 bytes

/**
 * Mã hóa dữ liệu buffer bằng AES-256-GCM + scrypt KDF + Gzip
 * @param {Buffer} dataBuffer - Buffer dữ liệu cần mã hóa
 * @param {string} passphrase - Mật khẩu mở khóa
 * @returns {Buffer} Buffer gói mã hóa hoàn chỉnh
 */
function encryptVault(dataBuffer, passphrase) {
    if (!Buffer.isBuffer(dataBuffer)) {
        throw new TypeError('Dữ liệu mã hóa phải là Buffer');
    }
    if (!passphrase || typeof passphrase !== 'string') {
        throw new Error('Passphrase không được để trống');
    }

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // KDF: 32 bytes key
    const key = crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });

    // Nén Gzip trước khi mã hóa
    const compressed = zlib.gzipSync(dataBuffer);

    // AES-256-GCM cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([MAGIC_HEADER, salt, iv, authTag, ciphertext]);
}

/**
 * Giải mã gói dữ liệu JARVIS Vault
 * @param {Buffer} vaultBuffer - Buffer gói vault
 * @param {string} passphrase - Mật khẩu mở khóa
 * @returns {Buffer} Buffer dữ liệu gốc sau giải nén
 */
function decryptVault(vaultBuffer, passphrase) {
    if (!Buffer.isBuffer(vaultBuffer) || vaultBuffer.length < HEADER_OVERHEAD) {
        throw new Error('Tệp không phải định dạng JARVIS Vault hợp lệ');
    }

    const header = vaultBuffer.subarray(0, MAGIC_HEADER.length);
    if (!header.equals(MAGIC_HEADER)) {
        throw new Error('Tệp không phải định dạng JARVIS Vault hợp lệ');
    }

    if (!passphrase || typeof passphrase !== 'string') {
        throw new Error('Passphrase không được để trống');
    }

    let offset = MAGIC_HEADER.length; // 12
    const salt = vaultBuffer.subarray(offset, offset + SALT_LENGTH); // 12..28
    offset += SALT_LENGTH;

    const iv = vaultBuffer.subarray(offset, offset + IV_LENGTH); // 28..40
    offset += IV_LENGTH;

    const authTag = vaultBuffer.subarray(offset, offset + TAG_LENGTH); // 40..56
    offset += TAG_LENGTH;

    const ciphertext = vaultBuffer.subarray(offset); // 56..end

    try {
        const key = crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decryptedCompressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return zlib.gunzipSync(decryptedCompressed);
    } catch (err) {
        throw new Error('Mật khẩu Vault không chính xác hoặc tệp bị hỏng');
    }
}

module.exports = {
    MAGIC_HEADER_STRING,
    MAGIC_HEADER,
    HEADER_OVERHEAD,
    encryptVault,
    decryptVault
};
