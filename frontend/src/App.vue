<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Sun, Moon, Copy, Check, Menu, X,
  User, Trash2, Plus, LogIn, Mail
} from 'lucide-vue-next';
import { useSession } from './composables/useSession';
import { useTheme } from './composables/useTheme';
import AccountModal from './components/AccountModal.vue';

const route = useRoute();
const session = useSession();
const { isDark, toggleTheme } = useTheme();

const isRefreshing = ref(false);
const mobileMenuOpen = ref(false);
const isDropdownOpen = ref(false);
const dropdownRef = ref(null);

const copied = ref(false);
const copiedPassword = ref(false);

const showAccountModal = ref(false);
const accountModalMode = ref('create');

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const formattedStorage = computed(() => {
  return formatBytes(session.storageBytes.value);
});

const storagePercentage = computed(() => {
  const max = 40 * 1024 * 1024; // 40 MB
  const pct = (session.storageBytes.value / max) * 100;
  return Math.min(100, Math.max(0, pct)).toFixed(1);
});

async function handleRefresh() {
  isRefreshing.value = true;
  window.dispatchEvent(new CustomEvent('pvrge:refresh'));
  setTimeout(() => {
    isRefreshing.value = false;
  }, 600);
}

async function copyEmail(email) {
  const targetEmail = email || session.activeAccount.value?.email;
  if (!targetEmail) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(targetEmail);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = targetEmail;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (e) {
    console.error(e);
  }
}

async function copyPassword() {
  const pwd = session.activeAccount.value?.password;
  if (!pwd) return;
  try {
    await navigator.clipboard.writeText(pwd);
    copiedPassword.value = true;
    setTimeout(() => {
      copiedPassword.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy password:', e);
  }
}

function handleSwitch(id) {
  session.switchAccount(id);
  isDropdownOpen.value = false;
  handleRefresh();
}

function openCreateModal() {
  isDropdownOpen.value = false;
  accountModalMode.value = 'create';
  showAccountModal.value = true;
}

function openLoginModal() {
  isDropdownOpen.value = false;
  accountModalMode.value = 'login';
  showAccountModal.value = true;
}

async function handleDeleteAccount() {
  isDropdownOpen.value = false;
  if (confirm('Are you sure you want to delete this account and all its messages?')) {
    await session.deleteAccount();
    handleRefresh();
  }
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isDropdownOpen.value = false;
  }
}

onMounted(async () => {
  await session.initSession();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-100 antialiased dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- MOBILE SIDEBAR BACKDROP & DRAWER -->
    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-40 flex md:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
        @click="mobileMenuOpen = false"
      ></div>

      <div class="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4 dark:bg-gray-900 z-50">
        <div class="absolute top-0 right-0 -mr-12 pt-2">
          <button
            type="button"
            class="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none text-white"
            @click="mobileMenuOpen = false"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- Mobile Brand/Logo -->
        <div class="flex shrink-0 items-center px-4">
          <router-link to="/" @click="mobileMenuOpen = false" class="flex items-center gap-2">
            <span class="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              <span class="text-indigo-600 dark:text-indigo-400">pv</span>rge
            </span>
          </router-link>
        </div>

        <!-- Mobile Navigasi -->
        <nav class="mt-5 flex-1 space-y-1 px-2 overflow-y-auto">
          <router-link
            to="/"
            @click="mobileMenuOpen = false"
            class="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
            exact-active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="mr-3 size-6 shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Inbox
          </router-link>

          <button
            type="button"
            @click="handleRefresh(); mobileMenuOpen = false;"
            class="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="mr-3 size-6 shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300" :class="{ 'animate-spin': isRefreshing }">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </nav>

        <!-- Mobile Footer Links -->
        <div class="border-t border-gray-200 p-2 dark:border-gray-700">
          <router-link
            to="/faq"
            @click="mobileMenuOpen = false"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            FAQ
          </router-link>
          <router-link
            to="/privacy"
            @click="mobileMenuOpen = false"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            Privacy
          </router-link>
          <router-link
            to="/terms"
            @click="mobileMenuOpen = false"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            Terms
          </router-link>
          <router-link
            to="/contact"
            @click="mobileMenuOpen = false"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            Contacts
          </router-link>
        </div>

        <!-- Mobile Footer Copyright -->
        <div class="flex shrink-0 border-t border-gray-200 px-4 pt-4 dark:border-gray-700">
          <div class="mt-8 md:order-1 md:mt-0">
            <div class="flex flex-col justify-center md:order-2">
              <p class="text-center text-sm/6 text-gray-500 dark:text-gray-400"> © pvrge </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SIDEBAR KIRI (w-64) -->
    <div class="hidden md:flex md:shrink-0">
      <div class="flex w-64 flex-col overflow-y-auto border-r border-gray-200 bg-white pt-5 pb-4 dark:border-gray-700 dark:bg-gray-900">
        <!-- Brand/Logo -->
        <div class="flex shrink-0 items-center px-4">
          <router-link to="/" class="flex items-center gap-2">
            <span class="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              <span class="text-indigo-600 dark:text-indigo-400">pv</span>rge
            </span>
          </router-link>
        </div>

        <!-- Navigasi: Inbox, Refresh -->
        <nav class="mt-5 flex-1 space-y-1 px-2">
          <router-link
            to="/"
            class="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
            exact-active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="mr-3 size-6 shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Inbox
          </router-link>

          <button
            type="button"
            @click="handleRefresh"
            class="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="mr-3 size-6 shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300" :class="{ 'animate-spin': isRefreshing }">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </nav>

        <!-- Footer Links -->
        <div class="border-t border-gray-200 p-2 dark:border-gray-700">
          <router-link
            to="/faq"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            FAQ
          </router-link>
          <router-link
            to="/privacy"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            Privacy
          </router-link>
          <router-link
            to="/terms"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            Terms
          </router-link>
          <router-link
            to="/contact"
            class="group flex items-center rounded-md px-3 py-2 text-sm/5 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
            active-class="bg-gray-100 dark:bg-gray-800/75 text-gray-900 dark:text-white"
          >
            Contacts
          </router-link>
        </div>

        <!-- Footer Copyright -->
        <div class="flex shrink-0 border-t border-gray-200 px-4 pt-4 dark:border-gray-700">
          <div class="mt-8 md:order-1 md:mt-0">
            <div class="flex flex-col justify-center md:order-2">
              <p class="text-center text-sm/6 text-gray-500 dark:text-gray-400"> © pvrge </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- KONTEN KANAN -->
    <div class="flex w-0 flex-1 flex-col overflow-hidden">
      <!-- TOPBAR (h-16 shrink-0 border-b bg-white dark:bg-gray-900) -->
      <div class="relative flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 px-4 sm:px-6">
        <!-- Left: Mobile sidebar hamburger button -->
        <div class="flex items-center md:hidden mr-2">
          <button
            type="button"
            @click="mobileMenuOpen = true"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
          >
            <Menu class="h-6 w-6" />
          </button>
        </div>

        <!-- Top Navbar: Text Clickable Email & Envelope Icon -->
        <div class="flex-1 max-w-xl pr-2 sm:pr-4">
          <div class="relative inline-flex items-center">
            <button
              type="button"
              @click="copyEmail(session.activeAccount.value?.email)"
              class="group flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer text-left select-none max-w-full"
              title="Click to copy email address"
            >
              <Mail class="h-4 w-4 shrink-0 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200 transition" />
              <span class="truncate font-mono font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-200">
                {{ session.activeAccount.value?.email || 'Generating address...' }}
              </span>
              <Check v-if="copied" class="h-4 w-4 shrink-0 text-lime-500 ml-0.5" />
              <Copy v-else class="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-60 group-hover:opacity-100 ml-0.5 transition" />
            </button>

            <!-- Copied Tooltip Badge -->
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-1"
            >
              <div
                v-if="copied"
                class="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white shadow dark:bg-white dark:text-gray-900 z-50 pointer-events-none whitespace-nowrap"
              >
                Copied!
              </div>
            </transition>
          </div>
        </div>

        <!-- Right Controls: Theme toggle, Account dropdown trigger, Sign out / Delete account quick button -->
        <div class="flex items-center gap-1 sm:gap-2 shrink-0">
          <!-- Theme toggle -->
          <button
            @click="toggleTheme"
            class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
            :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <Sun v-if="isDark" class="h-5 w-5 text-amber-400" />
            <Moon v-else class="h-5 w-5 text-gray-500" />
          </button>

          <!-- Account dropdown trigger & popper -->
          <div class="relative" ref="dropdownRef">
            <button
              @click="isDropdownOpen = !isDropdownOpen"
              class="flex items-center gap-1 rounded-full p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              title="Manage Account"
            >
              <div class="relative flex items-center justify-center">
                <User class="h-5 w-5" />
                <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-lime-600 text-[10px] font-bold text-white shadow-sm">
                  {{ session.accounts.value.length || 1 }}
                </span>
              </div>
            </button>

            <!-- Account Dropdown Popper (Persis mail.tm) -->
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="isDropdownOpen"
                class="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 z-50 text-xs"
              >
                <!-- Header: Signed in as & Password -->
                <div class="border-b border-gray-200 pb-3 dark:border-gray-700">
                  <p class="text-[11px] text-gray-500 dark:text-gray-400">
                    You are signed in as:
                  </p>
                  <p class="text-xs font-semibold text-gray-900 dark:text-white truncate font-mono mt-0.5">
                    {{ session.activeAccount.value?.email || 'No account' }}
                  </p>

                  <div class="mt-2.5 flex items-center justify-between text-xs">
                    <span class="text-gray-500 dark:text-gray-400">Password:</span>
                    <div class="relative flex items-center gap-1.5">
                      <span
                        @click="copyPassword"
                        title="Click to copy password"
                        class="account-blur font-mono cursor-pointer select-all font-medium text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded transition"
                      >
                        {{ session.activeAccount.value?.password || '••••••••' }}
                      </span>
                      <span v-if="copiedPassword" class="text-[10px] font-bold text-lime-600 dark:text-lime-400 animate-pulse">
                        Copied!
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Daftar akun tersimpan untuk switch akun (if multiple) -->
                <div v-if="session.accounts.value.length > 1" class="py-2.5 border-b border-gray-200 dark:border-gray-700">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Switch Account
                  </p>
                  <div class="space-y-1 max-h-36 overflow-y-auto">
                    <button
                      v-for="acc in session.accounts.value"
                      :key="acc.id"
                      @click="handleSwitch(acc.id)"
                      class="w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      :class="[
                        acc.id === session.activeAccountId.value
                          ? 'font-semibold text-lime-600 dark:text-lime-400 bg-gray-50 dark:bg-gray-700/50'
                          : 'text-gray-700 dark:text-gray-300'
                      ]"
                    >
                      <span class="truncate font-mono text-[11px]">{{ acc.email }}</span>
                      <Check v-if="acc.id === session.activeAccountId.value" class="w-3.5 h-3.5 shrink-0 text-lime-500" />
                    </button>
                  </div>
                </div>

                <!-- Opsi: Create an account, Log in, Delete account -->
                <div class="pt-2 space-y-1">
                  <button
                    @click="openCreateModal"
                    class="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium transition"
                  >
                    <Plus class="w-4 h-4 text-lime-500" />
                    <span>Create an account</span>
                  </button>

                  <button
                    @click="openLoginModal"
                    class="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium transition"
                  >
                    <LogIn class="w-4 h-4 text-sky-500" />
                    <span>Log in</span>
                  </button>

                  <button
                    @click="handleDeleteAccount"
                    class="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400 font-medium transition"
                  >
                    <Trash2 class="w-4 h-4" />
                    <span>Delete account</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- Sign out / Delete account quick button -->
          <button
            @click="handleDeleteAccount"
            title="Delete active account"
            class="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition"
          >
            <Trash2 class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- MAIN CONTENT (overflow-y-auto py-6 px-4 sm:px-6 md:px-8) -->
      <main class="relative z-0 flex-1 overflow-y-auto py-6 px-4 sm:px-6 md:px-8 focus:outline-none flex flex-col">
        <router-view />
      </main>
    </div>

    <!-- Modals -->
    <AccountModal
      :isOpen="showAccountModal"
      :initialMode="accountModalMode"
      @close="showAccountModal = false"
      @account-ready="handleRefresh"
    />
  </div>
</template>
