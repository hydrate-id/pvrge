<script setup>
import { ref, watch } from 'vue';
import { useSession } from '../composables/useSession';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UserPlus from '@primeicons/vue/user-plus';
import SignIn from '@primeicons/vue/sign-in';
import Times from '@primeicons/vue/times';
import ExclamationCircle from '@primeicons/vue/exclamation-circle';
import Sparkles from '@primeicons/vue/sparkles';
import Spinner from '@primeicons/vue/spinner';

const props = defineProps({
  isOpen: Boolean,
  initialMode: {
    type: String,
    default: 'create', // 'create' or 'login'
  },
});

const emit = defineEmits(['close', 'account-ready']);
const session = useSession();

const mode = ref('create');

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

watch(
  () => props.initialMode,
  (newVal) => {
    mode.value = newVal || 'create';
  }
);

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      errorMsg.value = '';
      loadDomains();
    }
  }
);

async function loadDomains() {
  const list = await session.fetchDomains();
  domains.value = list;
  if (list.length > 0 && !selectedDomain.value) {
    selectedDomain.value = list[0].id;
  }
}

async function handleCreate() {
  isSubmitting.value = true;
  errorMsg.value = '';
  try {
    const payload = {};
    if (username.value.trim()) payload.username = username.value.trim().toLowerCase();
    if (selectedDomain.value && selectedDomain.value !== 'default') payload.domain = selectedDomain.value;
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
  if (!loginEmail.value || !loginPassword.value) {
    errorMsg.value = 'Email and password are required';
    return;
  }

  isSubmitting.value = true;
  errorMsg.value = '';
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
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div class="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
      <!-- Close button -->
      <button
        @click="emit('close')"
        class="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition"
        aria-label="Close modal"
      >
        <Times class="size-4" />
      </button>

      <!-- Tabs header -->
      <div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-5">
        <button
          type="button"
          @click="mode = 'create'; errorMsg = ''"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition',
            mode === 'create'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
        >
          <UserPlus class="size-4 shrink-0" />
          <span>New Account</span>
        </button>

        <button
          type="button"
          @click="mode = 'login'; errorMsg = ''"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition',
            mode === 'login'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
        >
          <SignIn class="size-4 shrink-0" />
          <span>Log In</span>
        </button>
      </div>

      <!-- Error alert -->
      <div v-if="errorMsg" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-lg flex items-center gap-2">
        <ExclamationCircle class="size-4 shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Tab 1: Create Account Form -->
      <form v-if="mode === 'create'" @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Custom Username (optional)
          </label>
          <input
            v-model="username"
            type="text"
            placeholder="Leave blank for random (e.g. swiftfox42)"
            pattern="[a-z0-9]{3,32}"
            class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
          <span class="text-[11px] text-gray-400 mt-1 block">3-32 lowercase letters and numbers</span>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Domain
          </label>
          <Select v-model="selectedDomain">
            <SelectTrigger
              class="w-full h-[42px] px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between"
            >
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent position="popper" class="w-full min-w-[var(--reka-select-trigger-width)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg z-50">
              <SelectItem
                v-for="d in domains"
                :key="d.id"
                :value="d.id"
                class="font-mono text-sm py-2 px-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded"
              >
                @{{ d.id }}
              </SelectItem>
              <SelectItem v-if="domains.length === 0" value="default" class="font-mono text-sm py-2 px-3">
                @pvrge.com
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Custom Password (optional)
          </label>
          <input
            v-model="password"
            type="password"
            placeholder="Leave blank for auto-generated"
            class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            <Spinner v-if="isSubmitting" class="size-4 animate-spin" />
            <Sparkles v-else class="size-4" />
            <span>{{ isSubmitting ? 'Generating...' : 'Create Inbox' }}</span>
          </button>
        </div>
      </form>

      <!-- Tab 2: Login Existing Form -->
      <form v-else @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Email Address
          </label>
          <input
            v-model="loginEmail"
            type="email"
            required
            placeholder="name@domain.com"
            class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Password
          </label>
          <input
            v-model="loginPassword"
            type="password"
            required
            placeholder="Enter account password"
            class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            <Spinner v-if="isSubmitting" class="size-4 animate-spin" />
            <SignIn v-else class="size-4 shrink-0" />
            <span>{{ isSubmitting ? 'Authenticating...' : 'Sign In' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
