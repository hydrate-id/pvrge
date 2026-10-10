export async function copyText(text) {
  if (text === null || text === undefined || text === '') return false;
  const str = String(text);
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (e) {
      console.warn('writeText failed, fallback:', e);
    }
  }
  try {
    const el = document.createElement('textarea');
    el.value = str;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (err) {
    return false;
  }
}
