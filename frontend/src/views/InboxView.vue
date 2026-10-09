<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { 
  Inbox, Mail, Trash2, Paperclip, RefreshCw, ChevronLeft, 
  Clock, ArrowDownCircle, AlertCircle, FileText, Code2, 
  CheckCircle, Loader2, Calendar, User, AtSign
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

// Format relative time: "just now", "5m ago", "2h ago", "3d ago"
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

// Format full date: "Oct 9, 2026, 11:45 AM"
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

// Fetch messages list
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

    // If selected message is no longer in list, clear selection
    if (selectedMessageId.value && !messages.value.find(m => m.id === selectedMessageId.value)) {
      selectedMessageId.value = null;
      selectedMessageDetail.value = null;
    }
  } catch (err) {
    console.error('Error fetching messages:', err);
  } finally {
    if (!quiet) isLoadingList.value = false;
  }
}

// Fetch message detail
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
    // Default view mode based on presence of HTML
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

// Delete message
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

    messages.value = messages.value.filter(m => m.id !== id);
    deselectMessage();
  } catch (err) {
    alert('Failed to delete message: ' + err.message);
  } finally {
    isDeleting.value = false;
  }
}

// Download attachment securely via authenticated blob fetch
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

// Computed iframe source content
const iframeContent = computed(() => {
  if (!selectedMessageDetail.value) return '';
  if (viewMode.value === 'text') {
    const text = selectedMessageDetail.value.body_text || '(No text content)';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: pre-wrap; word-break: break-word; padding: 1.5rem; color: #334155; line-height: 1.6; font-size: 14px; } @media (prefers-color-scheme: dark) { body { color: #cbd5e1; background: #0f172a; } }</style></head><body>${escaped}</body></html>`;
  }
  return selectedMessageDetail.value.body_html || selectedMessageDetail.value.body_text || '<p class="text-slate-400 p-4">No content</p>';
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
    // Immediate refresh on tab focus
    fetchMessages(true);
  }
  scheduleNextPoll();
}

function handleExternalRefresh() {
  fetchMessages(false);
}

// Watch active account switch to reload messages
watch(
  () => session.activeAccountId.value,
  (newId) => {
    selectedMessageId.value = null;
    selectedMessageDetail.value = null;
    if (newId) {
      fetchMessages(false);
    } else {
      messages.value = [];
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
  <div class="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
    <div class="max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6 flex-1 flex flex-col min-h-0">
      
      <!-- Mail.tm 2-column layout container -->
      <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        <!-- ================= LEFT COLUMN: MESSAGE LIST ================= -->
        <section 
          class="md:col-span-5 lg:col-span-4 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 min-h-0"
          :class="{ 'hidden md:flex': selectedMessageId !== null }"
        >
          <!-- List Toolbar -->
          <div class="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div class="flex items-center gap-2">
              <Inbox class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Inbox
              </h2>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                {{ messages.length }}
              </span>
            </div>

            <button
              @click="fetchMessages(false)"
              :disabled="isLoadingList"
              class="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Refresh messages"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingList }" />
            </button>
          </div>

          <!-- Message List Content -->
          <div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            
            <!-- Loading indicator -->
            <div v-if="isLoadingList && messages.length === 0" class="p-8 flex flex-col items-center justify-center text-slate-400">
              <Loader2 class="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <p class="text-xs font-medium">Checking mailbox...</p>
            </div>

            <!-- Empty State: Waiting for incoming email with ripple animation -->
            <div 
              v-else-if="messages.length === 0" 
              class="h-full min-h-[360px] p-8 flex flex-col items-center justify-center text-center select-none"
            >
              <div class="relative flex items-center justify-center mb-6">
                <!-- Ping / Radar ripple effect -->
                <span class="absolute inline-flex h-20 w-20 rounded-full bg-emerald-400/20 dark:bg-emerald-500/20 animate-ping"></span>
                <span class="absolute inline-flex h-14 w-14 rounded-full bg-emerald-400/30 dark:bg-emerald-500/30 animate-pulse"></span>
                <div class="relative w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Mail class="w-6 h-6 animate-bounce" />
                </div>
              </div>
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Waiting for incoming emails...
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                Send an email to your address above. New emails arrive here automatically in real time.
              </p>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/60">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Polling Active (4s)
              </div>
            </div>

            <!-- List items -->
            <template v-else>
              <div
                v-for="msg in messages"
                :key="msg.id"
                @click="selectMessage(msg)"
                class="p-3.5 cursor-pointer transition flex flex-col gap-1.5 group select-none relative"
                :class="[
                  selectedMessageId === msg.id 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600 dark:border-l-emerald-400' 
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'
                ]"
              >
                <!-- Top Row: Sender & Relative Time -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 truncate">
                    <!-- Unread dot -->
                    <span 
                      v-if="!readMessageIds.has(msg.id)"
                      class="w-2 h-2 rounded-full bg-emerald-500 shrink-0" 
                      title="Unread"
                    ></span>
                    <span 
                      class="text-xs truncate"
                      :class="readMessageIds.has(msg.id) ? 'font-medium text-slate-600 dark:text-slate-400' : 'font-bold text-slate-900 dark:text-slate-100'"
                    >
                      {{ msg.sender_name || msg.sender_email || 'Unknown Sender' }}
                    </span>
                  </div>

                  <span class="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                    {{ formatRelativeTime(msg.received_at) }}
                  </span>
                </div>

                <!-- Subject -->
                <div 
                  class="text-xs truncate"
                  :class="readMessageIds.has(msg.id) ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-50'"
                >
                  {{ msg.subject || '(No Subject)' }}
                </div>

                <!-- Snippet preview -->
                <div class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {{ msg.snippet || 'No message preview available' }}
                </div>

                <!-- Badges footer -->
                <div class="flex items-center justify-between mt-0.5">
                  <div class="flex items-center gap-1.5">
                    <span
                      v-if="msg.has_attachments"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    >
                      <Paperclip class="w-3 h-3" />
                      Attachment
                    </span>
                  </div>

                  <!-- Small expiry warning -->
                  <div class="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock class="w-3 h-3" />
                    <span>24h purge</span>
                  </div>
                </div>
              </div>
            </template>

          </div>
        </section>

        <!-- ================= RIGHT COLUMN: MESSAGE DETAIL ================= -->
        <main 
          class="md:col-span-7 lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 min-h-0"
          :class="{ 'hidden md:flex': selectedMessageId === null }"
        >
          <!-- State: No Message Selected -->
          <div 
            v-if="!selectedMessageId" 
            class="h-full min-h-[460px] flex flex-col items-center justify-center p-8 text-center text-slate-400"
          >
            <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Mail class="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Message Selected
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Select an email from the left sidebar to preview its contents, verify links, and download attachments.
            </p>
          </div>

          <!-- State: Loading Message Detail -->
          <div 
            v-else-if="isLoadingDetail" 
            class="h-full min-h-[460px] flex flex-col items-center justify-center p-8 text-center text-slate-400"
          >
            <Loader2 class="w-8 h-8 animate-spin text-emerald-500 mb-2" />
            <p class="text-xs font-medium">Loading message content...</p>
          </div>

          <!-- State: Message Detail View -->
          <div v-else-if="selectedMessageDetail" class="flex-1 flex flex-col min-h-0">
            
            <!-- Message Header & Controls -->
            <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              
              <!-- Action Top Bar -->
              <div class="flex items-center justify-between gap-2">
                <!-- Mobile Back Button -->
                <button
                  @click="deselectMessage"
                  class="md:hidden flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                >
                  <ChevronLeft class="w-4 h-4" />
                  <span>Back to list</span>
                </button>

                <div class="flex-1 md:block hidden"></div>

                <div class="flex items-center gap-2">
                  <!-- HTML / Text Toggle -->
                  <div class="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs">
                    <button
                      @click="viewMode = 'html'"
                      :class="[
                        viewMode === 'html' 
                          ? 'bg-white dark:bg-slate-700 font-semibold text-slate-900 dark:text-white shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      ]"
                      class="px-2.5 py-1 rounded-md transition flex items-center gap-1"
                    >
                      <Code2 class="w-3.5 h-3.5" />
                      <span>HTML</span>
                    </button>
                    <button
                      @click="viewMode = 'text'"
                      :class="[
                        viewMode === 'text' 
                          ? 'bg-white dark:bg-slate-700 font-semibold text-slate-900 dark:text-white shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      ]"
                      class="px-2.5 py-1 rounded-md transition flex items-center gap-1"
                    >
                      <FileText class="w-3.5 h-3.5" />
                      <span>Text</span>
                    </button>
                  </div>

                  <!-- Delete Message Button -->
                  <button
                    @click="deleteSelectedMessage"
                    :disabled="isDeleting"
                    class="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    title="Delete message"
                  >
                    <Trash2 class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
                  </button>
                </div>
              </div>

              <!-- Subject & Meta info -->
              <div class="space-y-2">
                <h1 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {{ selectedMessageDetail.subject || '(No Subject)' }}
                </h1>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div class="flex items-center gap-2 truncate">
                    <User class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="font-medium text-slate-500 dark:text-slate-400">From:</span>
                    <span class="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {{ selectedMessageDetail.sender_name ? `${selectedMessageDetail.sender_name} <${selectedMessageDetail.sender_email}>` : selectedMessageDetail.sender_email }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2 truncate sm:justify-end">
                    <Calendar class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="font-medium text-slate-500 dark:text-slate-400">Date:</span>
                    <span class="text-slate-800 dark:text-slate-200 font-medium">
                      {{ formatFullDate(selectedMessageDetail.received_at) }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2 truncate sm:col-span-2">
                    <AtSign class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="font-medium text-slate-500 dark:text-slate-400">To:</span>
                    <span class="font-mono text-slate-700 dark:text-slate-300 truncate">
                      {{ session.activeAccount.value?.email }}
                    </span>
                  </div>
                </div>

                <!-- Attachments bar if any -->
                <div 
                  v-if="selectedMessageDetail.attachments && selectedMessageDetail.attachments.length > 0" 
                  class="pt-1"
                >
                  <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Paperclip class="w-3.5 h-3.5" />
                    <span>Attachments ({{ selectedMessageDetail.attachments.length }})</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="att in selectedMessageDetail.attachments"
                      :key="att.id"
                      @click="downloadAttachment(att)"
                      :disabled="isDownloadingAttachment[att.id]"
                      class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition active:scale-95 disabled:opacity-50"
                      :title="`Download ${att.filename}`"
                    >
                      <Loader2 v-if="isDownloadingAttachment[att.id]" class="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <ArrowDownCircle v-else class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span class="truncate max-w-[180px]">{{ att.filename }}</span>
                      <span class="text-[10px] text-slate-400">({{ formatBytes(att.size) }})</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Email Body Iframe Viewer -->
            <div class="flex-1 min-h-[400px] relative bg-white dark:bg-slate-900 overflow-hidden">
              <iframe
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                :srcdoc="iframeContent"
                class="w-full h-full min-h-[400px] border-0 bg-white"
                title="Email Message Content"
              ></iframe>
            </div>

          </div>
        </main>

      </div>

    </div>
  </div>
</template>
