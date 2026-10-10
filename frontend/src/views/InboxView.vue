<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSession } from '../composables/useSession';
import EnvelopeIllustration from '../components/EnvelopeIllustration.vue';
import Envelope from '@primeicons/vue/envelope';
import ChevronRight from '@primeicons/vue/chevron-right';
import Spinner from '@primeicons/vue/spinner';
import Paperclip from '@primeicons/vue/paperclip';
import Times from '@primeicons/vue/times';
import Trash from '@primeicons/vue/trash';
import EllipsisV from '@primeicons/vue/ellipsis-v';
import Download from '@primeicons/vue/download';
import Code from '@primeicons/vue/code';
import Print from '@primeicons/vue/print';
import { Copy, Check, Bell } from '@primeicons/vue';
import { getMsgOtp } from '../utils/otp';
import { copyText } from '../utils/clipboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const route = useRoute();
const router = useRouter();
const session = useSession();
const { activeAccount, rateLimitState, handleResponseStatus } = session;

const routePrefix = computed(() => route.path.startsWith('/onduty') ? '/onduty' : '');

const messages = ref([]);
const selectedMessageId = computed(() => route.params.id || null);
const selectedMessageDetail = ref(null);
const isLoadingList = ref(false);
const isLoadingDetail = ref(false);
const isDeleting = ref(false);
const isDownloadingAttachment = ref({});
const showActionsMenu = ref(false);
const isShowingSource = computed(() => route.name === 'message-source' || route.path.endsWith('/source'));
const rawSourceText = ref('');
const viewMode = ref('html'); // 'html' or 'text'
const readMessageIds = ref(new Set());
const showDeleteMessageDialog = ref(false);
const errorDialog = ref({ open: false, title: '', message: '' });

// Copy feedback state
const copiedKey = ref(null);
let copyTimer = null;

// Context and Notification
const isSecureContext = ref(typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false);
const inAppToast = ref(null);
let toastTimer = null;

// Notification and Dynamic Tab Title
const defaultTitle = ref(typeof document !== 'undefined' ? document.title : 'pvrge - Disposable Temporary Email Service');
const notificationPermission = ref(
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
);
const hasInitialFetch = ref(false);

const unreadCount = computed(() => {
  return messages.value.filter((m) => !readMessageIds.value.has(m.id)).length;
});

function updateDocumentTitle() {
  if (typeof document === 'undefined') return;
  const count = unreadCount.value;
  if (count > 0) {
    document.title = `(${count}) Inbox - pvrge`;
  } else {
    document.title = defaultTitle.value;
  }
}

watch(unreadCount, () => {
  updateDocumentTitle();
});

async function copyToClipboard(text, key) {
  if (!text) return;
  const ok = await copyText(text);
  if (ok) {
    copiedKey.value = key;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedKey.value = null;
    }, 2000);
  }
}

async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    const perm = await Notification.requestPermission();
    notificationPermission.value = perm;
  } catch (e) {
    console.warn('Failed to request notification permission:', e);
  }
}

function sendNotification(title, options) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, options);
    } catch (e) {
      console.warn('Notification error:', e);
    }
  }
}

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
  const updated = new Set(readMessageIds.value);
  updated.add(id);
  readMessageIds.value = updated;
  try {
    localStorage.setItem('pvrge_read_ids', JSON.stringify([...updated]));
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

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function fetchMessages(quiet = false) {
  if (rateLimitState.value.isLimited) return;

  const token = session.activeAccount.value?.token;
  if (!token) return;

  if (!quiet) isLoadingList.value = true;
  try {
    const res = await fetch('/api/messages', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 429) {
      handleResponseStatus(res, 'Polling rate limit reached. Auto-refresh paused.');
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    const oldIds = new Set(messages.value.map((m) => m.id));
    const newMessages = (data.messages || []).map((m) => ({
      ...m,
      from_name: m.from_name || m.sender_name || '',
      from_address: m.from_address || m.sender_email || '',
      intro: m.intro || m.snippet || '',
    }));

    if (hasInitialFetch.value) {
      const arrived = newMessages.filter((m) => !oldIds.has(m.id));
      if (arrived.length > 0) {
        const latest = arrived[0];
        inAppToast.value = {
          title: `New email from ${latest.from_name || latest.from_address || 'Unknown'}`,
          body: latest.subject || latest.intro || 'You received a new message',
        };
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          inAppToast.value = null;
        }, 6000);

        for (const msg of arrived) {
          sendNotification(`New email from ${msg.from_name || msg.from_address || 'Unknown'}`, {
            body: msg.subject || msg.intro || 'You received a new message',
          });
        }
      }
    } else {
      hasInitialFetch.value = true;
    }

    messages.value = newMessages;

    // Calculate total size for storage indicator
    const totalBytes = messages.value.reduce((acc, m) => acc + (m.size || 0), 0);
    session.setStorageBytes(totalBytes);
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

async function fetchSource(id) {
  const token = session.activeAccount.value?.token;
  if (!token || !id) return;

  isLoadingDetail.value = true;
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
  } finally {
    isLoadingDetail.value = false;
  }
}

watch(
  [() => route.params.id, () => session.activeAccount.value?.token, () => route.name],
  async ([id, token, routeName]) => {
    if (!id || !token) {
      selectedMessageDetail.value = null;
      rawSourceText.value = '';
      return;
    }
    if (selectedMessageDetail.value?.id !== id) {
      rawSourceText.value = '';
      await fetchMessageDetail(id);
    }
    if (routeName === 'message-source' || route.path.endsWith('/source')) {
      if (!rawSourceText.value) {
        await fetchSource(id);
      }
    }
  },
  { immediate: true }
);

function selectMessage(msgOrId) {
  const id = typeof msgOrId === 'object' && msgOrId !== null ? msgOrId.id : msgOrId;
  router.push(routePrefix.value + '/view/' + id);
}

function deselectMessage() {
  router.push(routePrefix.value || '/');
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
    if (selectedMessageDetail.value?.id) {
      router.push(routePrefix.value + '/view/' + selectedMessageDetail.value.id);
    }
  } else {
    if (selectedMessageDetail.value?.id) {
      router.push(routePrefix.value + '/view/' + (selectedMessageDetail?.id || route.params.id) + '/source');
    }
  }
}

function printEmail() {
  showActionsMenu.value = false;
  if (!selectedMessageDetail.value) return;

  const escapedText = escapeHtml(selectedMessageDetail.value.body_text || '');
  const bodyContent = selectedMessageDetail.value.body_html || `<pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.5;">${escapedText}</pre>`;

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

function deleteSelectedMessage() {
  showActionsMenu.value = false;
  showDeleteMessageDialog.value = true;
}

async function confirmDeleteMessage() {
  const token = session.activeAccount.value?.token;
  const id = selectedMessageId.value;
  if (!token || !id || isDeleting.value) return;

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
    showDeleteMessageDialog.value = false;
    router.push(routePrefix.value || '/');
  } catch (err) {
    errorDialog.value = {
      open: true,
      title: 'Error',
      message: 'Failed to delete message: ' + err.message,
    };
  } finally {
    isDeleting.value = false;
    showDeleteMessageDialog.value = false;
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
    errorDialog.value = {
      open: true,
      title: 'Error',
      message: 'Failed to download attachment: ' + err.message,
    };
  } finally {
    isDownloadingAttachment.value[att.id] = false;
  }
}

const safeIframeContent = computed(() => {
  if (!selectedMessageDetail.value) return '';

  const injectedBaseAndStyles = `
    <base target="_blank">
    <style>
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-y: hidden !important;
        height: auto !important;
        min-height: 0 !important;
      }
      #email-content-wrapper {
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        height: auto !important;
        min-height: 0 !important;
      }
    </style>
  `;

  if (selectedMessageDetail.value.body_html) {
    let html = selectedMessageDetail.value.body_html;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => match + injectedBaseAndStyles);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, (match) => match + '<head>' + injectedBaseAndStyles + '</head>');
    } else {
      html = '<head>' + injectedBaseAndStyles + '</head>' + html;
    }

    if (/<body[^>]*>/i.test(html)) {
      html = html
        .replace(/<body([^>]*)>/i, '<body$1><div id="email-content-wrapper">')
        .replace(/<\/body>/i, '</div></body>');
    } else {
      html = `<!DOCTYPE html><html><head>${injectedBaseAndStyles}</head><body><div id="email-content-wrapper">${html}</div></body></html>`;
    }

    return html;
  }

  const escapedText = escapeHtml(selectedMessageDetail.value.body_text || '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${injectedBaseAndStyles}<style>#email-content-wrapper{font-family:sans-serif;font-size:14px;line-height:1.5;color:#16161a;padding:20px;white-space:pre-wrap;word-break:break-word;}@media(prefers-color-scheme:dark){#email-content-wrapper{color:#e2e8f0;background:#0f172a;}}</style></head><body><div id="email-content-wrapper">${escapedText}</div></body></html>`;
});

const emailIframeRef = ref(null);
let iframeResizeObserver = null;

function updateIframeHeight() {
  const iframe = emailIframeRef.value;
  if (!iframe) return;

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const wrapper = doc.getElementById('email-content-wrapper');
    let targetHeight = 0;

    if (wrapper) {
      targetHeight = Math.ceil(wrapper.getBoundingClientRect().height || wrapper.scrollHeight);
    } else if (doc.body) {
      targetHeight = Math.ceil(doc.body.scrollHeight || doc.documentElement.scrollHeight);
    }

    if (targetHeight > 0) {
      iframe.style.height = `${targetHeight}px`;
    }
  } catch (err) {
    console.error('Failed to adjust email iframe height:', err);
  }
}

function handleIframeLoad() {
  const iframe = emailIframeRef.value;
  if (!iframe) return;

  if (iframeResizeObserver) {
    iframeResizeObserver.disconnect();
    iframeResizeObserver = null;
  }

  updateIframeHeight();

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const target = doc.getElementById('email-content-wrapper') || doc.body;

    if (window.ResizeObserver && target) {
      iframeResizeObserver = new ResizeObserver(() => {
        updateIframeHeight();
      });
      iframeResizeObserver.observe(target);
    }

    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', updateIframeHeight, { once: true });
        img.addEventListener('error', updateIframeHeight, { once: true });
      }
    });
  } catch (err) {
    console.error('Failed to setup iframe observer:', err);
  }
}

// Adaptive Polling: 4s active tab, 30s background tab
let pollTimer = null;

function scheduleNextPoll() {
  if (pollTimer) clearTimeout(pollTimer);
  const interval = rateLimitState.value.isLimited
    ? (rateLimitState.value.retryAfter + 1) * 1000
    : (document.visibilityState === 'visible' ? 4000 : 30000);
  pollTimer = setTimeout(async () => {
    if (session.activeAccount.value) {
      await fetchMessages(true);
    }
    scheduleNextPoll();
  }, interval);
}

watch(
  () => rateLimitState.value.isLimited,
  (limited) => {
    if (!limited && session.activeAccount.value) {
      scheduleNextPoll();
    }
  }
);

function handleVisibilityChange() {
  updateDocumentTitle();
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
    selectedMessageDetail.value = null;
    rawSourceText.value = '';
    hasInitialFetch.value = false;
    if (typeof document !== 'undefined') {
      document.title = defaultTitle.value;
    }
    if (route.params.id) {
      router.push(routePrefix.value || '/');
    }
    if (newId) {
      fetchMessages(false);
    } else {
      messages.value = [];
      session.setStorageBytes(0);
    }
  }
);

onMounted(() => {
  if (typeof document !== 'undefined') {
    defaultTitle.value = document.title;
  }
  if (session.activeAccount.value) {
    fetchMessages(false);
  }
  scheduleNextPoll();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pvrge:refresh', handleExternalRefresh);
});

onUnmounted(() => {
  if (iframeResizeObserver) {
    iframeResizeObserver.disconnect();
    iframeResizeObserver = null;
  }
  if (pollTimer) clearTimeout(pollTimer);
  if (copyTimer) clearTimeout(copyTimer);
  if (toastTimer) clearTimeout(toastTimer);
  if (typeof document !== 'undefined') {
    document.title = defaultTitle.value;
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pvrge:refresh', handleExternalRefresh);
});
</script>

<template>
  <div v-if="rateLimitState.isLimited" class="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
    <div class="flex items-center gap-2.5 text-sm">
      <span>{{ rateLimitState.message || 'Rate limit reached.' }} Auto-refresh resumes in <strong class="font-semibold tabular-nums">{{ rateLimitState.retryAfter }}s</strong>.</span>
    </div>
  </div>

  <!-- In-App Toast Banner -->
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform -translate-y-2 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-2 opacity-0"
  >
    <div
      v-if="inAppToast"
      class="mb-4 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm dark:border-emerald-700/50 dark:bg-emerald-950/60 dark:text-emerald-200"
    >
      <div class="flex items-center gap-3">
        <div class="p-1.5 rounded-full bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 shrink-0">
          <Bell class="size-4" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold truncate">{{ inAppToast.title }}</p>
          <p class="text-xs opacity-90 truncate">{{ inAppToast.body }}</p>
        </div>
      </div>
      <button
        type="button"
        @click="inAppToast = null"
        class="text-emerald-700 dark:text-emerald-300 hover:opacity-75 p-1 cursor-pointer shrink-0 ml-2"
        title="Dismiss alert"
      >
        <Times class="size-4" />
      </button>
    </div>
  </transition>

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
      <div class="mt-2 flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <h2 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">
            Inbox
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="!isSecureContext"
            class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50"
          >
            In-App Alerts Active (HTTP)
          </span>
          <template v-else>
            <span
              v-if="notificationPermission === 'granted'"
              class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30"
            >
              <Bell class="size-3.5" />
              Notifications Active
            </span>
            <button
              v-else
              type="button"
              @click="requestNotificationPermission"
              class="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700/60 transition cursor-pointer"
            >
              <Bell class="size-3.5 text-gray-500 dark:text-gray-400" />
              Enable Notifications
            </button>
          </template>
        </div>
      </div>

      <!-- Card List -->
      <div class="mt-6 overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800/75">
        <ul class="divide-y divide-gray-200 dark:divide-gray-700/50">
          <li v-for="msg in messages" :key="msg.id">
            <div
              @click="router.push(routePrefix.value + '/view/' + msg.id)"
              class="group block transition hover:bg-gray-50 focus:outline-none dark:hover:bg-gray-900/50 dark:focus:bg-gray-900/50 cursor-pointer"
            >
              <div class="flex items-center p-4 sm:px-6">
                <div class="flex min-w-0 flex-1 items-center">
                  <div class="shrink-0">
                    <span class="relative inline-block">
                      <div data-slot="root" class="relative inline-flex items-center justify-center shrink-0">
                        <span data-slot="root" class="inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle size-11 text-[22px] bg-lime-200 dark:bg-lime-700 transition">
                          <span data-slot="fallback" class="truncate leading-none font-medium text-gray-600 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-200">
                            {{ (msg.from_name || msg.from_address || '?').charAt(0).toUpperCase() }}
                          </span>
                        </span>
                      </div>
                    </span>
                  </div>
                  <div class="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div class="min-w-0 flex-auto">
                      <div class="flex items-center gap-2">
                        <span class="truncate text-sm/5 font-medium text-emerald-600 dark:text-emerald-400">
                          {{ msg.from_name || msg.from_address }}
                        </span>
                        <button
                          v-if="getMsgOtp(msg)"
                          type="button"
                          @click.stop.prevent="copyToClipboard(getMsgOtp(msg), 'otp-' + msg.id)"
                          class="md:hidden inline-flex items-center gap-1 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-mono font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/60 shadow-xs transition cursor-pointer"
                          title="Copy verification code"
                        >
                          <Check v-if="copiedKey === 'otp-' + msg.id" class="size-3 text-emerald-600 dark:text-emerald-400" />
                          <Copy v-else class="size-3 text-emerald-700 dark:text-emerald-400" />
                          <span>{{ copiedKey === 'otp-' + msg.id ? 'Copied!' : getMsgOtp(msg) }}</span>
                        </button>
                      </div>
                      <div class="mt-1 flex items-center text-sm/5 text-gray-500 dark:text-gray-400">
                        <Envelope class="text-gray-400 mr-1.5 size-4 shrink-0" />
                        <span class="truncate">{{ msg.from_address }}</span>
                      </div>
                    </div>
                    <div class="hidden md:block">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="truncate text-sm/5 text-gray-900 dark:text-gray-300">
                            {{ msg.subject || '(No subject)' }}
                          </span>
                          <button
                            v-if="getMsgOtp(msg)"
                            type="button"
                            @click.stop.prevent="copyToClipboard(getMsgOtp(msg), 'otp-' + msg.id)"
                            class="inline-flex items-center gap-1 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-mono font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/60 shadow-xs transition cursor-pointer"
                            title="Copy verification code"
                          >
                            <Check v-if="copiedKey === 'otp-' + msg.id" class="size-3 text-emerald-600 dark:text-emerald-400" />
                            <Copy v-else class="size-3 text-emerald-700 dark:text-emerald-400" />
                            <span>{{ copiedKey === 'otp-' + msg.id ? 'Copied!' : getMsgOtp(msg) }}</span>
                          </button>
                        </div>
                        <div class="mt-1 flex items-center truncate text-sm/5 text-gray-400 dark:text-gray-400">
                          {{ msg.intro || msg.snippet }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="shrink-0 ml-4">
                  <ChevronRight class="size-5 text-gray-400" />
                </div>
              </div>
            </div>
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

      <div v-else-if="isShowingSource">
        <router-link
          :to="routePrefix.value + '/view/' + (selectedMessageDetail?.id || route.params.id)"
          class="inline-flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500 mb-2"
        >
          <svg class="mr-1 -ml-1 size-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          Back
        </router-link>

        <div class="mt-2 md:flex md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">Source</h1>
          </div>
          <div class="relative mt-4 flex shrink-0 md:mt-0 md:ml-4">
            <button
              type="button"
              @click="showActionsMenu = !showActionsMenu"
              class="rounded-md font-medium inline-flex items-center text-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 p-1.5 transition cursor-pointer"
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
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
              >
                <Download class="size-4 shrink-0" />
                <span>Download</span>
              </button>

              <!-- View message -->
              <button
                type="button"
                @click="() => { showActionsMenu = false; router.push(routePrefix.value + '/view/' + (selectedMessageDetail?.id || route.params.id)); }"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
              >
                <Code class="size-4 shrink-0" />
                <span>View message</span>
              </button>

              <!-- Print -->
              <button
                type="button"
                @click="printEmail"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
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
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50 cursor-pointer"
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
        <router-link :to="routePrefix.value || '/'" class="inline-flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500">
          <svg class="mr-1 -ml-1 size-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          Back
        </router-link>

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
              class="rounded-md font-medium inline-flex items-center text-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 p-1.5 transition cursor-pointer"
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
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
              >
                <Download class="size-4 shrink-0" />
                <span>Download</span>
              </button>

              <!-- Source -->
              <button
                type="button"
                @click="() => { showActionsMenu = false; router.push(routePrefix.value + '/view/' + (selectedMessageDetail?.id || route.params.id) + '/source'); }"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
              >
                <Code class="size-4 shrink-0" />
                <span>Source</span>
              </button>

              <!-- Print -->
              <button
                type="button"
                @click="printEmail"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
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
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50 cursor-pointer"
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
                  <div class="flex flex-wrap items-center gap-1.5 text-lg/6 font-medium text-emerald-600 dark:text-emerald-400">
                    <span>{{ selectedMessageDetail.sender_name || selectedMessageDetail.sender_email }}</span>
                    <span v-if="selectedMessageDetail.sender_name && selectedMessageDetail.sender_email" class="text-sm/5 font-normal text-gray-700 dark:text-gray-400">
                      {{ selectedMessageDetail.sender_email }}
                    </span>
                    <span
                      v-if="selectedMessageDetail.auth_status === 'pass'"
                      class="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30"
                    >Verified</span>
                    <span
                      v-else
                      class="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30"
                    >Unverified</span>
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

          <!-- OTP Banner di atas body email -->
          <div
            v-if="getMsgOtp(selectedMessageDetail)"
            class="mx-4 sm:mx-6 mt-6 flex items-center justify-between rounded-lg border border-lime-300 bg-lime-50/80 p-3 sm:p-4 dark:border-lime-700/50 dark:bg-lime-950/30"
          >
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-md bg-lime-200 dark:bg-lime-800/60 text-lime-800 dark:text-lime-200 font-mono font-bold text-xs uppercase">
                OTP
              </div>
              <div>
                <div class="text-xs font-medium uppercase tracking-wider text-lime-800 dark:text-lime-300">
                  Verification Code Detected
                </div>
                <div class="font-mono text-xl font-bold tracking-widest text-gray-900 dark:text-white">
                  {{ getMsgOtp(selectedMessageDetail) }}
                </div>
              </div>
            </div>
            <button
              type="button"
              @click="copyToClipboard(getMsgOtp(selectedMessageDetail), 'detail-otp')"
              class="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700/60 transition cursor-pointer"
            >
              <Check v-if="copiedKey === 'detail-otp'" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="size-3.5 text-gray-500 dark:text-gray-400" />
              <span>{{ copiedKey === 'detail-otp' ? 'Copied!' : 'Copy Code' }}</span>
            </button>
          </div>

          <div class="px-4 py-5 sm:px-6">
            <iframe
              ref="emailIframeRef"
              class="w-full border-0 block"
              :srcdoc="safeIframeContent"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              scrolling="no"
              style="overflow: hidden; height: 150px;"
              @load="handleIframeLoad"
            ></iframe>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Dialogs -->
    <AlertDialog :open="showDeleteMessageDialog" @update:open="showDeleteMessageDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Message</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this message? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteMessage" class="bg-rose-600 hover:bg-rose-700 text-white">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="errorDialog.open" @update:open="errorDialog.open = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ errorDialog.title }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ errorDialog.message }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction @click="errorDialog.open = false">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
