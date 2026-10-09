<script setup>
import { FileText, AlertTriangle, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-vue-next';
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
          <FileText class="w-3.5 h-3.5" />
          Legal Agreement
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms of Service
        </h1>
        <p class="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          By accessing or using the pvrge disposable email service, you agree to comply with these terms.
        </p>
      </div>

      <!-- Content Sections -->
      <div class="space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
        <section class="space-y-3">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <CheckCircle class="w-5 h-5 text-emerald-500" />
            <h2>Acceptable Use</h2>
          </div>
          <p>
            pvrge is provided for temporary communication, personal spam reduction, developer testing, and privacy defense. You may use our service to receive confirmation links, one-time passwords (OTP), and trial notifications.
          </p>
        </section>

        <section class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
            <ShieldAlert class="w-5 h-5" />
            <h2>Prohibited Activities & Abuse</h2>
          </div>
          <p>
            You agree not to use pvrge for any unlawful, deceptive, or harmful purposes, including but not limited to:
          </p>
          <ul class="list-disc list-inside space-y-1.5 pl-2 text-slate-700 dark:text-slate-300">
            <li>Facilitating unsolicited bulk messaging (spam) or phishing campaigns.</li>
            <li>Financial fraud, credential theft, or unauthorized access to computer systems.</li>
            <li>Circumventing platform abuse prevention mechanisms or participating in distributed denial of service (DDoS) attacks.</li>
            <li>Distributing malware, viruses, or illegal contraband.</li>
          </ul>
        </section>

        <section class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex items-center gap-2 text-amber-500 font-bold text-base">
            <AlertTriangle class="w-5 h-5" />
            <h2>Disclaimer of Warranties & Ephemeral Nature</h2>
          </div>
          <p>
            pvrge is provided on an "as is" and "as available" basis without warranties of any kind. Because all mail is permanently purged after 24 hours, pvrge is NOT suitable for critical long-term records, official government communications, or high-value financial accounts. We are not liable for any lost data resulting from scheduled purges or service disruptions.
          </p>
        </section>

        <section class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <FileText class="w-5 h-5 text-emerald-500" />
            <h2>Enforcement & Right of Termination</h2>
          </div>
          <p>
            We reserve the right to block specific incoming IP addresses, domain names, or malicious mailboxes without prior notice in the event of abuse or legal obligations.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
