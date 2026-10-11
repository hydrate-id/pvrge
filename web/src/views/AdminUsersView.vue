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
import Envelope from '@primeicons/vue/envelope';
import Times from '@primeicons/vue/times';
import Trash from '@primeicons/vue/trash';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const router = useRouter();
const session = useSession();

const users = ref([]);
const totalCount = ref(0);
const isLoading = ref(false);
const error = ref(null);
const searchQuery = ref('');
const copiedId = ref(null);
const userToDelete = ref(null);
const isDeleting = ref(false);

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter((u) => u.email.toLowerCase().includes(q));
});

function openDeleteDialog(user) {
  if (user.email === 'support@pvrge.com') return;
  userToDelete.value = user;
}

async function confirmDeleteUser() {
  if (!userToDelete.value) return;

  if (!session.isDutyActive.value) {
    error.value = 'Not authenticated. Please log in as an administrator.';
    return;
  }

  isDeleting.value = true;
  try {
    const res = await fetch(`/api/admin/users/${userToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to delete user (HTTP ${res.status})`);
    }

    users.value = users.value.filter((u) => u.id !== userToDelete.value.id);
    totalCount.value = Math.max(0, totalCount.value - 1);
    userToDelete.value = null;
  } catch (err) {
    error.value = err.message || 'Failed to delete user.';
  } finally {
    isDeleting.value = false;
  }
}

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
  if (!session.isDutyActive.value) {
    error.value = 'Not authenticated. Please log in as an administrator.';
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch('/api/admin/users');

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
  <div class="w-full space-y-4">
    <!-- Header Bar Ringkas (sejajar dalam satu baris) -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- Kiri: Title & Badge -->
      <div class="flex items-center gap-2.5">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Users
        </h2>
        <span
          class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
        >
          {{ totalCount }}
        </span>
      </div>

      <!-- Kanan: Toolbar gabungan -->
      <div class="flex items-center gap-2">
        <div class="relative w-full sm:w-64">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
            <Search class="size-3.5" />
          </div>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search users..."
            class="block w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-7 text-xs text-gray-900 placeholder:text-gray-400 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <Times class="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          @click="fetchUsers"
          :disabled="isLoading"
          class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition"
        >
          <Refresh class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
      role="alert"
    >
      <div class="flex items-start gap-2">
        <svg class="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">{{ error }}</span>
      </div>
      <router-link
        v-if="!session.isDutyActive.value || error.includes('Admin')"
        to="/onduty/login"
        class="font-semibold text-rose-900 underline hover:text-rose-700 dark:text-rose-200"
      >
        Go to Login
      </router-link>
    </div>

    <!-- Tabel Card (Mail.tm list style) -->
    <div class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700/60">
          <thead class="bg-gray-50/80 dark:bg-gray-800/90 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th scope="col" class="py-2.5 px-4">User & Email</th>
              <th scope="col" class="hidden md:table-cell py-2.5 px-4">Account ID</th>
              <th scope="col" class="py-2.5 px-4 text-center">Messages</th>
              <th scope="col" class="py-2.5 px-4 text-right">Created At</th>
              <th scope="col" class="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700/60 font-normal">
            <!-- Loading State -->
            <tr v-if="isLoading && users.length === 0">
              <td colspan="5" class="py-12 text-center">
                <div class="flex flex-col items-center justify-center gap-2">
                  <Spinner class="size-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span class="text-xs text-gray-500 dark:text-gray-400">Loading registered users...</span>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="5" class="py-12 text-center text-xs text-gray-500 dark:text-gray-400">
                <span v-if="searchQuery">No matching users found for "{{ searchQuery }}"</span>
                <span v-else>No registered users found</span>
              </td>
            </tr>

            <!-- User Rows -->
            <tr
              v-else
              v-for="user in filteredUsers"
              :key="user.id"
              class="py-2.5 px-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <!-- Kolom User & Email -->
              <td class="py-2.5 px-4">
                <div class="flex items-center gap-2.5">
                  <!-- Avatar bulat inisial compact -->
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime-200 dark:bg-lime-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {{ (user.email?.[0] || 'U').toUpperCase() }}
                  </div>

                  <!-- Monospace email text -->
                  <span class="font-mono text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[200px] sm:max-w-none">
                    {{ user.email }}
                  </span>

                  <!-- Badge role (Admin / User) -->
                  <span
                    v-if="user.email === 'support@pvrge.com'"
                    class="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  >
                    Admin
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
                  >
                    User
                  </span>

                  <!-- Tombol copy email dengan feedback checkmark -->
                  <button
                    type="button"
                    @click="handleCopy(user.email, `email-${user.id}`)"
                    class="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition"
                    :title="copiedId === `email-${user.id}` ? 'Copied!' : 'Copy email'"
                  >
                    <Check v-if="copiedId === `email-${user.id}`" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <Copy v-else class="size-3.5" />
                  </button>
                </div>
              </td>

              <!-- Kolom Account ID -->
              <td class="hidden md:table-cell py-2.5 px-4">
                <div class="flex items-center gap-1.5">
                  <span
                    class="max-w-[130px] truncate font-mono text-xs text-gray-500 dark:text-gray-400"
                    :title="user.id"
                  >
                    {{ user.id }}
                  </span>
                  <button
                    type="button"
                    @click="handleCopy(user.id, `id-${user.id}`)"
                    class="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition"
                    :title="copiedId === `id-${user.id}` ? 'Copied!' : 'Copy ID'"
                  >
                    <Check v-if="copiedId === `id-${user.id}`" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <Copy v-else class="size-3.5" />
                  </button>
                </div>
              </td>

              <!-- Kolom Messages -->
              <td class="py-2.5 px-4 text-center">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="user.message_count > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'"
                >
                  <Envelope class="size-3" />
                  {{ user.message_count }}
                </span>
              </td>

              <!-- Kolom Created At -->
              <td class="py-2.5 px-4 text-right whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                {{ formatDate(user.created_at) }}
              </td>

              <!-- Kolom Actions -->
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <button
                  v-if="user.email !== 'support@pvrge.com'"
                  type="button"
                  @click="openDeleteDialog(user)"
                  class="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition"
                  title="Delete user"
                >
                  <Trash class="size-3.5" />
                </button>
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary Footer Card -->
      <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400">
        Showing {{ filteredUsers.length }} of {{ users.length }} users
      </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <AlertDialog :open="!!userToDelete" @update:open="(open) => { if (!open) userToDelete = null; }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span class="font-semibold text-gray-900 dark:text-white">{{ userToDelete?.email }}</span>? All messages and attachments associated with this account will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeleting">Cancel</AlertDialogCancel>
          <AlertDialogAction
            @click="confirmDeleteUser"
            :disabled="isDeleting"
            class="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Spinner v-if="isDeleting" class="size-3.5 animate-spin mr-1.5" />
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
