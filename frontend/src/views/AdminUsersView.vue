<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../composables/useSession';
import { copyText } from '../utils/clipboard';
import Search from '@primeicons/vue/search';
import Refresh from '@primeicons/vue/refresh';
import Copy from '@primeicons/vue/copy';
import Check from '@primeicons/vue/check';
import Spinner from '@primeicons/vue/spinner';
import Users from '@primeicons/vue/users';
import Envelope from '@primeicons/vue/envelope';

const router = useRouter();
const session = useSession();
const { activeAccount, dutySession } = session;

const users = ref([]);
const totalCount = ref(0);
const isLoading = ref(false);
const error = ref(null);
const searchQuery = ref('');
const copiedId = ref(null);

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter((u) => u.email.toLowerCase().includes(q));
});

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

async function handleCopy(text, id) {
  const ok = await copyText(text);
  if (ok) {
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) {
        copiedId.value = null;
      }
    }, 2000);
  }
}

async function fetchUsers() {
  const token = dutySession?.value?.token || activeAccount.value?.token;
  if (!token) {
    error.value = 'Not authenticated. Please log in as an administrator.';
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch('/api/admin/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      error.value = 'Admin privileges required. Access denied.';
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to fetch users (HTTP ${res.status})`);
    }

    const data = await res.json();
    users.value = data.users || [];
    totalCount.value = data.total ?? users.value.length;
  } catch (err) {
    error.value = err.message || 'An error occurred while fetching users.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <div class="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
          <Users class="size-6" />
        </div>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Registered Users
            </h1>
            <span
              class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
            >
              {{ totalCount }} {{ totalCount === 1 ? 'User' : 'Users' }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of all generated email inboxes and activity metrics.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="fetchUsers"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition"
        >
          <Refresh class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="mb-6 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <svg class="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">{{ error }}</span>
      </div>
      <router-link
        v-if="!(dutySession?.value?.token || activeAccount?.value?.token) || error.includes('Admin')"
        to="/onduty/login"
        class="font-semibold text-rose-900 underline hover:text-rose-700 dark:text-rose-200"
      >
        Go to Login
      </router-link>
    </div>

    <!-- Search Toolbar -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
          <Search class="size-4" />
        </div>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Filter users by email address..."
          class="block w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
        />
        <button
          v-if="searchQuery"
          type="button"
          @click="searchQuery = ''"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          Clear
        </button>
      </div>
      <div v-if="searchQuery" class="text-xs text-gray-500 dark:text-gray-400">
        Showing {{ filteredUsers.length }} of {{ users.length }}
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && users.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900"
    >
      <Spinner class="size-8 animate-spin text-emerald-600 dark:text-emerald-400" />
      <p class="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
        Loading registered users...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredUsers.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 px-4 text-center dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="inline-flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 mb-4">
        <Users class="size-7" />
      </div>
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">
        {{ searchQuery ? 'No matching users found' : 'No registered users' }}
      </h3>
      <p class="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {{ searchQuery ? `No email matches "${searchQuery}". Try a different keyword.` : 'There are currently no registered users in the database.' }}
      </p>
      <button
        v-if="searchQuery"
        type="button"
        @click="searchQuery = ''"
        class="mt-4 inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
      >
        Clear filter
      </button>
    </div>

    <!-- Table / Card List -->
    <div
      v-else
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
          <thead class="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
            <tr>
              <th scope="col" class="py-3.5 pl-6 pr-3">User & Email</th>
              <th scope="col" class="px-3 py-3.5">Account ID</th>
              <th scope="col" class="px-3 py-3.5 text-center">Messages</th>
              <th scope="col" class="py-3.5 pl-3 pr-6 text-right">Created At</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800 font-normal">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
            >
              <!-- Email + Badge + Copy -->
              <td class="py-4 pl-6 pr-3">
                <div class="flex items-center gap-3">
                  <span class="font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {{ user.email }}
                  </span>
                  <!-- Badge Admin / User -->
                  <span
                    v-if="user.email === 'support@pvrge.com'"
                    class="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                  >
                    Admin
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    User
                  </span>
                  <!-- Copy Button -->
                  <button
                    type="button"
                    @click="handleCopy(user.email, user.id)"
                    class="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
                    :title="copiedId === user.id ? 'Copied!' : 'Copy email'"
                  >
                    <Check v-if="copiedId === user.id" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <Copy v-else class="size-3.5" />
                  </button>
                </div>
              </td>

              <!-- Account ID (monospace truncate) -->
              <td class="px-3 py-4">
                <div class="flex items-center gap-1.5">
                  <span
                    class="max-w-[130px] truncate font-mono text-xs text-gray-500 dark:text-gray-400"
                    :title="user.id"
                  >
                    {{ user.id }}
                  </span>
                </div>
              </td>

              <!-- Message Count -->
              <td class="px-3 py-4 text-center">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="user.message_count > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
                >
                  <Envelope class="size-3" />
                  {{ user.message_count }}
                </span>
              </td>

              <!-- Created At -->
              <td class="py-4 pl-3 pr-6 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ formatDate(user.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
