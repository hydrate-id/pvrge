<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  Copy, Check, RefreshCw, Key, Moon, Sun, 
  ChevronDown, Plus, LogIn, Trash2, CheckCircle2, ShieldCheck
} from 'lucide-vue-next';
import { useSession } from '../composables/useSession';
import { useTheme } from '../composables/useTheme';
import PasswordModal from './PasswordModal.vue';
import AccountModal from './AccountModal.vue';

const props = defineProps({
  isRefreshing: Boolean,
});

const emit = defineEmits(['refresh']);

const session = useSession();
const { isDark, toggleTheme } = useTheme();

const copied = ref(false);
const isDropdownOpen = ref(false);
const showPasswordModal = ref(false);
const showAccountModal = ref(false);
const accountModalMode = ref('create');

const dropdownRef = ref(null);

async function copyEmail() {
  if (!session.activeAccount.value?.email) return;
  try {
    await navigator.clipboard.writeText(session.activeAccount.value.email);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy email', e);
  }
}

function handleSwitch(id) {
  session.switchAccount(id);
  isDropdownOpen.value = false;
  emit('refresh');
}

function openCreateModal() {
  accountModalMode.value = 'create';
  showAccountModal.value = true;
  isDropdownOpen.value = false;
}

function openLoginModal() {
  accountModalMode.value = 'login';
  showAccountModal.value = true;
  isDropdownOpen.value = false;
}

async function handleDeleteAccount() {
  if (confirm('Are you sure you want to delete this inbox and all its messages? This action cannot be undone.')) {
    isDropdownOpen.value = false;
    await session.deleteAccount();
    emit('refresh');
  }
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      
      <!-- Logo / Brand -->
      <router-link to="/" class="flex items-center gap-2 group shrink-0">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition duration-200">
          <span class="font-extrabold text-lg tracking-tighter">pv</span>
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none">pvrge</span>
          <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium tracking-wider uppercase">temp mail</span>
        </div>
      </router-link>

      <!-- Active email card with 1-click copy -->
      <div class="flex-1 max-w-xl mx-2 hidden sm:block">
        <div class="relative flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 transition">
          <div class="flex-1 truncate mr-2">
            <span class="text-xs text-slate-400 dark:text-slate-500 block leading-tight font-medium">Your Disposable Address</span>
            <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono tracking-tight select-all">
              {{ session.activeAccount.value?.email || 'Generating address...' }}
            </span>
          </div>

          <!-- Copy Button -->
          <button
            @click="copyEmail"
            :disabled="!session.activeAccount.value"
            class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            title="Click to copy email address"
          >
            <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-200" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
          </button>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Manual Refresh Button -->
        <button
          @click="emit('refresh')"
          :disabled="isRefreshing"
          class="p-2 sm:px-3 sm:py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title="Refresh Inbox"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin text-emerald-500': isRefreshing }" />
          <span class="hidden md:inline">Refresh</span>
        </button>

        <!-- Password Modal Trigger -->
        <button
          @click="showPasswordModal = true"
          :disabled="!session.activeAccount.value"
          class="p-2 sm:px-3 sm:py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:opacity-50"
          title="View account password"
        >
          <Key class="w-4 h-4 text-amber-500" />
          <span class="hidden md:inline">Password</span>
        </button>

        <!-- Account Switcher Dropdown -->
        <div class="relative" ref={dropdownRef}>
          <button
            @click="isDropdownOpen = !isDropdownOpen"
            class="flex items-center gap-1.5 px-2.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-medium transition"
            title="Manage Accounts"
          >
            <span class="max-w-[110px] sm:max-w-[140px] truncate font-mono">
              {{ session.activeAccount.value ? session.activeAccount.value.email.split('@')[0] : 'Account' }}
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isDropdownOpen }" />
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="isDropdownOpen"
            class="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-fade-in"
          >
            <div class="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Saved Sessions ({{ session.accounts.value.length }})
            </div>

            <!-- List of accounts -->
            <div class="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              <button
                v-for="acc in session.accounts.value"
                :key="acc.id"
                @click="handleSwitch(acc.id)"
                class="w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
              >
                <div class="truncate mr-2">
                  <div class="text-xs font-medium text-slate-900 dark:text-slate-100 truncate font-mono">
                    {{ acc.email }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    ID: {{ acc.id.slice(0, 8) }}...
                  </div>
                </div>
                <CheckCircle2
                  v-if="acc.id === session.activeAccountId.value"
                  class="w-4 h-4 text-emerald-500 shrink-0"
                />
              </button>
            </div>

            <div class="border-t border-slate-200 dark:border-slate-800 mt-2 pt-1.5 px-1 space-y-1">
              <button
                @click="openCreateModal"
                class="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition"
              >
                <Plus class="w-4 h-4 text-emerald-500" />
                <span>Create New Account</span>
              </button>
              <button
                @click="openLoginModal"
                class="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition"
              >
                <LogIn class="w-4 h-4 text-sky-500" />
                <span>Login Existing</span>
              </button>
              <button
                @click="handleDeleteAccount"
                class="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2 transition"
              >
                <Trash2 class="w-4 h-4" />
                <span>Delete Active Account</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          class="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-slate-600" />
        </button>

      </div>
    </div>

    <!-- Mobile active email bar (visible only on mobile) -->
    <div class="sm:hidden px-4 py-2 bg-slate-100/90 dark:bg-slate-800/80 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
      <div class="truncate">
        <span class="text-[10px] text-slate-400 block font-medium">Active Mailbox:</span>
        <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate block select-all">
          {{ session.activeAccount.value?.email || 'Generating address...' }}
        </span>
      </div>
      <button
        @click="copyEmail"
        :disabled="!session.activeAccount.value"
        class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white shrink-0 active:scale-95"
      >
        <Check v-if="copied" class="w-3 h-3 text-emerald-200" />
        <Copy v-else class="w-3 h-3" />
        <span>{{ copied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>

    <!-- Modals -->
    <PasswordModal
      :isOpen="showPasswordModal"
      :email="session.activeAccount.value?.email"
      :password="session.activeAccount.value?.password"
      @close="showPasswordModal = false"
    />

    <AccountModal
      :isOpen="showAccountModal"
      :initialMode="accountModalMode"
      @close="showAccountModal = false"
      @account-ready="emit('refresh')"
    />
  </header>
</template>
