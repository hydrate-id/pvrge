import { ref, computed } from 'vue';

const STORAGE_KEY = 'pvrge_sessions';

const isDutyActive = ref(false);
const dutySession = ref(null);

async function checkDutySession() {
  try {
    const res = await fetch('/api/duty/me');
    if (res.status === 200) {
      const data = await res.json().catch(() => null);
      isDutyActive.value = true;
      dutySession.value = { account: { email: data?.email || 'support@pvrge.com' } };
      return true;
    } else {
      isDutyActive.value = false;
      dutySession.value = null;
      return false;
    }
  } catch (e) {
    isDutyActive.value = false;
    dutySession.value = null;
    return false;
  }
}

async function loginDuty(emailOrPassword, maybePassword) {
  let email = 'support@pvrge.com';
  let password = emailOrPassword;
  if (maybePassword !== undefined) {
    email = emailOrPassword;
    password = maybePassword;
  }

  isLoading.value = true;
  error.value = null;
  try {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid admin credentials');
    isDutyActive.value = true;
    dutySession.value = { account: data.account || { email } };
    return data;
  } finally {
    isLoading.value = false;
  }
}

async function logoutDuty() {
  isLoading.value = true;
  error.value = null;
  try {
    await fetch('/api/auth/duty-logout', { method: 'POST' });
  } catch (e) {
    console.warn('Duty logout request failed:', e);
  } finally {
    isDutyActive.value = false;
    dutySession.value = null;
    isLoading.value = false;
  }
  loadSessionsFromStorage();
  if (accounts.value.length > 0 && !activeAccountId.value) {
    activeAccountId.value = accounts.value[0].id;
  }
}

const accounts = ref([]);
const activeAccountId = ref(null);
const isLoading = ref(false);
const error = ref(null);
const storageBytes = ref(0);

const rateLimitState = ref({
  isLimited: false,
  retryAfter: 0,
  message: '',
});

let rateLimitTimer = null;
function triggerRateLimit(retrySeconds = 30, message = '') {
  const seconds = Math.max(1, parseInt(retrySeconds, 10) || 30);
  rateLimitState.value = {
    isLimited: true,
    retryAfter: seconds,
    message: message || `Too many requests. Please wait ${seconds}s.`,
  };
  if (rateLimitTimer) clearInterval(rateLimitTimer);
  rateLimitTimer = setInterval(() => {
    if (rateLimitState.value.retryAfter > 1) {
      rateLimitState.value.retryAfter -= 1;
    } else {
      clearInterval(rateLimitTimer);
      rateLimitTimer = null;
      rateLimitState.value = { isLimited: false, retryAfter: 0, message: '' };
    }
  }, 1000);
}

function handleResponseStatus(res, fallbackMessage = 'Too many requests') {
  if (res?.status === 429) {
    const retryHeader = res.headers?.get ? res.headers.get('Retry-After') : null;
    const seconds = retryHeader ? parseInt(retryHeader, 10) : 30;
    triggerRateLimit(seconds, fallbackMessage);
    return true;
  }
  return false;
}

function loadSessionsFromStorage() {
  try {
    localStorage.removeItem('pvrge_sessions');
    localStorage.removeItem('pvrge_duty_session');

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.accounts)) {
        // Only keep metadata: { id, email, password, createdAt }
        accounts.value = data.accounts.map((acc) => ({
          id: acc.id,
          email: acc.email,
          password: acc.password,
          createdAt: acc.createdAt || acc.created_at,
        }));
      }
      if (data.activeAccountId) {
        activeAccountId.value = data.activeAccountId;
      }
    }
  } catch (e) {
    console.error('Failed to parse sessions from sessionStorage:', e);
  }
}

function saveSessionsToStorage() {
  try {
    const cleanedAccounts = accounts.value.map((acc) => ({
      id: acc.id,
      email: acc.email,
      password: acc.password,
      createdAt: acc.createdAt,
    }));
    const data = {
      accounts: cleanedAccounts,
      activeAccountId: activeAccountId.value,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save sessions to sessionStorage:', e);
  }
}

async function switchAccount(id) {
  isLoading.value = true;
  error.value = null;
  try {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: id }),
    });

    if (handleResponseStatus(res)) {
      throw new Error('Rate limit reached.');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to switch account');
    }

    activeAccountId.value = id;
    saveSessionsToStorage();
    return data;
  } catch (err) {
    error.value = err.message;
    throw err;
  } finally {
    isLoading.value = false;
  }
}

async function createAccount(custom = {}) {
  isLoading.value = true;
  error.value = null;
  try {
    const payload = {};
    if (custom.username) payload.username = custom.username;
    if (custom.domain) payload.domain = custom.domain;
    if (custom.password) payload.password = custom.password;

    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (handleResponseStatus(res, 'Account creation rate limited. Please try again later.')) {
      throw new Error('Rate limit reached. Please wait before creating an account.');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }

    const account = data.account || data;
    const newAccount = {
      id: account.id,
      email: account.email,
      password: account.password || custom.password,
      createdAt: account.created_at || account.createdAt || new Date().toISOString(),
    };

    const existingIdx = accounts.value.findIndex((a) => a.id === newAccount.id);
    if (existingIdx !== -1) {
      accounts.value[existingIdx] = newAccount;
    } else {
      accounts.value.unshift(newAccount);
    }

    activeAccountId.value = newAccount.id;
    saveSessionsToStorage();
    return newAccount;
  } catch (err) {
    error.value = err.message;
    throw err;
  } finally {
    isLoading.value = false;
  }
}

async function loginAccount({ email, password }) {
  if (email && email.trim().toLowerCase() === 'support@pvrge.com') {
    throw new Error('Invalid email or password');
  }

  isLoading.value = true;
  error.value = null;
  try {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (handleResponseStatus(res, 'Login rate limited. Please try again later.')) {
      throw new Error('Rate limit reached. Please wait before logging in.');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }

    const account = data.account || data;
    const newAccount = {
      id: account.id,
      email: account.email,
      password,
      createdAt: account.created_at || account.createdAt || new Date().toISOString(),
    };

    const existingIdx = accounts.value.findIndex((a) => a.id === newAccount.id);
    if (existingIdx !== -1) {
      accounts.value[existingIdx] = { ...accounts.value[existingIdx], ...newAccount };
    } else {
      accounts.value.unshift(newAccount);
    }

    activeAccountId.value = newAccount.id;
    saveSessionsToStorage();
    return newAccount;
  } catch (err) {
    error.value = err.message;
    throw err;
  } finally {
    isLoading.value = false;
  }
}

async function logoutAccount(id = activeAccountId.value) {
  isLoading.value = true;
  error.value = null;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Logout request failed:', e);
  } finally {
    isLoading.value = false;
  }

  if (id) {
    accounts.value = accounts.value.filter((a) => a.id !== id);
  }
  saveSessionsToStorage();

  if (accounts.value.length > 0) {
    await switchAccount(accounts.value[0].id);
  } else {
    activeAccountId.value = null;
    await createAccount();
  }
}

async function deleteAccount(id = null) {
  const targetId = id || activeAccountId.value;
  if (!targetId) return;

  try {
    const res = await fetch('/api/accounts/me', {
      method: 'DELETE',
    });
    handleResponseStatus(res);
  } catch (e) {
    console.warn('Backend delete request failed:', e);
  }

  accounts.value = accounts.value.filter((a) => a.id !== targetId);

  if (accounts.value.length > 0) {
    await switchAccount(accounts.value[0].id);
  } else {
    activeAccountId.value = null;
    saveSessionsToStorage();
    await createAccount();
  }
}

async function initSession() {
  loadSessionsFromStorage();
  await checkDutySession();
  if (isDutyActive.value) return;

  try {
    const res = await fetch('/api/accounts/me');
    if (res.status === 200) {
      const data = await res.json();
      activeAccountId.value = data.account.id;
      const exists = accounts.value.some((a) => a.id === data.account.id);
      if (!exists) {
        accounts.value.push({
          id: data.account.id,
          email: data.account.email,
          createdAt: data.account.created_at,
        });
      }
      saveSessionsToStorage();
    } else {
      if (accounts.value.length > 0) {
        await switchAccount(accounts.value[0].id);
      } else {
        await createAccount();
      }
    }
  } catch (e) {
    if (accounts.value.length > 0) {
      await switchAccount(accounts.value[0].id);
    } else {
      await createAccount();
    }
  }
}

async function fetchDomains() {
  try {
    const res = await fetch('/api/domains');
    if (handleResponseStatus(res)) return [];
    const data = await res.json();
    return data.domains || [];
  } catch (e) {
    console.warn('Failed to fetch domains:', e);
    return [];
  }
}

export function useSession() {
  const activeAccount = computed(() => {
    return accounts.value.find((acc) => acc.id === activeAccountId.value) || null;
  });

  function setStorageBytes(bytes) {
    storageBytes.value = bytes || 0;
  }

  return {
    dutySession,
    isDutyActive,
    checkDutySession,
    loginDuty,
    logoutDuty,
    accounts,
    activeAccountId,
    activeAccount,
    storageBytes,
    isLoading,
    error,
    rateLimitState,
    triggerRateLimit,
    handleResponseStatus,
    setStorageBytes,
    initSession,
    createAccount,
    loginAccount,
    switchAccount,
    logoutAccount,
    deleteAccount,
    fetchDomains,
  };
}

export {
  dutySession,
  isDutyActive,
  checkDutySession,
  loginDuty,
  logoutDuty,
  accounts,
  activeAccountId,
  switchAccount,
  logoutAccount,
  rateLimitState,
  triggerRateLimit,
  handleResponseStatus,
};
