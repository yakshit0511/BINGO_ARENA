/**
 * Generates an unambiguous, easy-to-read 6-character room code.
 * Excludes confusing homoglyphs: '0', 'O', '1', 'I'.
 */
const SAFE_ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode(): string {
  let result = '';
  const length = 6;
  const charsLength = SAFE_ROOM_CODE_CHARS.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsLength);
    result += SAFE_ROOM_CODE_CHARS[randomIndex];
  }

  return result;
}

/**
 * Copies text to user clipboard with a graceful fallback if Clipboard API is restricted.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
