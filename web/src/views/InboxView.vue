<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSession } from '../composables/useSession';
import EnvelopeIllustration from '../components/EnvelopeIllustration.vue';
import Envelope from '@primeicons/vue/envelope';
import ChevronRight from '@primeicons/vue/chevron-right';
import ChevronDown from '@primeicons/vue/chevron-down';
import Spinner from '@primeicons/vue/spinner';
import Paperclip from '@primeicons/vue/paperclip';
import Times from '@primeicons/vue/times';
import Trash from '@primeicons/vue/trash';
import EllipsisV from '@primeicons/vue/ellipsis-v';
import Download from '@primeicons/vue/download';
import Code from '@primeicons/vue/code';
import Print from '@primeicons/vue/print';
import Reply from '@primeicons/vue/reply';
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
const { activeAccount, dutySession, rateLimitState, handleResponseStatus } = session;

const routePrefix = computed(() => route.path.startsWith('/onduty') ? '/onduty' : '');
const apiMessagesBase = computed(() => routePrefix.value === '/onduty' ? '/api/duty/messages' : '/api/messages');

const currentAccount = computed(() => {
  if (routePrefix.value === '/onduty') {
    return dutySession.value?.account;
  }
  return activeAccount.value;
});

const isAuthenticated = computed(() => {
  if (routePrefix.value === '/onduty') {
    return session.isDutyActive.value;
  }
  return Boolean(activeAccount.value?.id);
});

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

const isOnDutyMode = computed(() => routePrefix.value === '/onduty' || session.isDutyActive.value);
const showReplyBox = ref(false);
const replySubject = ref('');
const replyBody = ref('');
const isSendingReply = ref(false);
const replyError = ref('');
const replySuccess = ref('');

function openReplyBox() {
  replySubject.value = 'Re: ' + (selectedMessageDetail.value?.subject || '');
  replyBody.value = '';
  replyError.value = '';
  replySuccess.value = '';
  showReplyBox.value = true;
}

function cancelReply() {
  showReplyBox.value = false;
  replyBody.value = '';
  replyError.value = '';
}

async function submitEmailReply() {
  if (!replyBody.value.trim() || isSendingReply.value) return;
  isSendingReply.value = true;
  replyError.value = '';
  replySuccess.value = '';
  try {
    const res = await fetch(`/api/duty/messages/${selectedMessageDetail.value.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: replySubject.value,
        body: replyBody.value
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reply');
    }
    replySuccess.value = 'Reply sent successfully!';
    showReplyBox.value = false;
    replyBody.value = '';
    await fetchMessageDetail(selectedMessageDetail.value.id);
  } catch (err) {
    replyError.value = err.message || 'Failed to send reply';
  } finally {
    isSendingReply.value = false;
  }
}
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

  if (!isAuthenticated.value) return;

  if (!quiet) isLoadingList.value = true;
  try {
    const res = await fetch(apiMessagesBase.value);
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
  if (!isAuthenticated.value || !id) return;

  isLoadingDetail.value = true;
  try {
    const res = await fetch(`${apiMessagesBase.value}/${id}`);
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
  if (!isAuthenticated.value || !id) return;

  isLoadingDetail.value = true;
  try {
    const res = await fetch(`${apiMessagesBase.value}/${id}/source`);
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
  [() => route.params.id, () => isAuthenticated.value, () => route.path],
  async ([id, authenticated, path]) => {
    if (!id || !authenticated) {
      selectedMessageDetail.value = null;
      rawSourceText.value = '';
      return;
    }
    if (selectedMessageDetail.value?.id !== id) {
      rawSourceText.value = '';
      await fetchMessageDetail(id);
    }
    if (path && path.endsWith('/source')) {
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

function toggleSource() {
  showActionsMenu.value = false;
  const id = selectedMessageDetail.value?.id || route.params.id;
  if (!id) return;
  const prefix = routePrefix.value || '';
  if (isShowingSource.value) {
    router.push(prefix + '/view/' + id);
  } else {
    router.push(prefix + '/view/' + id + '/source');
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
  const id = selectedMessageId.value;
  if (!isAuthenticated.value || !id || isDeleting.value) return;

  isDeleting.value = true;
  try {
    const res = await fetch(`${apiMessagesBase.value}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
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

async function downloadAttachment(att, customMsgId = null) {
  const msgId = customMsgId || selectedMessageId.value;
  if (!isAuthenticated.value || !msgId || !att?.id) return;

  isDownloadingAttachment.value[att.id] = true;
  try {
    const res = await fetch(`${apiMessagesBase.value}/${msgId}/attachments/${att.id}`);
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

function parseTimelineTime(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  if (!str.includes('T') && str.includes(' ')) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str = str + 'Z';
  }
  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

const conversationTimeline = computed(() => {
  if (!selectedMessageDetail.value) return [];

  const rawIncoming = (selectedMessageDetail.value.thread_messages && selectedMessageDetail.value.thread_messages.length > 0)
    ? selectedMessageDetail.value.thread_messages
    : [selectedMessageDetail.value];

  const incomingItems = rawIncoming.map((msg) => ({
    ...msg,
    timelineType: 'incoming',
    timestamp: parseTimelineTime(msg.received_at || msg.created_at),
  }));

  const replyItems = (selectedMessageDetail.value.replies || []).map((rep) => ({
    ...rep,
    timelineType: 'reply',
    timestamp: parseTimelineTime(rep.created_at),
  }));

  return [...incomingItems, ...replyItems].sort((a, b) => a.timestamp - b.timestamp);
});

const expandedEntries = ref(new Set());

function isEntryExpanded(id) {
  return expandedEntries.value.has(id);
}

function toggleEntry(id) {
  if (expandedEntries.value.has(id)) {
    expandedEntries.value.delete(id);
  } else {
    expandedEntries.value.add(id);
  }
}

function expandAllEntries() {
  for (const item of conversationTimeline.value) {
    expandedEntries.value.add(item.id);
  }
  showActionsMenu.value = false;
}

function collapseAllEntries() {
  expandedEntries.value.clear();
  if (conversationTimeline.value.length > 0) {
    expandedEntries.value.add(conversationTimeline.value[conversationTimeline.value.length - 1].id);
  }
  showActionsMenu.value = false;
}

watch(
  conversationTimeline,
  (timeline) => {
    if (timeline && timeline.length > 0) {
      expandedEntries.value.clear();
      // Default: only the newest (last) entry is expanded!
      expandedEntries.value.add(timeline[timeline.length - 1].id);
    }
  },
  { immediate: true }
);

const activeActionMenuId = ref(null);

function toggleActionMenu(id) {
  activeActionMenuId.value = activeActionMenuId.value === id ? null : id;
}

function closeActionMenu() {
  activeActionMenuId.value = null;
}

async function downloadEntry(entry) {
  closeActionMenu();
  try {
    let raw = entry.raw_source || '';
    if (!raw && entry.timelineType === 'incoming') {
      const res = await fetch(`${apiMessagesBase.value}/${entry.id}/source`);
      if (res.ok) raw = await res.text();
    }
    const content = raw || entry.body_html || entry.body_text || entry.body || '';
    const filename = `${entry.subject || 'message'}.${raw ? 'eml' : 'html'}`;
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
  } catch (err) {
    console.error('Error downloading entry:', err);
  }
}

function printEntry(entry) {
  closeActionMenu();
  const escapedText = escapeHtml(entry.body_text || entry.body || '');
  const bodyContent = entry.body_html || `<pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.5;">${escapedText}</pre>`;

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
    <title>${entry.subject || 'Print Message'}</title>
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

function viewEntrySource(entry) {
  closeActionMenu();
  router.push(`${routePrefix.value}/view/${entry.id}/source`);
}

const entryToDelete = ref(null);
const showDeleteEntryDialog = ref(false);

function requestDeleteEntry(entry) {
  closeActionMenu();
  entryToDelete.value = entry;
  showDeleteEntryDialog.value = true;
}

async function confirmDeleteEntry() {
  if (!entryToDelete.value) return;
  const target = entryToDelete.value;
  showDeleteEntryDialog.value = false;
  isDeleting.value = true;
  try {
    const url = target.timelineType === 'reply'
      ? `/api/duty/replies/${target.id}`
      : `${apiMessagesBase.value}/${target.id}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to delete item');

    if (conversationTimeline.value.length <= 1) {
      messages.value = messages.value.filter((m) => m.id !== target.id);
      router.push(routePrefix.value || '/');
    } else {
      await fetchMessageDetail(selectedMessageId.value);
    }
  } catch (err) {
    errorDialog.value = {
      open: true,
      title: 'Error',
      message: 'Failed to delete item: ' + err.message,
    };
  } finally {
    isDeleting.value = false;
    entryToDelete.value = null;
  }
}

const showDeleteThreadDialog = ref(false);

function deleteCurrentThread() {
  showActionsMenu.value = false;
  showDeleteThreadDialog.value = true;
}

async function confirmDeleteThread() {
  const currentMsg = selectedMessageDetail.value;
  if (!currentMsg) return;
  const threadId = currentMsg.thread_id || currentMsg.id;
  showDeleteThreadDialog.value = false;
  isDeleting.value = true;

  try {
    const endpoint = apiMessagesBase.value === '/api/duty/messages'
      ? `/api/duty/threads/${threadId}`
      : `/api/messages/thread/${threadId}`;

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to delete thread');

    messages.value = messages.value.filter((m) => (m.thread_id || m.id) !== threadId && m.id !== currentMsg.id);
    router.push(routePrefix.value || '/');
  } catch (err) {
    errorDialog.value = {
      open: true,
      title: 'Error',
      message: 'Failed to delete thread: ' + err.message,
    };
  } finally {
    isDeleting.value = false;
  }
}

function getSafeIframeContent(msg) {
  if (!msg) return '';

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

  if (msg.body_html) {
    let html = msg.body_html;
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

  const escapedText = escapeHtml(msg.body_text || '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${injectedBaseAndStyles}<style>#email-content-wrapper{font-family:sans-serif;font-size:14px;line-height:1.5;color:#16161a;padding:20px;white-space:pre-wrap;word-break:break-word;}@media(prefers-color-scheme:dark){#email-content-wrapper{color:#e2e8f0;background:#0f172a;}}</style></head><body><div id="email-content-wrapper">${escapedText}</div></body></html>`;
}

const safeIframeContent = computed(() => {
  return getSafeIframeContent(selectedMessageDetail.value);
});

function handleTimelineIframeLoad(e) {
  const iframe = e?.target;
  if (!iframe) return;

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const wrapper = doc.getElementById('email-content-wrapper');
    const updateHeight = () => {
      let targetHeight = 0;
      if (wrapper) {
        targetHeight = Math.ceil(wrapper.getBoundingClientRect().height || wrapper.scrollHeight);
      } else if (doc.body) {
        targetHeight = Math.ceil(doc.body.scrollHeight || doc.documentElement.scrollHeight);
      }
      if (targetHeight > 0) {
        iframe.style.height = `${targetHeight}px`;
      }
    };

    updateHeight();

    if (window.ResizeObserver && (wrapper || doc.body)) {
      const observer = new ResizeObserver(() => updateHeight());
      observer.observe(wrapper || doc.body);
    }

    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', updateHeight, { once: true });
        img.addEventListener('error', updateHeight, { once: true });
      }
    });
  } catch (err) {
    console.error('Failed to adjust timeline iframe height:', err);
  }
}

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
    if (isAuthenticated.value) {
      await fetchMessages(true);
    }
    scheduleNextPoll();
  }, interval);
}

watch(
  () => rateLimitState.value.isLimited,
  (limited) => {
    if (!limited && isAuthenticated.value) {
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
  () => (routePrefix.value === '/onduty' ? session.isDutyActive.value : session.activeAccountId.value),
  (newVal, oldVal) => {
    if (newVal === oldVal) return;
    selectedMessageDetail.value = null;
    rawSourceText.value = '';
    hasInitialFetch.value = false;
    if (typeof document !== 'undefined') {
      document.title = defaultTitle.value;
    }
    // Hanya push jika bukan inisialisasi awal dan route.params.id ada
    if (oldVal !== undefined && route.params.id) {
      router.push(routePrefix.value || '/');
    }
    if (isAuthenticated.value) {
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
  if (isAuthenticated.value) {
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
              @click="selectMessage(msg.id)"
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
                        <span
                          v-if="msg.thread_count && msg.thread_count > 1"
                          class="md:hidden inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shrink-0"
                          title="Messages in thread"
                        >
                          {{ msg.thread_count }}
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
                        <Paperclip
                          v-if="msg.has_attachments === 1"
                          class="md:hidden ml-1.5 size-3.5 shrink-0 text-gray-400 dark:text-gray-500"
                        />
                      </div>
                    </div>
                    <div class="hidden md:block">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="truncate text-sm/5 text-gray-900 dark:text-gray-300">
                            {{ msg.subject || '(No subject)' }}
                          </span>
                          <span
                            v-if="msg.thread_count && msg.thread_count > 1"
                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shrink-0"
                            title="Messages in thread"
                          >
                            {{ msg.thread_count }}
                          </span>
                          <Paperclip
                            v-if="msg.has_attachments === 1"
                            class="size-3.5 shrink-0 text-gray-400 dark:text-gray-500"
                          />
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
          :to="(routePrefix || '') + '/view/' + (selectedMessageDetail?.id || route.params.id)"
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
                @click="toggleSource"
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
        <router-link :to="routePrefix || '/'" class="inline-flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500">
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
          <div class="relative mt-4 flex shrink-0 items-center gap-2 md:mt-0 md:ml-4">
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
              <template v-if="conversationTimeline.length > 1">
                <button
                  type="button"
                  @click="expandAllEntries"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                >
                  <ChevronDown class="size-4 shrink-0" />
                  <span>Expand All</span>
                </button>
                <button
                  type="button"
                  @click="collapseAllEntries"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                >
                  <ChevronRight class="size-4 shrink-0" />
                  <span>Collapse All</span>
                </button>
                <div class="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                <button
                  type="button"
                  @click="deleteCurrentThread"
                  :disabled="isDeleting"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Trash class="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>Delete Thread</span>
                </button>
              </template>
              <template v-else>
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
                  @click="toggleSource"
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
              </template>
            </div>
          </div>
        </div>

        <!-- Conversation Timeline jika conversationTimeline.length > 1 -->
        <div v-if="conversationTimeline.length > 1" class="space-y-3 mt-4">
          <div
            v-for="entry in conversationTimeline"
            :key="entry.timelineType + '-' + entry.id"
          >
            <!-- ================= Pesan Masuk (incoming) ================= -->
            <div v-if="entry.timelineType === 'incoming'">
              <!-- Collapsed Incoming Row -->
              <div
                v-if="!isEntryExpanded(entry.id)"
                @click="toggleEntry(entry.id)"
                class="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 shadow-xs hover:bg-gray-50/80 dark:hover:bg-gray-800 transition cursor-pointer select-none"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span class="inline-flex items-center justify-center shrink-0 rounded-full size-8 text-sm font-medium bg-lime-200 text-gray-700 dark:bg-lime-800 dark:text-lime-200">
                    {{ getInitial(entry.sender_name || entry.sender_email) }}
                  </span>
                  <span class="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 shrink-0">
                    {{ entry.sender_name || entry.sender_email }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ entry.snippet || entry.body_text || entry.subject }}
                  </span>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                  <Paperclip v-if="entry.attachments && entry.attachments.length > 0" class="size-3.5 text-gray-400" />
                  <time class="text-xs text-gray-400 whitespace-nowrap" :title="formatFullDate(entry.created_at || entry.received_at)">
                    {{ formatRelativeTime(entry.created_at || entry.received_at) }}
                  </time>
                  <ChevronDown class="size-3.5 text-gray-400 -rotate-90 transition-transform" />
                </div>
              </div>

              <!-- Expanded Incoming Card -->
              <div
                v-else
                class="overflow-hidden border border-gray-200 bg-white shadow sm:rounded-md dark:border-gray-900 dark:bg-gray-800/75"
              >
                <div class="px-4 py-5 sm:px-6">
                  <div class="-mt-4 -ml-4 flex flex-wrap items-center justify-between sm:flex-nowrap">
                    <div class="mt-4 ml-4">
                      <div class="flex items-center">
                        <div class="shrink-0">
                          <span class="inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle size-10 text-xl bg-lime-200 dark:bg-lime-700 transition">
                            <span class="truncate leading-none font-medium text-gray-600 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-200">
                              {{ getInitial(entry.sender_name || entry.sender_email) }}
                            </span>
                          </span>
                        </div>
                        <div class="ml-4">
                          <div class="flex flex-wrap items-center gap-1.5 text-lg/6 font-medium text-emerald-600 dark:text-emerald-400">
                            <span>{{ entry.sender_name || entry.sender_email }}</span>
                            <span v-if="entry.sender_name && entry.sender_email" class="text-sm/5 font-normal text-gray-700 dark:text-gray-400">
                              {{ entry.sender_email }}
                            </span>
                            <span
                              v-if="entry.auth_status === 'pass'"
                              class="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30"
                            >Verified</span>
                            <span
                              v-else-if="entry.auth_status && entry.auth_status !== 'none'"
                              class="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30"
                            >Unverified</span>
                          </div>
                          <div class="flex items-center text-sm/5 text-gray-500 dark:text-gray-400">
                            <svg class="mr-1.5 size-5 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="truncate">
                              <a :href="'mailto:' + currentAccount?.email" class="ml-1">{{ currentAccount?.email }};</a>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="mt-4 ml-4 flex shrink-0 items-center gap-2">
                      <time class="truncate text-gray-500 dark:text-gray-400 text-sm" :title="formatFullDate(entry.created_at || entry.received_at)">
                        {{ formatRelativeTime(entry.created_at || entry.received_at) }}
                      </time>
                      <div class="relative">
                        <button
                          type="button"
                          @click.stop="toggleActionMenu(entry.id)"
                          class="rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                          title="Message actions"
                        >
                          <EllipsisV class="size-4 shrink-0" />
                        </button>
                        <div
                          v-if="activeActionMenuId === entry.id"
                          class="fixed inset-0 z-40"
                          @click.stop="closeActionMenu"
                        ></div>
                        <div
                          v-if="activeActionMenuId === entry.id"
                          class="absolute right-0 top-full mt-1 w-40 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-gray-700 z-50 py-1 text-xs focus:outline-none"
                        >
                          <button
                            type="button"
                            @click.stop="downloadEntry(entry)"
                            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                          >
                            <Download class="size-3.5 shrink-0" />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            @click.stop="viewEntrySource(entry)"
                            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                          >
                            <Code class="size-3.5 shrink-0" />
                            <span>Source</span>
                          </button>
                          <button
                            type="button"
                            @click.stop="printEntry(entry)"
                            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                          >
                            <Print class="size-3.5 shrink-0" />
                            <span>Print</span>
                          </button>
                          <div class="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                          <button
                            type="button"
                            @click.stop="requestDeleteEntry(entry)"
                            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          >
                            <Trash class="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>Delete email</span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        @click.stop="toggleEntry(entry.id)"
                        class="rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
                        title="Collapse email"
                      >
                        <ChevronDown class="size-4 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <!-- OTP Banner -->
                  <div
                    v-if="getMsgOtp(entry)"
                    class="mt-5 flex items-center justify-between rounded-lg border border-lime-300 bg-lime-50/80 p-3 sm:p-4 dark:border-lime-700/50 dark:bg-lime-950/30"
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
                          {{ getMsgOtp(entry) }}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="copyToClipboard(getMsgOtp(entry), 'timeline-otp-' + entry.id)"
                      class="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700/60 transition cursor-pointer"
                    >
                      <Check v-if="copiedKey === 'timeline-otp-' + entry.id" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <Copy v-else class="size-3.5 text-gray-500 dark:text-gray-400" />
                      <span>{{ copiedKey === 'timeline-otp-' + entry.id ? 'Copied!' : 'Copy Code' }}</span>
                    </button>
                  </div>
                </div>

                <!-- Attachments Section -->
                <div
                  v-if="entry.attachments && entry.attachments.length > 0"
                  class="border-t border-b border-gray-200 px-4 py-3.5 sm:px-6 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/40"
                >
                  <div class="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <Paperclip class="size-3.5" />
                    <span>Attachments ({{ entry.attachments.length }})</span>
                  </div>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    <div
                      v-for="att in entry.attachments"
                      :key="att.id"
                      class="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-2.5 text-xs shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700/60"
                    >
                      <div class="flex min-w-0 items-center gap-2.5">
                        <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400">
                          <Paperclip class="size-3.5" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="truncate font-medium text-gray-900 dark:text-gray-200" :title="att.filename">
                            {{ att.filename }}
                          </p>
                          <p class="text-[11px] text-gray-500 dark:text-gray-400">
                            {{ formatBytes(att.size) }}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        @click="downloadAttachment(att, entry.id)"
                        :disabled="isDownloadingAttachment[att.id]"
                        class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-white hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer"
                        :title="'Download ' + att.filename"
                      >
                        <Spinner v-if="isDownloadingAttachment[att.id]" class="size-3.5 animate-spin text-lime-600 dark:text-lime-400" />
                        <Download v-else class="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Content Body -->
                <div v-if="entry.body_html" class="px-4 py-5 sm:px-6">
                  <iframe
                    class="w-full border-0 block"
                    :srcdoc="getSafeIframeContent(entry)"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    scrolling="no"
                    style="overflow: hidden; height: 150px;"
                    @load="handleTimelineIframeLoad"
                  ></iframe>
                </div>
                <div v-else class="px-4 py-5 sm:px-6 whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {{ entry.body_text || '(Empty message)' }}
                </div>
              </div>
            </div>

            <!-- ================= Balasan Operator (reply) ================= -->
            <div v-else-if="entry.timelineType === 'reply'">
              <!-- Collapsed Reply Row -->
              <div
                v-if="!isEntryExpanded(entry.id)"
                @click="toggleEntry(entry.id)"
                class="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 rounded-md border border-emerald-200/90 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition cursor-pointer select-none border-l-4 border-l-emerald-500"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span class="inline-flex items-center justify-center shrink-0 rounded-full size-8 text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <Reply class="size-4" />
                  </span>
                  <span class="font-semibold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 shrink-0">
                    Operator Reply
                  </span>
                  <span class="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {{ entry.body }}
                  </span>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                  <time class="text-xs text-gray-400 whitespace-nowrap" :title="formatFullDate(entry.created_at)">
                    {{ formatRelativeTime(entry.created_at) }}
                  </time>
                  <ChevronDown class="size-3.5 text-gray-400 -rotate-90 transition-transform" />
                </div>
              </div>

              <!-- Expanded Reply Card -->
              <div
                v-else
                class="overflow-hidden rounded-md border border-emerald-200/90 dark:border-emerald-800/70 bg-emerald-50/30 dark:bg-emerald-950/20 shadow p-4 sm:p-5 border-l-4 border-l-emerald-500"
              >
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-emerald-100 dark:border-emerald-900/40">
                  <div class="flex flex-wrap items-center gap-2">
                    <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <Reply class="size-3.5" />
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                      <span class="font-semibold text-emerald-700 dark:text-emerald-400">{{ entry.sender_email }}</span>
                      <span class="text-gray-400">&rarr;</span>
                      <span class="text-gray-600 dark:text-gray-300">{{ entry.recipient_email }}</span>
                    </div>
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Operator Reply
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <time class="text-xs text-gray-500 dark:text-gray-400" :title="formatFullDate(entry.created_at)">
                      {{ formatRelativeTime(entry.created_at) || entry.created_at }}
                    </time>
                    <div class="relative">
                      <button
                        type="button"
                        @click.stop="toggleActionMenu(entry.id)"
                        class="rounded-md p-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                        title="Reply actions"
                      >
                        <EllipsisV class="size-4 shrink-0" />
                      </button>
                      <div
                        v-if="activeActionMenuId === entry.id"
                        class="fixed inset-0 z-40"
                        @click.stop="closeActionMenu"
                      ></div>
                      <div
                        v-if="activeActionMenuId === entry.id"
                        class="absolute right-0 top-full mt-1 w-40 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-gray-700 z-50 py-1 text-xs focus:outline-none"
                      >
                        <button
                          type="button"
                          @click.stop="printEntry(entry)"
                          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                        >
                          <Print class="size-3.5 shrink-0" />
                          <span>Print</span>
                        </button>
                        <div class="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                        <button
                          type="button"
                          @click.stop="requestDeleteEntry(entry)"
                          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <Trash class="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                          <span>Delete reply</span>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click.stop="toggleEntry(entry.id)"
                      class="rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
                      title="Collapse reply"
                    >
                      <ChevronDown class="size-4 shrink-0" />
                    </button>
                  </div>
                </div>
                <div v-if="entry.subject" class="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-200 mb-2">
                  {{ entry.subject }}
                </div>
                <div class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {{ entry.body }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Single Message View jika conversationTimeline.length <= 1 -->
        <div v-else class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75">
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
                      <a :href="'mailto:' + currentAccount?.email" class="ml-1">{{ currentAccount?.email }};</a>
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

          <!-- Attachments Section -->
          <div
            v-if="selectedMessageDetail.attachments && selectedMessageDetail.attachments.length > 0"
            class="border-b border-gray-200 px-4 py-3.5 sm:px-6 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/40"
          >
            <div class="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Paperclip class="size-3.5" />
              <span>Attachments ({{ selectedMessageDetail.attachments.length }})</span>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              <div
                v-for="att in selectedMessageDetail.attachments"
                :key="att.id"
                class="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-2.5 text-xs shadow-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700/60"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400">
                    <Paperclip class="size-3.5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium text-gray-900 dark:text-gray-200" :title="att.filename">
                      {{ att.filename }}
                    </p>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400">
                      {{ formatBytes(att.size) }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="downloadAttachment(att)"
                  :disabled="isDownloadingAttachment[att.id]"
                  class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-white hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer"
                  :title="'Download ' + att.filename"
                >
                  <Spinner v-if="isDownloadingAttachment[att.id]" class="size-3.5 animate-spin text-lime-600 dark:text-lime-400" />
                  <Download v-else class="size-3.5" />
                </button>
              </div>
            </div>
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

          <!-- Sent Replies History Section -->
          <div
            v-if="selectedMessageDetail.replies && selectedMessageDetail.replies.length > 0"
            class="border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/30"
          >
            <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Reply class="size-3.5" />
              <span>Sent Replies ({{ selectedMessageDetail.replies.length }})</span>
            </div>
            <div class="space-y-3">
              <div
                v-for="rep in selectedMessageDetail.replies"
                :key="rep.id"
                class="rounded-lg border border-emerald-200/80 bg-white p-3.5 text-xs shadow-xs dark:border-emerald-900/50 dark:bg-gray-800"
              >
                <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-emerald-700 dark:text-emerald-400">{{ rep.sender_email }}</span>
                    <span class="text-gray-400">&rarr;</span>
                    <span class="text-gray-600 dark:text-gray-300">{{ rep.recipient_email }}</span>
                  </div>
                  <span class="text-[11px] text-gray-400">{{ rep.created_at }}</span>
                </div>
                <div class="font-medium text-gray-900 dark:text-gray-200 mb-1.5">{{ rep.subject }}</div>
                <div class="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{{ rep.body }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reply Box Section (On-Duty mode only) - tetap berada di bagian paling bawah untuk memudahkan membalas pesan terakhir -->
        <div
          v-if="isOnDutyMode && showReplyBox"
          class="mt-4 overflow-hidden rounded-md border border-gray-200 bg-white p-4 sm:p-6 shadow dark:border-gray-700 dark:bg-gray-800/90"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Reply class="size-4 text-emerald-600 dark:text-emerald-400" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                Reply to <span class="text-emerald-600 dark:text-emerald-400 font-mono">{{ selectedMessageDetail.sender_email }}</span>
              </h3>
            </div>
            <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
              From: {{ currentAccount?.email || 'support@pvrge.com' }}
            </span>
          </div>

          <!-- Error banner -->
          <div
            v-if="replyError"
            class="mb-3 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60"
          >
            {{ replyError }}
          </div>

          <form @submit.prevent="submitEmailReply" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                v-model="replySubject"
                required
                placeholder="Subject..."
                class="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Message Body</label>
              <textarea
                v-model="replyBody"
                required
                rows="6"
                placeholder="Write your email reply here..."
                class="block w-full rounded-md border border-gray-300 bg-white p-3 text-xs text-gray-900 shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white font-sans leading-relaxed"
              ></textarea>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                @click="cancelReply"
                :disabled="isSendingReply"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSendingReply || !replyBody.trim()"
                class="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 focus:outline-none disabled:opacity-50 cursor-pointer transition"
              >
                <Spinner v-if="isSendingReply" class="size-3.5 animate-spin" />
                <Reply v-else class="size-3.5" />
                <span>{{ isSendingReply ? 'Sending...' : 'Send Reply' }}</span>
              </button>
            </div>
          </form>
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

    <AlertDialog :open="showDeleteEntryDialog" @update:open="showDeleteEntryDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {{ entryToDelete?.timelineType === 'reply' ? 'Reply' : 'Email' }}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {{ entryToDelete?.timelineType === 'reply' ? 'reply' : 'email' }}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteEntry" class="bg-rose-600 hover:bg-rose-700 text-white">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="showDeleteThreadDialog" @update:open="showDeleteThreadDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Conversation Thread</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this entire conversation thread? All messages and replies in this thread will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="confirmDeleteThread" class="bg-rose-600 hover:bg-rose-700 text-white">
            Delete Thread
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
