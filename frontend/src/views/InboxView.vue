<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSession } from '../composables/useSession';
import EnvelopeIllustration from '../components/EnvelopeIllustration.vue';
import Envelope from '@primeicons/vue/envelope';
import ChevronRight from '@primeicons/vue/chevron-right';
import ChevronLeft from '@primeicons/vue/chevron-left';
import Spinner from '@primeicons/vue/spinner';
import Paperclip from '@primeicons/vue/paperclip';
import Trash from '@primeicons/vue/trash';

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
    messages.value = (data.messages || []).map((m) => ({
      ...m,
      from_name: m.from_name || m.sender_name || '',
      from_address: m.from_address || m.sender_email || '',
      intro: m.intro || m.snippet || '',
    }));

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

function selectMessage(msgOrId) {
  const id = typeof msgOrId === 'object' && msgOrId !== null ? msgOrId.id : msgOrId;
  selectedMessageId.value = id;
  fetchMessageDetail(id);
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
  <!-- Empty State (Saat tidak ada email dipilih dan inbox kosong) -->
  <div
    v-if="!selectedMessageId && messages.length === 0"
    class="h-full flex-1 flex flex-col items-center justify-center py-12 px-4"
  >
    <div class="group relative mx-auto w-fit flex flex-col items-center">
      <EnvelopeIllustration />
      <div class="text-center max-w-xl mt-6">
        <h1 class="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">pvrge</h1>
        <p class="text-base sm:text-lg text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
          Free temporary email address, ready the moment you open the page, with no sign-up. A disposable inbox that keeps your real email safe from spam and phishing.
        </p>
      </div>
    </div>
  </div>

  <div v-else class="w-full space-y-4">
    <!-- ================= 1. TAMPILAN LIST (Saat tidak ada email dipilih) ================= -->
    <div v-if="!selectedMessageId">
      <!-- Header -->
      <div class="mt-2 md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
          <h2 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">
            Inbox
          </h2>
        </div>
      </div>

      <!-- Card List -->
      <div class="mt-6 overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75">
        <ul class="divide-y divide-gray-200 dark:divide-gray-700/50">
          <li v-for="msg in messages" :key="msg.id">
            <a
              href="#"
              @click.prevent="selectMessage(msg.id)"
              class="group block transition hover:bg-gray-50 focus:outline-none dark:hover:bg-gray-900/50 dark:focus:bg-gray-900/50 cursor-pointer"
            >
              <div class="flex items-center p-4 sm:px-6">
                <div class="flex min-w-0 flex-1 items-center">
                  <!-- Avatar bulat size-11 bg-lime-200 dark:bg-lime-700 text-[22px] inisial pengirim -->
                  <div class="shrink-0">
                    <span class="relative inline-block">
                      <span class="inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle size-11 text-[22px] bg-lime-200 dark:bg-lime-700 transition">
                        <span class="truncate leading-none font-medium text-gray-600 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-200">
                          {{ (msg.from_name || msg.from_address || '?').charAt(0).toUpperCase() }}
                        </span>
                      </span>
                    </span>
                  </div>
                  <!-- Grid 2 kolom di md -->
                  <div class="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div class="min-w-0 flex-auto">
                      <div class="truncate text-sm/5 font-medium text-indigo-600 dark:text-indigo-400">
                        {{ msg.from_name || msg.from_address }}
                      </div>
                      <div class="mt-1 flex items-center text-sm/5 text-gray-500 dark:text-gray-400">
                        <Envelope class="mr-1.5 size-4 shrink-0 text-gray-400" />
                        <span class="truncate">{{ msg.from_address }}</span>
                      </div>
                    </div>
                    <div class="hidden md:block">
                      <div>
                        <div class="truncate text-sm/5 text-gray-900 dark:text-gray-300 font-medium">
                          {{ msg.subject || '(No subject)' }}
                        </div>
                        <div class="mt-1 flex items-center truncate text-sm/5 text-gray-400 dark:text-gray-400">
                          {{ msg.intro || msg.snippet || 'No preview available' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronRight class="size-4 text-gray-400" />
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- ================= 2. TAMPILAN DETAIL (Saat email diklik) ================= -->
    <div v-else>
      <!-- Tombol kembali -->
      <button
        @click="deselectMessage"
        class="flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500 mb-2"
      >
        <ChevronLeft class="mr-1 -ml-1 size-4 shrink-0" /> Back
      </button>

      <!-- Loading Detail State -->
      <div
        v-if="isLoadingDetail"
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75 p-12 text-center"
      >
        <Spinner class="animate-spin mx-auto text-2xl text-lime-500 mb-2 block" />
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading message content...</p>
      </div>

      <div v-else-if="selectedMessageDetail">
        <!-- Baris Judul & Aksi -->
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-2xl/7 font-bold text-gray-900 dark:text-gray-300 truncate">
            {{ selectedMessageDetail.subject || '(No Subject)' }}
          </h2>

          <div class="flex items-center gap-2 shrink-0">
            <!-- Download attachment jika ada -->
            <template v-if="selectedMessageDetail.attachments && selectedMessageDetail.attachments.length > 0">
              <button
                v-for="att in selectedMessageDetail.attachments"
                :key="att.id"
                @click="downloadAttachment(att)"
                :disabled="isDownloadingAttachment[att.id]"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition disabled:opacity-50"
                :title="`Download ${att.filename}`"
              >
                <Paperclip class="size-3 text-amber-500" />
                <span class="max-w-[120px] truncate">{{ att.filename }}</span>
              </button>
            </template>

            <!-- Delete message button dengan trash icon warna rose/merah -->
            <button
              @click="deleteSelectedMessage"
              :disabled="isDeleting"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition disabled:opacity-50"
              title="Delete message"
            >
              <Trash class="size-4 text-rose-600 dark:text-rose-400" />
              <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
            </button>
          </div>
        </div>

        <!-- Card Detail Email -->
        <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75">
          <!-- Header Pengirim & Tanggal -->
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-full bg-lime-200 dark:bg-lime-700 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 shrink-0">
                {{ getInitial(selectedMessageDetail.sender_name || selectedMessageDetail.sender_email) }}
              </div>
              <div>
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="text-lg/6 font-medium text-indigo-600 dark:text-indigo-400">
                    {{ selectedMessageDetail.sender_name || selectedMessageDetail.sender_email }}
                  </span>
                  <span v-if="selectedMessageDetail.sender_name && selectedMessageDetail.sender_email" class="text-sm/5 text-gray-500 dark:text-gray-400 font-mono">
                    &lt;{{ selectedMessageDetail.sender_email }}&gt;
                  </span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  To: {{ session.activeAccount.value?.email }}
                </div>
              </div>
            </div>

            <div class="text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-4">
              <div class="font-medium text-gray-700 dark:text-gray-300">
                {{ formatRelativeTime(selectedMessageDetail.received_at) }}
              </div>
              <div class="text-[11px] mt-0.5">
                {{ formatFullDate(selectedMessageDetail.received_at) }}
              </div>
            </div>
          </div>

          <!-- Body email -->
          <div class="px-2 py-4 sm:px-4">
            <iframe
              class="w-full min-h-[500px] border-0"
              :srcdoc="selectedMessageDetail.body_html || selectedMessageDetail.body_text"
              style="overflow: auto;"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
