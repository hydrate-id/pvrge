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
          Terms of Service
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Clear rules, operational boundaries, and user responsibilities when using pvrge.
        </p>
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-6">
      <!-- Section 1 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing or using the pvrge service ("the Service"), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree with any part of these terms, you must immediately terminate your use of the Service.
        </p>
      </section>

      <!-- Section 2 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          2. Inbound-Only & Ephemeral Service Nature
        </h2>
        <p>
          pvrge provides disposable, temporary email addresses intended solely for receiving incoming messages. The Service is strictly <strong>inbound-only</strong>: sending outbound emails, relaying, and composing replies are disabled. All messages and attachments are automatically deleted after 24 hours. pvrge is not designed or intended for permanent records, legal archiving, critical financial transactions, or persistent personal accounts.
        </p>
      </section>

      <!-- Section 3 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          3. Service Boundaries & Technical Limits
        </h2>
        <p>
          To maintain high availability and prevent platform degradation, all users are subject to the following non-negotiable technical limits:
        </p>
        <ul class="list-disc list-inside space-y-1 pl-2">
          <li><strong>Message Size Limit:</strong> Incoming emails cannot exceed <strong>2 MB</strong> in total size (including all body components and MIME attachments). Oversized emails will be rejected by our mail servers.</li>
          <li><strong>Attachment Quota:</strong> A maximum of <strong>5 attachments</strong> is permitted per individual email message.</li>
          <li><strong>Rate Limiting:</strong> Each user IP address is restricted to creating a maximum of <strong>5 accounts per day</strong>.</li>
          <li><strong>Retention Period:</strong> Incoming message data is purged after exactly <strong>24 hours</strong>.</li>
        </ul>
      </section>

      <!-- Section 4 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          4. Prohibited Abuse & Illegal Activities
        </h2>
        <p>
          You agree not to use pvrge directly or indirectly for any illicit, harmful, or abusive purposes, including but not limited to:
        </p>
        <ul class="list-disc list-inside space-y-1 pl-2">
          <li>Facilitating cybercrime, malware propagation, phishing schemes, ransomware operations, or credential stuffing.</li>
          <li>Launching distributed denial-of-service (DDoS) attacks, flood attacks, or automated bot harvesting against our mail infrastructure.</li>
          <li>Bypassing or manipulating our IP-based rate limiting controls, proxy headers, or security filters.</li>
          <li>Engaging in any conduct that violates applicable local, national, or international regulations.</li>
        </ul>
      </section>

      <!-- Section 5 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          5. No Account Recovery or Password Reset
        </h2>
        <p>
          pvrge operates on an anonymous, zero-knowledge architecture without requiring passwords, identity verification, or phone numbers. Consequently, we cannot provide password reset, mailbox recovery, or account restoration services. If you lose your browser session data or manually delete a mailbox, access to that mailbox is permanently unrecoverable.
        </p>
      </section>

      <!-- Section 6 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          6. Disclaimer of Warranties & Limitation of Liability
        </h2>
        <p>
          The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express, statutory, or implied. pvrge disclaims all liability for undelivered, delayed, or corrupt messages, server downtime, third-party blocking, data loss resulting from the 24-hour retention purge, or any indirect or consequential damages arising from service usage.
        </p>
      </section>

      <!-- Section 7 -->
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          7. Termination & Abuse Enforcement
        </h2>
        <p>
          We reserve the right, at our sole discretion, to reject connections, blackhole abusive IP addresses, block malicious domains, or terminate user sessions immediately and without prior notice in response to abuse, rate limit evasion, or violations of these terms.
        </p>
      </section>
    </div>
  </div>
</template>
