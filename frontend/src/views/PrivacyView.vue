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
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-6">
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          1. Introduction
        </h2>
        <p>
          This Privacy Policy describes how pvrge.com ("we", "us", or "our") handles and protects information when you use our temporary disposable email service. By accessing or using pvrge.com, you agree to the terms outlined in this policy.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          2. Collection of Data & Use of Data
        </h2>
        <p>
          pvrge.com is built with a strict privacy-first architecture. Unlike conventional email services, we do not require any registration, personal details, identity verification, or phone numbers to use our service. We do not collect or store your real name, physical address, or IP address.
        </p>
        <p>
          To deliver incoming emails to your disposable inbox, our servers process and temporarily store incoming messages, including email headers, sender addresses, subject lines, bodies, and attachments. We only use this data to display messages to you during your active session.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          3. Cookies & Local Storage
        </h2>
        <p>
          We do not use tracking or third-party advertising cookies. We only use browser local storage (<code>localStorage</code>) and session storage on your device to persist your temporary account credentials, encryption keys, and interface preferences (such as dark mode theme). This data remains strictly in your browser and is never tracked across external sites.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          4. Privacy Protection & Security
        </h2>
        <p>
          Conventional mailbox providers maintain long-term archives of your personal emails, associate your identity with account activities, and routinely log connecting IP addresses. In contrast, temporary disposable mail through pvrge.com eliminates these risks by providing full anonymity:
        </p>
        <ul class="list-disc list-inside space-y-1 pl-2">
          <li><strong>No IP Logging:</strong> We do not log or store user IP addresses.</li>
          <li><strong>24-Hour Message Purge:</strong> All received messages and attachments are automatically and permanently deleted after 24 hours. No backups or archives are retained.</li>
          <li><strong>Instant Account Deletion:</strong> You have full control to permanently delete your mailbox and all associated messages at any moment with a single click.</li>
        </ul>
        <p class="font-medium text-gray-900 dark:text-gray-100">
          Your privacy is our highest priority, so you need not worry about your data: we give it full protection. Access to it is granted to you alone, and only for the lifetime of the temporary mailbox.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          5. Contact Us
        </h2>
        <p>
          If you have questions or inquiries regarding our privacy policy or practices, you can contact us at
          <a href="mailto:support@pvrge.com" class="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">support@pvrge.com</a>.
        </p>
      </section>
    </div>
  </div>
</template>
