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

const activeAccount = session.activeAccount;
const accounts = session.accounts;

function handleCopyEmail() {
  copyEmail(activeAccount.value?.email);
}

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

function switchAccount(id) {
  session.switchAccount(id);
  isDropdownOpen.value = false;
  handleRefresh();
}
const handleSwitch = switchAccount;

function handleCreateAccount() {
  isDropdownOpen.value = false;
  accountModalMode.value = 'create';
  showAccountModal.value = true;
}
const openCreateModal = handleCreateAccount;

function openLoginModal() {
  isDropdownOpen.value = false;
  accountModalMode.value = 'login';
  showAccountModal.value = true;
}

async function handleDeleteCurrentAccount() {
  isDropdownOpen.value = false;
  if (confirm('Are you sure you want to delete this account and all its messages?')) {
    await session.deleteAccount();
    handleRefresh();
  }
}
const handleDeleteAccount = handleDeleteCurrentAccount;

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
      <!-- TOPBAR -->
      <div class="relative z-10 flex h-16 shrink-0 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <!-- Mobile sidebar hamburger button -->
        <button
          type="button"
          class="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden dark:border-gray-700 dark:text-gray-400"
          @click="mobileMenuOpen = true"
        >
          <span class="sr-only">Open sidebar</span>
          <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div class="flex flex-1 justify-between px-4 sm:px-6 md:px-8">
          <!-- Email Input Container -->
          <div class="flex flex-1">
            <div class="flex w-full ring-0 md:ml-0">
              <label for="Dont_use_WEB_use_API_OK" class="sr-only">Email</label>
              <div class="group relative w-full text-gray-400 flex items-center">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
                  <svg class="size-5 text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <input
                  id="Dont_use_WEB_use_API_OK"
                  placeholder="..."
                  class="block size-full cursor-pointer border-transparent py-2 pr-3 pl-8 text-gray-600 select-all group-hover:text-gray-900 focus:border-transparent focus:placeholder-gray-400 focus:ring-0 focus:outline-none sm:text-sm dark:bg-gray-900 dark:text-gray-300 dark:group-hover:text-gray-400 font-mono"
                  readonly
                  type="email"
                  :value="activeAccount?.email || 'Generating...'"
                  @click="handleCopyEmail"
                />
                <span v-if="copied" class="ml-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">Copied!</span>
              </div>
            </div>
          </div>

          <!-- Sisi Kanan -->
          <div class="flex items-center sm:ml-4 md:ml-6">
            <!-- Dark/Light mode toggle button dengan SVG sun/moon -->
            <button
              type="button"
              @click="toggleTheme"
              class="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:hover:text-gray-300"
              :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            >
              <span class="sr-only">Toggle theme</span>
              <svg v-if="isDark" class="size-6 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
              <svg v-else class="size-6 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            </button>

            <!-- Account switcher dropdown trigger button dengan avatar bulat menampilkan jumlah sesi (contoh: badge {{ accounts.length }}) -->
            <div class="relative ml-3" ref="dropdownRef">
              <div>
                <button
                  type="button"
                  @click="isDropdownOpen = !isDropdownOpen"
                  class="relative flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800"
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                  title="Manage Accounts"
                >
                  <span class="sr-only">Open user menu</span>
                  <div class="relative flex items-center justify-center">
                    <span class="inline-flex size-8 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-600 text-white">
                      <svg class="size-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <span class="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
                      {{ accounts.length || 1 }}
                    </span>
                  </div>
                </button>
              </div>

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
                  class="absolute right-0 top-full mt-2 z-50 min-w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden flex flex-col w-56 divide-y divide-gray-100 dark:divide-gray-700 text-left"
                >
                  <!-- Group 1: Info Akun Aktif -->
                  <div class="p-1 isolate max-h-96 overflow-y-auto">
                    <div class="p-1.5 text-sm">
                      <div class="max-h-48 text-left break-all space-y-0.5">
                        <p class="text-xs text-gray-500 dark:text-gray-400">You are signed in as:</p>
                        <p class="cursor-pointer text-sm font-medium text-gray-800 select-all dark:text-gray-200 truncate">{{ activeAccount?.email }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Password:
                          <span class="cursor-pointer select-all account-blur hover:filter-none transition-all font-mono font-medium text-gray-800 dark:text-gray-200">
                            {{ activeAccount?.password || '••••••••' }}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Group 2: Daftar Akun Lain (Multi-Session Switcher) -->
                  <div v-if="accounts.length > 1" class="p-1 isolate max-h-96 overflow-y-auto space-y-0.5">
                    <button
                      v-for="acc in accounts.filter(a => a.id !== activeAccount?.id)"
                      :key="acc.id"
                      type="button"
                      @click="switchAccount(acc.id)"
                      class="group relative w-full flex items-center select-none outline-none rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 p-1.5 text-sm gap-2 transition-colors text-left"
                    >
                      <span class="inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle size-6 text-xs bg-amber-200 dark:bg-amber-700 font-medium text-gray-700 dark:text-gray-200">
                        {{ acc.email.charAt(0).toUpperCase() }}
                      </span>
                      <span class="truncate text-gray-700 dark:text-gray-300 text-sm">{{ acc.email }}</span>
                    </button>
                  </div>

                  <!-- Group 3: Menu Aksi Akun -->
                  <div class="p-1 isolate max-h-96 overflow-y-auto space-y-0.5">
                    <!-- Create an account -->
                    <button
                      type="button"
                      @click="handleCreateAccount"
                      class="w-full flex items-center select-none outline-none rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-1.5 text-sm gap-2 text-indigo-600 dark:text-indigo-400 transition-colors text-left"
                    >
                      <User class="size-4 shrink-0" />
                      <span class="truncate font-medium">Create an account</span>
                    </button>

                    <!-- Log in -->
                    <button
                      type="button"
                      @click="openLoginModal"
                      class="w-full flex items-center select-none outline-none rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 p-1.5 text-sm gap-2 text-blue-600 dark:text-blue-400 transition-colors text-left"
                    >
                      <LogIn class="size-4 shrink-0" />
                      <span class="truncate font-medium">Log in</span>
                    </button>

                    <!-- Delete account -->
                    <button
                      type="button"
                      @click="handleDeleteCurrentAccount"
                      class="w-full flex items-center select-none outline-none rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1.5 text-sm gap-2 text-rose-600 dark:text-rose-400 transition-colors text-left"
                    >
                      <Trash2 class="size-4 shrink-0" />
                      <span class="truncate font-medium">Delete account</span>
                    </button>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Sign out button (ikon arrow-right-start-on-rectangle) untuk menghapus/logout akun aktif -->
            <button
              type="button"
              @click="handleDeleteAccount"
              title="Delete active account"
              class="ml-3 rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:hover:text-gray-300"
            >
              <span class="sr-only">Sign out</span>
              <svg class="size-6 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
            </button>
          </div>
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
