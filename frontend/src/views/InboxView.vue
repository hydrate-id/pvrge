<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSession } from '../composables/useSession';
import EnvelopeIllustration from '../components/EnvelopeIllustration.vue';
import Envelope from '@primeicons/vue/envelope';
import ChevronRight from '@primeicons/vue/chevron-right';
import Spinner from '@primeicons/vue/spinner';
import Paperclip from '@primeicons/vue/paperclip';
import Trash from '@primeicons/vue/trash';
import EllipsisV from '@primeicons/vue/ellipsis-v';
import Download from '@primeicons/vue/download';
import Code from '@primeicons/vue/code';
import Print from '@primeicons/vue/print';

const session = useSession();
const { activeAccount } = session;

const messages = ref([]);
const selectedMessageId = ref(null);
const selectedMessageDetail = ref(null);
const isLoadingList = ref(false);
const isLoadingDetail = ref(false);
const isDeleting = ref(false);
const isDownloadingAttachment = ref({});
const showActionsMenu = ref(false);
const isShowingSource = ref(false);
const rawSourceText = ref('');
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
    selectedMessageDetail.value = {
      ...data.message,
      created_at: data.message.created_at || data.message.received_at,
    };
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
  isShowingSource.value = false;
  rawSourceText.value = '';
  showActionsMenu.value = false;
  fetchMessageDetail(id);
}

function deselectMessage() {
  selectedMessageId.value = null;
  selectedMessageDetail.value = null;
  isShowingSource.value = false;
  rawSourceText.value = '';
  showActionsMenu.value = false;
}

function downloadEmail() {
  if (!selectedMessageDetail.value) return;
  const raw = rawSourceText.value || selectedMessageDetail.value.raw_source;
  const content = raw || selectedMessageDetail.value.body_html || selectedMessageDetail.value.body_text || '';
  const filename = `${selectedMessageDetail.value.subject || 'message'}.${raw ? 'eml' : 'html'}`;
  const mimeType = raw ? 'message/rfc822' : 'text/html;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  showActionsMenu.value = false;
}

async function toggleSource() {
  showActionsMenu.value = false;
  if (isShowingSource.value) {
    isShowingSource.value = false;
    return;
  }

  const token = session.activeAccount.value?.token;
  const id = selectedMessageDetail.value?.id;
  if (token && id) {
    try {
      const res = await fetch(`/api/messages/${id}/source`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        rawSourceText.value = await res.text();
      }
    } catch (err) {
      console.error('Failed to fetch message source:', err);
    }
  }
  isShowingSource.value = true;
}

function printEmail() {
  showActionsMenu.value = false;
  if (!selectedMessageDetail.value) return;

  const bodyContent = selectedMessageDetail.value.body_html || `<pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.5;">${selectedMessageDetail.value.body_text || ''}</pre>`;

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (!frameDoc) {
    window.print();
    return;
  }

  frameDoc.open();
  frameDoc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${selectedMessageDetail.value.subject || 'Print Message'}</title>
    <style>
      @page { margin: 15mm; }
      body { margin: 0; padding: 12px; font-family: sans-serif; color: #000; background: #fff; }
      img { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`);
  frameDoc.close();

  setTimeout(() => {
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }, 300);
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
    isShowingSource.value = false;
    rawSourceText.value = '';
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
      <!-- Loading Detail State -->
      <div
        v-if="isLoadingDetail"
        class="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75 p-12 text-center"
      >
        <Spinner class="animate-spin mx-auto text-2xl text-lime-500 mb-2 block" />
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading message content...</p>
      </div>

      <div v-if="isShowingSource">
        <a
          href="#"
          @click.prevent="isShowingSource = false"
          class="flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500 mb-2"
        >
          <svg class="mr-1 -ml-1 size-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          Back
        </a>

        <div class="mt-2 md:flex md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">Source</h1>
          </div>
          <div class="relative mt-4 flex shrink-0 md:mt-0 md:ml-4">
            <button
              type="button"
              @click="showActionsMenu = !showActionsMenu"
              class="rounded-md font-medium inline-flex items-center text-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 p-1.5 transition"
              title="More actions"
            >
              <EllipsisV class="size-5 shrink-0" />
            </button>

            <!-- Backdrop for click outside -->
            <div
              v-if="showActionsMenu"
              class="fixed inset-0 z-40"
              @click="showActionsMenu = false"
            ></div>

            <!-- Menu actions jika dibuka dari view source -->
            <div
              v-if="showActionsMenu"
              class="absolute right-0 top-full mt-1.5 w-44 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-gray-700 z-50 py-1 text-sm focus:outline-none"
            >
              <!-- Download -->
              <button
                type="button"
                @click="downloadEmail"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <Download class="size-4 shrink-0" />
                <span>Download</span>
              </button>

              <!-- Source -->
              <button
                type="button"
                @click="toggleSource"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <Code class="size-4 shrink-0" />
                <span>View message</span>
              </button>

              <!-- Print -->
              <button
                type="button"
                @click="printEmail"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <Print class="size-4 shrink-0" />
                <span>Print</span>
              </button>

              <!-- Divider -->
              <div class="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700"></div>

              <!-- Delete -->
              <button
                type="button"
                @click="() => { showActionsMenu = false; deleteSelectedMessage(); }"
                :disabled="isDeleting"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50"
              >
                <Trash class="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75">
          <div class="container h-full break-all">
            <div class="my-4 whitespace-pre-line dark:text-white font-mono text-sm leading-relaxed select-all">
              {{ rawSourceText }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="selectedMessageDetail">
        <a href="#" @click.prevent="deselectMessage" class="flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500">
          <svg class="mr-1 -ml-1 size-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          Back
        </a>

        <div class="mt-2 md:flex md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <h2 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">
              {{ selectedMessageDetail.subject || '(No Subject)' }}
            </h2>
          </div>
          <div class="relative mt-4 flex shrink-0 md:mt-0 md:ml-4">
            <!-- Trigger Dropdown -->
            <button
              type="button"
              @click="showActionsMenu = !showActionsMenu"
              class="rounded-md font-medium inline-flex items-center text-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 p-1.5 transition"
              title="More actions"
            >
              <EllipsisV class="size-5 shrink-0" />
            </button>

            <!-- Backdrop for click outside -->
            <div
              v-if="showActionsMenu"
              class="fixed inset-0 z-40"
              @click="showActionsMenu = false"
            ></div>

            <!-- Dropdown Menu -->
            <div
              v-if="showActionsMenu"
              class="absolute right-0 top-full mt-1.5 w-44 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-gray-700 z-50 py-1 text-sm focus:outline-none"
            >
              <!-- Download -->
              <button
                type="button"
                @click="downloadEmail"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <Download class="size-4 shrink-0" />
                <span>Download</span>
              </button>

              <!-- Source -->
              <button
                type="button"
                @click="toggleSource"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <Code class="size-4 shrink-0" />
                <span>Source</span>
              </button>

              <!-- Print -->
              <button
                type="button"
                @click="printEmail"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <Print class="size-4 shrink-0" />
                <span>Print</span>
              </button>

              <!-- Divider -->
              <div class="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700"></div>

              <!-- Delete -->
              <button
                type="button"
                @click="() => { showActionsMenu = false; deleteSelectedMessage(); }"
                :disabled="isDeleting"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50"
              >
                <Trash class="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75">
          <div class="-mt-4 -ml-4 flex flex-wrap items-center justify-between sm:flex-nowrap">
            <div class="mt-4 ml-4">
              <div class="flex items-center">
                <div class="shrink-0">
                  <span class="inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle size-10 text-xl bg-lime-200 dark:bg-lime-700 transition">
                    <span class="truncate leading-none font-medium text-gray-600 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-200">
                      {{ getInitial(selectedMessageDetail.sender_name || selectedMessageDetail.sender_email) }}
                    </span>
                  </span>
                </div>
                <div class="ml-4">
                  <div class="text-lg/6 font-medium text-indigo-600 dark:text-indigo-400">
                    {{ selectedMessageDetail.sender_name || selectedMessageDetail.sender_email }}
                    <span class="text-sm/5 font-normal text-gray-700 dark:text-gray-400 ml-1">
                      {{ selectedMessageDetail.sender_email }}
                    </span>
                  </div>
                  <div class="flex items-center text-sm/5 text-gray-500 dark:text-gray-400">
                    <svg class="mr-1.5 size-5 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="truncate">
                      <a :href="'mailto:' + activeAccount?.email" class="ml-1">{{ activeAccount?.email }};</a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-4 ml-4 flex shrink-0 hover:cursor-context-menu">
              <time class="truncate text-gray-500 dark:text-gray-400 text-sm">
                {{ formatRelativeTime(selectedMessageDetail.created_at) }}
              </time>
            </div>
          </div>

          <div class="px-4 py-5 sm:px-6">
            <div class="aspect-h-8 aspect-w-16 h-full">
              <iframe
                class="w-full min-h-[500px] border-0"
                :srcdoc="selectedMessageDetail.body_html || selectedMessageDetail.body_text"
                id="iFrameResizer1"
                scrolling="yes"
                style="overflow: auto;"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
