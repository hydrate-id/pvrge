/**
 * Utility to extract OTP/verification code from text or email message.
 */

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts a 4-8 digit OTP/verification code from text (English & Indonesian context).
 * @param {string} text
 * @returns {string|null}
 */
export function extractOtp(text) {
  if (!text || typeof text !== 'string') return null;

  const clean = stripHtml(text);
  if (!clean) return null;

  // Pattern 1: Keyword followed by 4-8 digit code
  // e.g. "Verification code: 123456", "Kode verifikasi: 123456", "OTP is 492019"
  // "Kode OTP Anda: 829103", "Your security code is 782103", "Kode konfirmasi: 8492"
  const keywordThenCode = /(?:(?:verification|verify|security|confirmation|confirm|login|auth|authentication|one-time|verifikasi|keamanan|konfirmasi|masuk|otentikasi)?\s*(?:code|kode|otp|pin|passcode|sandi))\s*[:=–—\-]?\s*(?:is|adalah|sebesar)?\s*[:=–—\-]?\s*['"“`]?([0-9]{4,8})\b/i;
  const match1 = clean.match(keywordThenCode);
  if (match1) return match1[1];

  // Pattern 2: 4-8 digit code followed by keyword or verification phrase
  // e.g. "123456 is your verification code", "829103 adalah kode verifikasi Anda"
  // "567890 to verify your account", "482015 is your security code"
  const codeThenKeyword = /\b([0-9]{4,8})\b\s*(?:is\s+your|adalah|sebagai|to\s+verify|untuk\s+verifikasi|untuk\s+mengonfirmasi)?\s*(?:(?:verification|verify|security|confirmation|confirm|login|auth|verifikasi|keamanan|konfirmasi|masuk)?\s*(?:code|kode|otp|pin|passcode|sandi)|(?:to\s+verify|untuk\s+verifikasi))/i;
  const match2 = clean.match(codeThenKeyword);
  if (match2) return match2[1];

  // Pattern 3: Proximity match (keyword within 35 characters before or after a 4-8 digit number)
  // e.g. "Gunakan kode 4829 untuk verifikasi", "Enter code 829103 to proceed"
  const proximityAfter = /(?:code|kode|otp|pin|passcode|verifikasi|verify|verification|konfirmasi|confirm|confirmation)\b[^0-9\n\r]{0,35}?\b([0-9]{4,8})\b/i;
  const match3 = clean.match(proximityAfter);
  if (match3) return match3[1];

  const proximityBefore = /\b([0-9]{4,8})\b[^0-9\n\r]{0,35}?(?:code|kode|otp|pin|passcode|verifikasi|verify|verification|konfirmasi|confirm|confirmation)\b/i;
  const match4 = clean.match(proximityBefore);
  if (match4) return match4[1];

  return null;
}

/**
 * Extracts OTP from an email message object across subject, snippet, body_text, and body_html.
 * @param {object} msg
 * @returns {string|null}
 */
export function getMsgOtp(msg) {
  if (!msg || typeof msg !== 'object') return null;

  return (
    extractOtp(msg.subject) ||
    extractOtp(msg.snippet || msg.intro) ||
    extractOtp(msg.body_text) ||
    extractOtp(msg.body_html) ||
    null
  );
}
