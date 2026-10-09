<script setup>
import { Mail, Send, Copy, Check, ArrowLeft, ExternalLink, Info } from 'lucide-vue-next';
import { ref } from 'vue';

const copied = ref(false);
const email = 'support@pvrge.com';
const telegramUrl = 'https://t.me/pvrgebot';

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(email);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy', e);
  }
}
</script>

<template>
  <div class="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Back to Inbox Button -->
      <div class="mb-6">
        <router-link
          to="/"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Back to Inbox</span>
        </router-link>
      </div>

      <!-- Header -->
      <div class="text-center max-w-2xl mx-auto mb-10">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Contact Support
        </h1>
        <p class="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          If you have any questions, feedback, or need to report abuse, please reach out to us directly through the channels below.
        </p>
      </div>

      <!-- Contact Channels Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <!-- Email Channel Card -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Mail class="w-5 h-5" />
            </div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Email</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Direct email support for general questions, abuse reports, or security disclosures.
            </p>
            <div class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-xl mb-4 truncate select-all">
              {{ email }}
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <a
              :href="`mailto:${email}`"
              class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition active:scale-95"
            >
              <Mail class="w-3.5 h-3.5" />
              <span>Mail Us</span>
            </a>
            <button
              type="button"
              @click="copyEmail"
              class="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition active:scale-95"
            >
              <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <!-- Telegram Channel Card -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
              <Send class="w-5 h-5" />
            </div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Telegram</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Connect with our official Telegram bot for quick assistance and updates.
            </p>
            <div class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-xl mb-4 truncate select-all">
              t.me/pvrgebot
            </div>
          </div>

          <div class="pt-2">
            <a
              :href="telegramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-sm transition active:scale-95"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              <span>Open Telegram</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Notice / Footnote (mail.tm style) -->
      <div class="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs sm:text-sm leading-relaxed">
        <Info class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p>
          <span class="font-bold">Note:</span> pvrge is an ephemeral temporary email service. Incoming messages are permanently deleted after 24 hours. For support inquiries, please contact us from your personal permanent address.
        </p>
      </div>
    </div>
  </div>
</template>
