<script setup>
import { HelpCircle, Clock, Key, ShieldCheck, Mail, ArrowRight, ArrowLeft } from 'lucide-vue-next';
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
          <HelpCircle class="w-3.5 h-3.5" />
          Knowledge Base
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p class="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Learn how pvrge protects your identity, manages message lifecycles, and lets you retain mailbox access across sessions.
        </p>
      </div>

      <!-- FAQ Items -->
      <div class="space-y-4">
        <!-- FAQ 1 -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Mail class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                What is pvrge disposable temporary email?
              </h3>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                pvrge provides instant, throwaway email addresses to shield your personal inbox from spam, tracking, newsletters, and data breaches. Use it when registering for unfamiliar websites, testing applications, or signing up for trials.
              </p>
            </div>
          </div>
        </div>

        <!-- FAQ 2 -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                How does the 24-hour message retention and auto-purge work?
              </h3>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Every message and attachment delivered to your inbox is strictly kept for <strong>24 hours</strong>. After 24 hours, our automated worker permanently purges message metadata from the database and deletes all raw email bodies and attachments from Cloudflare R2 object storage.
              </p>
            </div>
          </div>
        </div>

        <!-- FAQ 3 -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Key class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Can I access my mailbox again later using my password?
              </h3>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Yes! Unlike other throwaway email services where you lose access once your session clears, pvrge creates a unique password for each inbox. Click the <strong>Password</strong> button in the navigation bar to view and copy your credentials. You can log back into this exact address anytime via the <strong>Login Existing</strong> modal.
              </p>
            </div>
          </div>
        </div>

        <!-- FAQ 4 -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-start gap-4">
            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Can I have multiple mailboxes at once?
              </h3>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Absolutely. Our multi-session switcher allows you to create and switch between multiple temporary addresses simultaneously. All your active mailboxes remain preserved in your local browser storage.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Back to Inbox Banner -->
      <div class="mt-10 mb-6 text-center">
        <router-link
          to="/"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
        >
          <span>Open Your Mailbox</span>
          <ArrowRight class="w-4 h-4" />
        </router-link>
      </div>
    </div>
  </div>
</template>
