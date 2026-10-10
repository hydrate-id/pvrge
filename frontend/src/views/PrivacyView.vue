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
          Privacy Policy
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Our transparent, zero-knowledge commitment to safeguarding your identity and messages.
        </p>
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-6">
      <!-- Section 1 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          1. Zero-Knowledge Architecture
        </h2>
        <p>
          pvrge.com is engineered around absolute privacy. We do not require registration, real names, passwords, phone numbers, payment details, or identity verification of any kind. We do not track users across external platforms, build behavioral profiles, or sell any information to third parties. Access to an inbox is secured strictly through client-side generated tokens.
        </p>
      </section>

      <!-- Section 2 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          2. 24-Hour Automated Purge
        </h2>
        <p>
          To maintain an ephemeral footprint, all incoming messages, metadata, sender information, headers, and attachments are automatically and permanently purged from our primary database and file storage after <strong>24 hours</strong> from arrival. We do not retain cold archives, offline backups, or historical message logs.
        </p>
      </section>

      <!-- Section 3 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          3. Browser Storage & Multi-Session
        </h2>
        <p>
          We do not deploy third-party advertising or cross-site tracking cookies. We utilize modern browser storage (<code>localStorage</code>) on your client device solely to persist your active disposable mailbox credentials, encryption keys, and interface preferences (such as dark mode theme). This data resides entirely on your device and enables seamless multi-account switching without server-side identity linkage.
        </p>
      </section>

      <!-- Section 4 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          4. Anonymous Rate Limiting Hashing
        </h2>
        <p>
          To prevent infrastructure abuse, denial-of-service attempts, and automated spam creation, we enforce a strict daily rate limit of 5 mailbox creations per IP address. To safeguard your anonymity, IP addresses are processed through a one-way cryptographic hash with daily rotating salts and ephemeral counters. Plaintext IP addresses are never permanently logged or tied to mailbox identities.
        </p>
      </section>

      <!-- Section 5 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          5. Sandboxed Viewing & Content Security
        </h2>
        <p>
          When you view incoming email messages, HTML bodies are rendered inside an isolated, strictly sandboxed container. This security layer strips remote tracking pixels, disables dangerous JavaScript execution, prevents malicious external redirects, and blocks third-party cookie leakage to ensure complete safety while inspecting unverified emails.
        </p>
      </section>

      <!-- Section 6 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          6. Instant Self-Deletion
        </h2>
        <p>
          You hold immediate and absolute control over your mailbox lifecycle. Clicking the "Delete" action on any mailbox instantly and permanently purges the address, authentication tokens, and all associated messages from our servers ahead of the standard 24-hour cycle. Once deleted, the action is irreversible.
        </p>
      </section>

      <!-- Section 7 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          7. Contact & Inquiries
        </h2>
        <p>
          If you have questions regarding this Privacy Policy, server data flows, or security assessments, reach out directly to our privacy and security team at
          <a href="mailto:support@pvrge.com" class="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">support@pvrge.com</a>.
        </p>
      </section>
    </div>
  </div>
</template>
