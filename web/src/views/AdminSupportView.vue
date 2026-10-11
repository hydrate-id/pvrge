<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import Search from '@primeicons/vue/search';
import Send from '@primeicons/vue/send';
import ArrowLeft from '@primeicons/vue/arrow-left';
import Check from '@primeicons/vue/check';
import Spinner from '@primeicons/vue/spinner';
import Comments from '@primeicons/vue/comments';
import ExternalLink from '@primeicons/vue/external-link';
import Refresh from '@primeicons/vue/refresh';
import Times from '@primeicons/vue/times';

// Reactive state
const threads = ref([]);
const selectedThreadId = ref(null);
const selectedThread = ref(null);
const messages = ref([]);
const filterStatus = ref('all');
const searchQuery = ref('');
const replyContent = ref('');
const isLoadingThreads = ref(false);
const isLoadingMessages = ref(false);
const isSendingReply = ref(false);
const error = ref(null);

const counts = ref({ all: 0, open: 0, resolved: 0 });
const chatContainer = ref(null);
const replyTextarea = ref(null);
let pollTimer = null;

// Filtered threads computed based on client-side search query
const filteredThreads = computed(() => {
  if (!searchQuery.value.trim()) {
    return threads.value;
  }
  const q = searchQuery.value.toLowerCase().trim();
  return threads.value.filter((t) => {
    const fullName = `${t.telegram_first_name || ''} ${t.telegram_last_name || ''}`.toLowerCase();
    const username = (t.telegram_username || '').toLowerCase();
    const snippet = (t.last_message_snippet || '').toLowerCase();
    return fullName.includes(q) || username.includes(q) || snippet.includes(q);
  });
});

function getUserDisplayName(thread) {
  if (!thread) return 'User';
  const parts = [thread.telegram_first_name, thread.telegram_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (thread.telegram_username) return `@${thread.telegram_username}`;
  return `User #${thread.telegram_user_id || thread.telegram_chat_id || 'Unknown'}`;
}

function getUserInitials(thread) {
  if (!thread) return 'U';
  if (thread.telegram_first_name) {
    const first = thread.telegram_first_name.charAt(0).toUpperCase();
    const last = thread.telegram_last_name ? thread.telegram_last_name.charAt(0).toUpperCase() : '';
    return (first + last).slice(0, 2);
  }
  if (thread.telegram_username) {
    return thread.telegram_username.charAt(0).toUpperCase();
  }
  return 'U';
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function scrollToBottom(smooth = false) {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }
}

async function fetchThreads(isInitial = false) {
  if (isInitial) {
    isLoadingThreads.value = true;
  }
  try {
    const res = await fetch(`/api/duty/support/threads?status=${filterStatus.value}`);
    if (!res.ok) {
      throw new Error(`Failed to load threads (HTTP ${res.status})`);
    }
    const data = await res.json();
    threads.value = data.threads || [];
    if (data.counts) {
      counts.value = data.counts;
    }

    // If a thread is selected, keep its reference updated and refresh messages if new ones arrived
    if (selectedThreadId.value) {
      const current = threads.value.find((t) => t.id === selectedThreadId.value);
      if (current) {
        if (current.unread_operator_count > 0 || current.last_message_at !== selectedThread.value?.last_message_at) {
          await fetchThreadMessages(selectedThreadId.value, false);
        }
        selectedThread.value = { ...selectedThread.value, ...current, unread_operator_count: 0 };
      }
    }
    error.value = null;
  } catch (err) {
    if (isInitial) {
      error.value = err.message || 'Error fetching support threads';
    }
  } finally {
    if (isInitial) {
      isLoadingThreads.value = false;
    }
  }
}

async function selectThread(thread) {
  if (!thread) return;
  selectedThreadId.value = thread.id;
  selectedThread.value = { ...thread, unread_operator_count: 0 };
  // Reset local unread in list
  const idx = threads.value.findIndex((t) => t.id === thread.id);
  if (idx !== -1) {
    threads.value[idx].unread_operator_count = 0;
  }
  await fetchThreadMessages(thread.id, true);
  await nextTick();
  if (replyTextarea.value) {
    replyTextarea.value.focus();
  }
}

async function fetchThreadMessages(threadId, showLoading = false) {
  if (showLoading) {
    isLoadingMessages.value = true;
  }
  try {
    const res = await fetch(`/api/duty/support/threads/${threadId}`);
    if (!res.ok) {
      throw new Error(`Failed to load messages (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (data.thread) {
      selectedThread.value = data.thread;
    }
    messages.value = data.messages || [];
    await scrollToBottom();
  } catch (err) {
    error.value = err.message || 'Error fetching thread messages';
  } finally {
    if (showLoading) {
      isLoadingMessages.value = false;
    }
  }
}

async function handleSendReply() {
  const content = replyContent.value.trim();
  if (!content || !selectedThreadId.value || isSendingReply.value) return;

  isSendingReply.value = true;
  error.value = null;

  try {
    const res = await fetch(`/api/duty/support/threads/${selectedThreadId.value}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Failed to send reply (HTTP ${res.status})`);
    }

    replyContent.value = '';
    if (data.message) {
      messages.value.push(data.message);
    } else {
      await fetchThreadMessages(selectedThreadId.value, false);
    }

    if (selectedThread.value) {
      selectedThread.value.last_message_snippet = content.slice(0, 100);
      selectedThread.value.last_message_at = new Date().toISOString();
    }
    const idx = threads.value.findIndex((t) => t.id === selectedThreadId.value);
    if (idx !== -1) {
      threads.value[idx].last_message_snippet = content.slice(0, 100);
      threads.value[idx].last_message_at = new Date().toISOString();
    }

    await scrollToBottom(true);
  } catch (err) {
    error.value = err.message || 'Failed to send reply';
  } finally {
    isSendingReply.value = false;
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    handleSendReply();
  }
}

async function toggleThreadStatus() {
  if (!selectedThread.value || !selectedThreadId.value) return;
  const newStatus = selectedThread.value.status === 'open' ? 'resolved' : 'open';

  try {
    const res = await fetch(`/api/duty/support/threads/${selectedThreadId.value}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to update status (HTTP ${res.status})`);
    }

    selectedThread.value.status = newStatus;
    const idx = threads.value.findIndex((t) => t.id === selectedThreadId.value);
    if (idx !== -1) {
      threads.value[idx].status = newStatus;
    }
    if (newStatus === 'resolved') {
      counts.value.open = Math.max(0, counts.value.open - 1);
      counts.value.resolved += 1;
    } else {
      counts.value.open += 1;
      counts.value.resolved = Math.max(0, counts.value.resolved - 1);
    }
  } catch (err) {
    error.value = err.message || 'Failed to update thread status';
  }
}

function handleBackToList() {
  selectedThreadId.value = null;
  selectedThread.value = null;
  messages.value = [];
}

watch(filterStatus, () => {
  fetchThreads(true);
});

onMounted(() => {
  fetchThreads(true);
  pollTimer = setInterval(() => {
    fetchThreads(false);
  }, 5000);
});

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col h-[calc(100vh-6.5rem)] min-h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
    <!-- Error notification if any -->
    <div
      v-if="error"
      class="bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-2 text-xs flex items-center justify-between"
    >
      <span>{{ error }}</span>
      <button @click="error = null" class="text-rose-600 dark:text-rose-400 hover:opacity-75">
        <Times class="size-3.5" />
      </button>
    </div>

    <!-- Master-Detail 2-Kolom Container -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- KOLOM KIRI: THREAD LIST (Desktop: w-80/96, Mobile: hidden saat ada selectedThread) -->
      <section
        class="flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 transition-all"
        :class="[
          selectedThreadId ? 'hidden md:flex md:w-80 lg:w-96 shrink-0' : 'w-full md:w-80 lg:w-96 shrink-0 flex'
        ]"
      >
        <!-- Top Search Box -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <!-- Status Filter Tabs -->
          <div class="flex mt-2.5 p-0.5 bg-gray-100 dark:bg-gray-800/80 rounded-lg text-xs font-medium">
            <button
              type="button"
              @click="filterStatus = 'all'"
              class="flex-1 py-1 rounded-md transition text-center"
              :class="filterStatus === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            >
              All
              <span v-if="counts.all" class="ml-1 text-[10px] text-gray-400">({{ counts.all }})</span>
            </button>
            <button
              type="button"
              @click="filterStatus = 'open'"
              class="flex-1 py-1 rounded-md transition text-center"
              :class="filterStatus === 'open' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            >
              Open
              <span v-if="counts.open" class="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">({{ counts.open }})</span>
            </button>
            <button
              type="button"
              @click="filterStatus = 'resolved'"
              class="flex-1 py-1 rounded-md transition text-center"
              :class="filterStatus === 'resolved' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            >
              Resolved
              <span v-if="counts.resolved" class="ml-1 text-[10px] text-gray-400">({{ counts.resolved }})</span>
            </button>
          </div>
        </div>

        <!-- Threads Scrollable List -->
        <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          <div v-if="isLoadingThreads" class="flex flex-col items-center justify-center p-8 text-gray-400 space-y-2">
            <Spinner class="size-6 animate-spin text-emerald-600" />
            <span class="text-xs">Loading support threads...</span>
          </div>

          <div v-else-if="filteredThreads.length === 0" class="flex flex-col items-center justify-center p-8 text-gray-400 text-center space-y-2">
            <Comments class="size-8 text-gray-300 dark:text-gray-600" />
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">No support threads found</p>
            <p class="text-[11px] text-gray-400 dark:text-gray-500">Incoming user messages from Telegram will appear here.</p>
          </div>

          <button
            v-for="thread in filteredThreads"
            :key="thread.id"
            type="button"
            @click="selectThread(thread)"
            class="w-full p-3 text-left transition flex items-start gap-3 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 focus:outline-none"
            :class="{
              'bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500': selectedThreadId === thread.id,
              'bg-white dark:bg-gray-900': selectedThreadId !== thread.id
            }"
          >
            <!-- User Avatar Initial -->
            <div
              class="size-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold select-none text-white shadow-xs"
              :class="thread.status === 'open' ? 'bg-gradient-to-tr from-emerald-600 to-teal-500' : 'bg-gray-400 dark:bg-gray-600'"
            >
              {{ getUserInitials(thread) }}
            </div>

            <!-- Thread Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <span class="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {{ getUserDisplayName(thread) }}
                </span>
                <span class="text-[10px] text-gray-400 shrink-0">
                  {{ formatRelativeTime(thread.last_message_at || thread.created_at) }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  <span v-if="thread.telegram_username" class="text-emerald-600 dark:text-emerald-400 mr-1 font-mono">@{{ thread.telegram_username }}</span>
                  <span>{{ thread.last_message_snippet || 'No messages yet' }}</span>
                </p>

                <div class="flex items-center gap-1.5 shrink-0">
                  <!-- Unread count badge -->
                  <span
                    v-if="thread.unread_operator_count > 0"
                    class="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white min-w-4 text-center animate-pulse"
                  >
                    {{ thread.unread_operator_count }}
                  </span>

                  <!-- Status Dot / Pill -->
                  <span
                    v-if="thread.status === 'resolved'"
                    class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    Resolved
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      <!-- KOLOM KANAN: CHAT VIEW (Desktop: flex-1, Mobile: hidden saat belum pilih thread) -->
      <section
        class="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
        :class="[
          selectedThreadId ? 'flex w-full' : 'hidden md:flex'
        ]"
      >
        <template v-if="selectedThreadId && selectedThread">
          <!-- Chat Header -->
          <header class="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Mobile Back Button -->
              <button
                type="button"
                @click="handleBackToList"
                class="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Back to conversation list"
              >
                <ArrowLeft class="size-4" />
              </button>

              <!-- Avatar -->
              <div
                class="size-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-xs"
                :class="selectedThread.status === 'open' ? 'bg-gradient-to-tr from-emerald-600 to-teal-500' : 'bg-gray-400 dark:bg-gray-600'"
              >
                {{ getUserInitials(selectedThread) }}
              </div>

              <!-- Name & Telegram Username Link -->
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {{ getUserDisplayName(selectedThread) }}
                  </h2>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase"
                    :class="selectedThread.status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                  >
                    {{ selectedThread.status }}
                  </span>
                </div>

                <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <a
                    v-if="selectedThread.telegram_username"
                    :href="`https://t.me/${selectedThread.telegram_username}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>@{{ selectedThread.telegram_username }}</span>
                    <ExternalLink class="size-3" />
                  </a>
                  <span v-else class="text-gray-400 font-mono text-[11px]">Chat ID: {{ selectedThread.telegram_chat_id }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons: Status Toggle & Manual Refresh -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                @click="fetchThreadMessages(selectedThreadId, true)"
                class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Refresh messages"
              >
                <Refresh class="size-4" :class="{ 'animate-spin': isLoadingMessages }" />
              </button>

              <button
                type="button"
                @click="toggleThreadStatus"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                :class="selectedThread.status === 'open'
                  ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'"
              >
                <Check v-if="selectedThread.status === 'open'" class="size-3.5" />
                <span>{{ selectedThread.status === 'open' ? 'Mark Resolved' : 'Reopen Thread' }}</span>
              </button>
            </div>
          </header>

          <!-- Chat Scrollable Box -->
          <div
            ref="chatContainer"
            class="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/30 dark:bg-gray-950/20"
          >
            <div v-if="isLoadingMessages && messages.length === 0" class="flex items-center justify-center h-full text-gray-400">
              <Spinner class="size-6 animate-spin text-emerald-600" />
            </div>

            <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 text-center space-y-1">
              <Comments class="size-8 text-gray-300 dark:text-gray-600" />
              <p class="text-xs">No messages in this conversation yet.</p>
            </div>

            <!-- Message Bubbles -->
            <template v-for="msg in messages" :key="msg.id">
              <!-- System divider (New Case) -->
              <div v-if="msg.sender_type === 'system'" class="my-4 flex items-center justify-center">
                <div class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs">
                  <span>{{ msg.content.replace(/---/g, '').trim() }}</span>
                  <span class="text-gray-400 dark:text-gray-500 font-normal">&middot; {{ formatMessageTime(msg.created_at) }}</span>
                </div>
              </div>

              <!-- User or Operator Message -->
              <div
                v-else
                class="flex flex-col"
                :class="msg.sender_type === 'operator' ? 'items-end' : 'items-start'"
              >
                <!-- Sender label & time -->
                <div class="flex items-center gap-1.5 mb-1 text-[11px] text-gray-400 px-1">
                  <span class="font-medium" :class="msg.sender_type === 'operator' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'">
                    {{ msg.sender_type === 'operator' ? 'Operator' : (msg.sender_name || 'User') }}
                  </span>
                  <span>•</span>
                  <span>{{ formatMessageTime(msg.created_at) }}</span>
                </div>

                <!-- Message Bubble -->
                <div
                  class="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs break-words whitespace-pre-wrap leading-relaxed"
                  :class="[
                    msg.sender_type === 'operator'
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-xs border border-gray-200/50 dark:border-gray-700/50'
                  ]"
                >
                  {{ msg.content }}
                </div>

                <!-- Status indicator for operator messages -->
                <div
                  v-if="msg.sender_type === 'operator'"
                  class="text-[10px] text-gray-400 mt-0.5 px-1 flex items-center gap-1"
                >
                  <span v-if="msg.is_sent_to_telegram === 1" class="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <Check class="size-2.5" /> Sent to Telegram
                  </span>
                  <span v-else class="text-gray-400">
                    Pending Telegram sync
                  </span>
                </div>
              </div>
            </template>
          </div>

          <!-- Reply Box / Textarea Form -->
          <footer class="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
            <form @submit.prevent="handleSendReply" class="space-y-2">
              <div class="relative rounded-lg border border-gray-200 dark:border-gray-700 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 bg-gray-50 dark:bg-gray-800/50 transition">
                <textarea
                  ref="replyTextarea"
                  v-model="replyContent"
                  rows="3"
                  placeholder="Type a reply... (Ctrl + Enter to send)"
                  @keydown="handleKeydown"
                  :disabled="isSendingReply"
                  class="w-full p-2.5 text-xs bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none"
                ></textarea>

                <div class="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-100 dark:border-gray-800/80 bg-white/50 dark:bg-gray-900/40">
                  <span class="text-[10px] text-gray-400">
                    Press <kbd class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[9px]">Ctrl+Enter</kbd> to send
                  </span>

                  <button
                    type="submit"
                    :disabled="!replyContent.trim() || isSendingReply"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition shadow-xs disabled:cursor-not-allowed"
                  >
                    <Spinner v-if="isSendingReply" class="size-3 animate-spin" />
                    <Send v-else class="size-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </form>
          </footer>
        </template>

        <!-- Empty State When No Thread is Selected (Desktop) -->
        <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3 bg-gray-50/20 dark:bg-gray-950/10">
          <div class="size-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Comments class="size-8" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Telegram Support Desk</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Select a conversation from the left to read user inquiries and reply directly to their Telegram chat.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
