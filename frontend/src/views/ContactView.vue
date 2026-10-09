<script setup>
import { ChevronLeft, Mail, Send, Copy, Check } from 'lucide-vue-next';
import { ref } from 'vue';

const email = 'support@pvrge.com';
const telegramUrl = 'https://t.me/pvrgebot';
const copied = ref(false);

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
  <div class="max-w-4xl mx-auto space-y-4">
    <!-- Tombol < Back kembali ke / (Inbox) -->
    <div>
      <router-link
        to="/"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
      >
        <ChevronLeft class="h-5 w-5" />
        <span>Back</span>
      </router-link>
    </div>

    <!-- Card wrapper persis mail.tm -->
    <div class="overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Contacts
      </h1>

      <p>
        If you have questions, feedback, abuse reports, or security disclosures, reach out to our team directly through the following channels:
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <!-- Email card -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex flex-col justify-between space-y-3">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-full bg-lime-100 dark:bg-lime-900/60 text-lime-700 dark:text-lime-300 flex items-center justify-center shrink-0">
              <Mail class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">Email Support</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">Direct electronic mail</p>
            </div>
          </div>

          <div class="font-mono text-sm font-semibold text-gray-900 dark:text-white select-all">
            {{ email }}
          </div>

          <div class="flex items-center gap-2 pt-1">
            <a
              :href="`mailto:${email}`"
              class="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold text-white bg-lime-600 hover:bg-lime-500 transition shadow-sm"
            >
              <Mail class="w-3.5 h-3.5" />
              <span>Send Email</span>
            </a>
            <button
              @click="copyEmail"
              class="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Copy email"
            >
              <Check v-if="copied" class="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <!-- Telegram card -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex flex-col justify-between space-y-3">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Send class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">Telegram</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">Official Telegram bot</p>
            </div>
          </div>

          <div class="font-mono text-sm font-semibold text-gray-900 dark:text-white select-all">
            t.me/pvrgebot
          </div>

          <div class="pt-1">
            <a
              :href="telegramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition shadow-sm"
            >
              <Send class="w-3.5 h-3.5" />
              <span>Open Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
