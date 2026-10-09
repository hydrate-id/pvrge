<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Inbox, Mail, Trash2, Paperclip, RefreshCw, ChevronLeft,
  ChevronRight, ArrowDownCircle, FileText, Code2, Loader2
} from 'lucide-vue-next';
import { useSession } from '../composables/useSession';

const session = useSession();

const messages = ref([]);
const selectedMessageId = ref(null);
const selectedMessageDetail = ref(null);
const isLoadingList = ref(false);
const isLoadingDetail = ref(false);
const isDeleting = ref(false);
const isDownloadingAttachment = ref({});
const viewMode = ref('html'); // 'html' or 'text'
const readMessageIds = ref(new Set());

// Load read states from localStorage
try {
  const storedReads = localStorage.getItem('pvrge_read_ids');
  if (storedReads) {
    readMessageIds.value = new Set(JSON.parse(storedReads));
  }
} catch (e) {
  console.warn('Failed to load read message ids:', e);
}

function markAsRead(id) {
  if (!id) return;
  readMessageIds.value.add(id);
  try {
    localStorage.setItem('pvrge_read_ids', JSON.stringify([...readMessageIds.value]));
  } catch (e) {
    console.warn('Failed to save read message ids:', e);
  }
}

function getInitial(sender) {
  if (!sender) return 'U';
  const clean = sender.trim().replace(/^["'<]+/, '');
  return clean ? clean.charAt(0).toUpperCase() : 'U';
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function fetchMessages(quiet = false) {
  const token = session.activeAccount.value?.token;
  if (!token) return;

  if (!quiet) isLoadingList.value = true;
  try {
    const res = await fetch('/api/messages', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    messages.value = data.messages || [];

    // Calculate total size for storage indicator
    const totalBytes = messages.value.reduce((acc, m) => acc + (m.size || 0), 0);
    session.setStorageBytes(totalBytes);

    // If selected message is no longer in list, clear selection
    if (selectedMessageId.value && !messages.value.find((m) => m.id === selectedMessageId.value)) {
      selectedMessageId.value = null;
      selectedMessageDetail.value = null;
    }
  } catch (err) {
    console.error('Error fetching messages:', err);
  } finally {
    if (!quiet) isLoadingList.value = false;
  }
}

async function fetchMessageDetail(id) {
  const token = session.activeAccount.value?.token;
  if (!token || !id) return;

  isLoadingDetail.value = true;
  try {
    const res = await fetch(`/api/messages/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch message detail');
    const data = await res.json();
    selectedMessageDetail.value = data.message;
    markAsRead(id);
    viewMode.value = data.message.body_html ? 'html' : 'text';
  } catch (err) {
    console.error('Error fetching message detail:', err);
    selectedMessageDetail.value = null;
  } finally {
    isLoadingDetail.value = false;
  }
}

function selectMessage(msg) {
  selectedMessageId.value = msg.id;
  fetchMessageDetail(msg.id);
}

function deselectMessage() {
  selectedMessageId.value = null;
  selectedMessageDetail.value = null;
}

async function deleteSelectedMessage() {
  const token = session.activeAccount.value?.token;
  const id = selectedMessageId.value;
  if (!token || !id || isDeleting.value) return;

  if (!confirm('Are you sure you want to delete this message?')) return;

  isDeleting.value = true;
  try {
    const res = await fetch(`/api/messages/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to delete message');

    messages.value = messages.value.filter((m) => m.id !== id);
    const totalBytes = messages.value.reduce((acc, m) => acc + (m.size || 0), 0);
    session.setStorageBytes(totalBytes);
    deselectMessage();
  } catch (err) {
    alert('Failed to delete message: ' + err.message);
  } finally {
    isDeleting.value = false;
  }
}

async function downloadAttachment(att) {
  const token = session.activeAccount.value?.token;
  const msgId = selectedMessageId.value;
  if (!token || !msgId || !att?.id) return;

  isDownloadingAttachment.value[att.id] = true;
  try {
    const res = await fetch(`/api/messages/${msgId}/attachments/${att.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Download failed');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.filename || 'attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Failed to download attachment: ' + err.message);
  } finally {
    isDownloadingAttachment.value[att.id] = false;
  }
}

const iframeContent = computed(() => {
  if (!selectedMessageDetail.value) return '';
  if (viewMode.value === 'text') {
    const text = selectedMessageDetail.value.body_text || '(No text content)';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: pre-wrap; word-break: break-word; padding: 1.5rem; color: #1e293b; line-height: 1.6; font-size: 14px; } @media (prefers-color-scheme: dark) { body { color: #f1f5f9; background: #0f172a; } }</style></head><body>${escaped}</body></html>`;
  }
  return selectedMessageDetail.value.body_html || selectedMessageDetail.value.body_text || '<p class="text-gray-400 p-4">No content</p>';
});

// Adaptive Polling: 4s active tab, 30s background tab
let pollTimer = null;

function scheduleNextPoll() {
  if (pollTimer) clearTimeout(pollTimer);
  const interval = document.visibilityState === 'visible' ? 4000 : 30000;
  pollTimer = setTimeout(async () => {
    if (session.activeAccount.value) {
      await fetchMessages(true);
    }
    scheduleNextPoll();
  }, interval);
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    fetchMessages(true);
  }
  scheduleNextPoll();
}

function handleExternalRefresh() {
  fetchMessages(false);
}

watch(
  () => session.activeAccountId.value,
  (newId) => {
    selectedMessageId.value = null;
    selectedMessageDetail.value = null;
    if (newId) {
      fetchMessages(false);
    } else {
      messages.value = [];
      session.setStorageBytes(0);
    }
  }
);

onMounted(() => {
  if (session.activeAccount.value) {
    fetchMessages(false);
  }
  scheduleNextPoll();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pvrge:refresh', handleExternalRefresh);
});

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pvrge:refresh', handleExternalRefresh);
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-4">
    <!-- ================= 1. TAMPILAN LIST (Saat tidak ada email dipilih) ================= -->
    <div v-if="!selectedMessageId">
      <!-- Header: Inbox -->
      <div class="mb-4 sm:flex sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
            Inbox
          </h1>
          <span
            v-if="messages.length > 0"
            class="inline-flex items-center rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-semibold text-lime-800 dark:bg-lime-900/60 dark:text-lime-200"
          >
            {{ messages.length }}
          </span>
        </div>

        <div class="mt-3 sm:mt-0 flex items-center gap-2">
          <button
            @click="fetchMessages(false)"
            :disabled="isLoadingList"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/80 transition disabled:opacity-50"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingList }" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoadingList && messages.length === 0"
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75 p-12 text-center"
      >
        <Loader2 class="mx-auto h-8 w-8 animate-spin text-lime-500 mb-2" />
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading mailbox...</p>
      </div>

      <!-- Empty State: Belum ada email -->
      <div
        v-else-if="messages.length === 0"
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75 p-12 text-center"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime-100 dark:bg-lime-900/40 text-lime-600 dark:text-lime-400 mb-4">
          <Mail class="h-7 w-7" />
        </div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Your inbox is empty</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Waiting for incoming emails. Send a message to your address above to view it here.
        </p>
      </div>

      <!-- Card list: bg-white shadow sm:rounded-md dark:bg-gray-800/75 divide-y divide-gray-200 dark:divide-gray-700/50 -->
      <div
        v-else
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75 divide-y divide-gray-200 dark:divide-gray-700/50"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          @click="selectMessage(msg)"
          class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition flex items-center px-4 py-4 sm:px-6 gap-4"
        >
          <!-- Tiap email: Avatar initial bulat (size-11 rounded-full bg-lime-200 dark:bg-lime-700) -->
          <div class="h-11 w-11 rounded-full bg-lime-200 dark:bg-lime-700 text-lime-900 dark:text-lime-100 flex items-center justify-center font-bold text-base shrink-0 select-none">
            {{ getInitial(msg.sender_name || msg.sender_email) }}
          </div>

          <!-- Nama pengirim + email, Subjek & Snippet, Waktu relatif -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 truncate">
                <span
                  v-if="!readMessageIds.has(msg.id)"
                  class="w-2 h-2 rounded-full bg-lime-500 shrink-0"
                  title="Unread"
                ></span>
                <span
                  class="text-sm truncate"
                  :class="readMessageIds.has(msg.id) ? 'font-medium text-gray-700 dark:text-gray-300' : 'font-bold text-gray-900 dark:text-white'"
                >
                  {{ msg.sender_name || msg.sender_email }}
                </span>
                <span
                  v-if="msg.sender_name && msg.sender_email"
                  class="hidden sm:inline text-xs text-gray-500 dark:text-gray-400 font-mono truncate"
                >
                  &lt;{{ msg.sender_email }}&gt;
                </span>
              </div>

              <!-- Waktu relatif -->
              <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                {{ formatRelativeTime(msg.received_at) }}
              </span>
            </div>

            <!-- Subjek -->
            <div class="mt-1 flex items-center justify-between">
              <p
                class="text-sm truncate"
                :class="readMessageIds.has(msg.id) ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'"
              >
                {{ msg.subject || '(No Subject)' }}
              </p>
            </div>

            <!-- Snippet -->
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ msg.snippet || 'No message preview available' }}
            </p>
          </div>

          <!-- Attachments flag & Chevron icon -->
          <div class="shrink-0 flex items-center gap-2 text-gray-400">
            <Paperclip v-if="msg.has_attachments" class="w-4 h-4 text-amber-500" />
            <ChevronRight class="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 2. TAMPILAN DETAIL (Saat email diklik) ================= -->
    <div v-else class="space-y-4">
      <!-- Tombol < Back to Inbox -->
      <div>
        <button
          @click="deselectMessage"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
        >
          <ChevronLeft class="h-5 w-5" />
          <span>Back to Inbox</span>
        </button>
      </div>

      <!-- Loading Detail State -->
      <div
        v-if="isLoadingDetail"
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75 p-12 text-center"
      >
        <Loader2 class="mx-auto h-8 w-8 animate-spin text-lime-500 mb-2" />
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading message content...</p>
      </div>

      <!-- Card detail email -->
      <div
        v-else-if="selectedMessageDetail"
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75"
      >
        <!-- Header detail: Subjek besar, info pengirim & penerima, attachments, tombol Delete -->
        <div class="border-b border-gray-200 dark:border-gray-700/60 px-4 py-5 sm:px-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div class="space-y-1">
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                {{ selectedMessageDetail.subject || '(No Subject)' }}
              </h2>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-1">
                <div>
                  <span class="font-medium text-gray-700 dark:text-gray-300">From:</span>
                  <span class="ml-1 font-semibold text-gray-900 dark:text-white">
                    {{ selectedMessageDetail.sender_name ? `${selectedMessageDetail.sender_name} <${selectedMessageDetail.sender_email}>` : selectedMessageDetail.sender_email }}
                  </span>
                </div>
                <div>
                  <span class="font-medium text-gray-700 dark:text-gray-300">To:</span>
                  <span class="ml-1 font-mono text-gray-900 dark:text-white">{{ session.activeAccount.value?.email }}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700 dark:text-gray-300">Date:</span>
                  <span class="ml-1">{{ formatFullDate(selectedMessageDetail.received_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Controls: Toggle HTML/Text, Tombol Delete -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- View mode toggle -->
              <div class="inline-flex rounded-md shadow-sm">
                <button
                  @click="viewMode = 'html'"
                  :class="viewMode === 'html' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'"
                  class="px-2.5 py-1.5 text-xs font-medium rounded-l-md border border-gray-300 dark:border-gray-600 transition flex items-center gap-1"
                >
                  <Code2 class="w-3.5 h-3.5" />
                  <span>HTML</span>
                </button>
                <button
                  @click="viewMode = 'text'"
                  :class="viewMode === 'text' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'"
                  class="px-2.5 py-1.5 text-xs font-medium rounded-r-md border-t border-b border-r border-gray-300 dark:border-gray-600 transition flex items-center gap-1"
                >
                  <FileText class="w-3.5 h-3.5" />
                  <span>Text</span>
                </button>
              </div>

              <!-- Tombol Delete -->
              <button
                @click="deleteSelectedMessage"
                :disabled="isDeleting"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800 transition disabled:opacity-50"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
              </button>
            </div>
          </div>

          <!-- Attachments (jika ada) -->
          <div
            v-if="selectedMessageDetail.attachments && selectedMessageDetail.attachments.length > 0"
            class="pt-3 border-t border-gray-100 dark:border-gray-700"
          >
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Paperclip class="w-3.5 h-3.5" />
              <span>Attachments ({{ selectedMessageDetail.attachments.length }})</span>
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="att in selectedMessageDetail.attachments"
                :key="att.id"
                @click="downloadAttachment(att)"
                :disabled="isDownloadingAttachment[att.id]"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition disabled:opacity-50"
                :title="`Download ${att.filename}`"
              >
                <Loader2 v-if="isDownloadingAttachment[att.id]" class="w-3.5 h-3.5 animate-spin text-lime-500" />
                <ArrowDownCircle v-else class="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
                <span class="max-w-[150px] truncate">{{ att.filename }}</span>
                <span class="text-gray-400 text-[10px]">({{ formatBytes(att.size) }})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sandboxed Iframe untuk body email -->
        <div class="p-4 sm:p-6 bg-white min-h-[500px]">
          <iframe
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            :srcdoc="iframeContent"
            class="w-full min-h-[500px] border-0"
            title="Email Message Body"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>
