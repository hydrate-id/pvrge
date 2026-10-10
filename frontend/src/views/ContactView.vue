<script setup>
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Tombol Back -->
    <div>
      <router-link
        to="/"
        class="inline-flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500"
      >
        <svg class="mr-1 -ml-1 size-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        Back
      </router-link>
    </div>

    <div class="mt-2 md:flex md:items-center md:justify-between">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">
          Contact Us
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get in touch with the pvrge team for technical inquiries, feedback, or abuse reports.
        </p>
      </div>
    </div>

    <!-- Official Communication Channels -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Email Support Card -->
      <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
        <div class="flex items-center space-x-3 mb-2">
          <div class="rounded-md bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Email Support & Abuse Reports</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Official inquiries & incident reports</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          For technical issues, bug reports, DMCA concerns, or domain abuse, contact our team.
        </p>
        <a
          href="mailto:support@pvrge.com"
          class="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          support@pvrge.com
          <svg class="ml-1 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      <!-- Telegram Bot & Community Card -->
      <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/80">
        <div class="flex items-center space-x-3 mb-2">
          <div class="rounded-md bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Telegram Community & Bot</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Instant bot access & community updates</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Connect directly via Telegram for instant disposable inboxes, notifications, and updates.
        </p>
        <a
          href="https://t.me/pvrgebot"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
        >
          @pvrgebot on Telegram
          <svg class="ml-1 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Why pvrge & Boundaries Summary -->
    <div class="overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Why pvrge?</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          A modern, high-speed ephemeral mailbox engineered with strict privacy principles and clear operational boundaries.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Zero-Knowledge & No Registration</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            No personal identity, passwords, or phone numbers collected. Fully anonymous from start to finish.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Inbound-Only Architecture</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Strictly receives incoming emails with no outbound spam risks, keeping our domain reputation pristine.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Multi-Domain & Custom Usernames</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Choose from an expanding pool of active domains and generate random or customized mailbox prefixes.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Automated 24-Hour Purge</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            All messages, metadata, and files are permanently purged after 24 hours. No backups are retained.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Smart OTP Detection & Fast Copy</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Automatic extraction of one-time passwords and verification codes right in your inbox view.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Cryptographic SPF & DKIM Badges</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Real-time validation badges clearly mark legitimate senders versus spoofed or forged headers.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Sandboxed Viewer & RFC 822 Export</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Safe reading isolated from tracking pixels and scripts, with full raw .eml download capabilities.
          </p>
        </div>

        <div class="space-y-1">
          <div class="font-medium text-gray-900 dark:text-white flex items-center space-x-1.5">
            <span class="text-emerald-500 font-bold">&#10003;</span>
            <span>Explicit System Boundaries</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Transparent quotas: 2 MB maximum email size, up to 5 attachments, and 5 account creations per day per IP.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
