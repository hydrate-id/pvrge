import { ref, computed } from 'vue';

const STORAGE_KEY = 'pvrge_sessions';

const dutySession = ref(null);
function loadDutySession() {
  try {
    const raw = localStorage.getItem('pvrge_duty_session');
    dutySession.value = raw ? JSON.parse(raw) : null;
  } catch (e) {
    dutySession.value = null;
  }
}
loadDutySession();

const isDutyActive = computed(() => Boolean(dutySession.value?.token && dutySession.value?.account?.email === 'support@pvrge.com'));

async function loginDuty(password) {
  isLoading.value = true;
  error.value = null;
  try {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'support@pvrge.com', password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid admin credentials');
    const sessionData = { token: data.token, account: data.account };
    localStorage.setItem('pvrge_duty_session', JSON.stringify(sessionData));
    dutySession.value = sessionData;
    return sessionData;
  } finally {
    isLoading.value = false;
  }
}

function logoutDuty() {
  localStorage.removeItem('pvrge_duty_session');
  dutySession.value = null;
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.accounts)) {
        accounts.value = data.accounts;
      }
      if (data.activeAccountId) {
        activeAccountId.value = data.activeAccountId;
      }
    }
  } catch (e) {
    console.error('Failed to parse sessions from localStorage:', e);
  }
}

function saveSessionsToStorage() {
  try {
    const data = {
      accounts: accounts.value,
      activeAccountId: activeAccountId.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save sessions to localStorage:', e);
  }
}

export function useSession() {
  const activeAccount = computed(() => {
    return accounts.value.find((acc) => acc.id === activeAccountId.value) || null;
  });

  function setStorageBytes(bytes) {
    storageBytes.value = bytes || 0;
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

      const newAccount = {
        id: data.id,
        email: data.email,
        password: data.password,
        token: data.token,
      };

      // Add to accounts or update
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
      throw new Error('On-duty account can only log in via /onduty/login.');
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

      const loggedIn = {
        id: data.account.id,
        email: data.account.email,
        password,
        token: data.token,
      };

      const existingIdx = accounts.value.findIndex((a) => a.id === loggedIn.id);
      if (existingIdx !== -1) {
        accounts.value[existingIdx] = loggedIn;
      } else {
        accounts.value.unshift(loggedIn);
      }

      activeAccountId.value = loggedIn.id;
      saveSessionsToStorage();
      return loggedIn;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function switchAccount(id) {
    const target = accounts.value.find((a) => a.id === id);
    if (target) {
      activeAccountId.value = target.id;
      saveSessionsToStorage();
    }
  }

  async function deleteAccount(id = null) {
    const targetId = id || activeAccountId.value;
    if (!targetId) return;

    const targetAccount = accounts.value.find((a) => a.id === targetId);
    if (targetAccount?.token) {
      try {
        const res = await fetch('/api/accounts/me', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${targetAccount.token}`,
          },
        });
        handleResponseStatus(res);
      } catch (e) {
        console.warn('Backend delete request failed:', e);
      }
    }

    accounts.value = accounts.value.filter((a) => a.id !== targetId);

    if (accounts.value.length > 0) {
      activeAccountId.value = accounts.value[0].id;
      saveSessionsToStorage();
    } else {
      activeAccountId.value = null;
      saveSessionsToStorage();
      // Auto-create new account as requested
      await createAccount();
    }
  }

  async function initSession() {
    if (isDutyActive.value) return;
    loadSessionsFromStorage();

    // If active account exists but is not in accounts list
    if (activeAccountId.value && !accounts.value.find((a) => a.id === activeAccountId.value)) {
      activeAccountId.value = accounts.value.length > 0 ? accounts.value[0].id : null;
    }

    // If no accounts yet, auto-generate first account
    if (accounts.value.length === 0 || !activeAccountId.value) {
      await createAccount();
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

  return {
    dutySession,
    isDutyActive,
    loginDuty,
    logoutDuty,
    loadDutySession,
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
    deleteAccount,
    fetchDomains,
  };
}

export { dutySession, isDutyActive, loginDuty, logoutDuty, loadDutySession, rateLimitState, triggerRateLimit, handleResponseStatus };
