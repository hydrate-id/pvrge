<script setup>
import { ref, onMounted, watch } from 'vue';
import { UserPlus, LogIn, X, AlertCircle, RefreshCw, Sparkles } from 'lucide-vue-next';
import { useSession } from '../composables/useSession';

const props = defineProps({
  isOpen: Boolean,
  initialMode: {
    type: String,
    default: 'create', // 'create' or 'login'
  },
});

const emit = defineEmits(['close', 'account-ready']);

const session = useSession();
const mode = ref('create'); // 'create' or 'login'

// Create form fields
const username = ref('');
const selectedDomain = ref('');
const password = ref('');
const domains = ref([]);

// Login form fields
const loginEmail = ref('');
const loginPassword = ref('');

const errorMsg = ref('');
const isSubmitting = ref(false);

watch(() => props.initialMode, (newVal) => {
  mode.value = newVal || 'create';
});

watch(() => props.isOpen, async (open) => {
  if (open) {
    errorMsg.value = '';
    loadDomains();
  }
});

async function loadDomains() {
  const list = await session.fetchDomains();
  domains.value = list;
  if (list.length > 0 && !selectedDomain.value) {
    selectedDomain.value = list[0].id;
  }
}

async function handleCreate() {
  errorMsg.value = '';
  isSubmitting.value = true;
  try {
    const payload = {};
    if (username.value.trim()) payload.username = username.value.trim().toLowerCase();
    if (selectedDomain.value) payload.domain = selectedDomain.value;
    if (password.value) payload.password = password.value;

    await session.createAccount(payload);
    username.value = '';
    password.value = '';
    emit('account-ready');
    emit('close');
  } catch (err) {
    errorMsg.value = err.message || 'Failed to create account';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleLogin() {
  errorMsg.value = '';
  if (!loginEmail.value || !loginPassword.value) {
    errorMsg.value = 'Email and password are required';
    return;
  }

  isSubmitting.value = true;
  try {
    await session.loginAccount({
      email: loginEmail.value.trim(),
      password: loginPassword.value,
    });
    loginEmail.value = '';
    loginPassword.value = '';
    emit('account-ready');
    emit('close');
  } catch (err) {
    errorMsg.value = err.message || 'Invalid credentials';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div class="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
      <!-- Close button -->
      <button 
        @click="emit('close')" 
        class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
        aria-label="Close modal"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Tabs header -->
      <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
        <button
          type="button"
          @click="mode = 'create'; errorMsg = ''"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition',
            mode === 'create' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
        >
          <UserPlus class="w-4 h-4" />
          <span>New Account</span>
        </button>
        <button
          type="button"
          @click="mode = 'login'; errorMsg = ''"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition',
            mode === 'login' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
        >
          <LogIn class="w-4 h-4" />
          <span>Login Existing</span>
        </button>
      </div>

      <!-- Error alert -->
      <div v-if="errorMsg" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Tab 1: Create Account Form -->
      <form v-if="mode === 'create'" @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Custom Username (optional)
          </label>
          <div class="relative">
            <input
              v-model="username"
              type="text"
              placeholder="Leave blank for random (e.g. swiftfox42)"
              pattern="[a-z0-9]{3,32}"
              class="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">3-32 lowercase letters and numbers</span>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Domain
          </label>
          <select
            v-model="selectedDomain"
            class="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option v-for="d in domains" :key="d.id" :value="d.id">@{{ d.id }}</option>
            <option v-if="domains.length === 0" value="">Default (@pvrge.com)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Custom Password (optional)
          </label>
          <input
            v-model="password"
            type="password"
            placeholder="Leave blank for auto-generated"
            class="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            <RefreshCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <Sparkles v-else class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Generating...' : 'Create Inbox' }}</span>
          </button>
        </div>
      </form>

      <!-- Tab 2: Login Existing Form -->
      <form v-else @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Email Address
          </label>
          <input
            v-model="loginEmail"
            type="email"
            required
            placeholder="name@domain.com"
            class="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Password
          </label>
          <input
            v-model="loginPassword"
            type="password"
            required
            placeholder="Enter account password"
            class="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            <RefreshCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <LogIn v-else class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Authenticating...' : 'Sign In' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
