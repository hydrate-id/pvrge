<script setup>
import { ShieldCheck, EyeOff, Trash2, Lock, ArrowLeft } from 'lucide-vue-next';
</script>

<template>
  <div class="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
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
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 mb-4">
          <ShieldCheck class="w-3.5 h-3.5" />
          Privacy First
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p class="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Our architecture is intentionally built around zero personal data retention and automatic 24-hour purges.
        </p>
      </div>

      <!-- Content Sections -->
      <div class="space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
        <section class="space-y-3">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <EyeOff class="w-5 h-5 text-emerald-500" />
            <h2>Zero Personal Identity Logging</h2>
          </div>
          <p>
            We do not require your real name, phone number, physical address, payment details, or personal email address to use pvrge. We do not track users across websites, sell browsing habits to advertisers, or construct behavioral profiles.
          </p>
        </section>

        <section class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <Trash2 class="w-5 h-5 text-emerald-500" />
            <h2>Automated 24-Hour Message Purge</h2>
          </div>
          <p>
            Incoming emails, attachments, headers, and metadata are automatically and irrevocably deleted 24 hours after arrival. Once purged by our scheduled worker, raw emails stored in Cloudflare R2 and records in Cloudflare D1 cannot be recovered by anyone—including our engineers.
          </p>
        </section>

        <section class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <Lock class="w-5 h-5 text-emerald-500" />
            <h2>Security & Storage Architecture</h2>
          </div>
          <p>
            Mailboxes are protected by cryptographic password hashing (PBKDF2/SHA-256 with unique salts). Account authentication tokens are signed with JSON Web Tokens (JWT). All communications between your browser and our edge servers are encrypted over TLS.
          </p>
        </section>

        <section class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <ShieldCheck class="w-5 h-5 text-emerald-500" />
            <h2>Local Client Data</h2>
          </div>
          <p>
            Your saved session keys and theme preferences are stored strictly in your browser's local storage (<code class="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">localStorage</code>). You can delete your active mailbox and clear local tokens at any time using the account dropdown menu.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
