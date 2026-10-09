<script setup>
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Tombol < Back kembali ke / (Inbox) -->
    <div>
      <router-link
        to="/"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
      >
        <i class="pi pi-chevron-left text-sm" />
        <span>Back</span>
      </router-link>
    </div>

    <!-- Card wrapper persis mail.tm -->
    <div class="overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Privacy Policy
      </h1>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          1. General Information & Identity Defense
        </h2>
        <p>
          pvrge provides disposable, temporary email addresses to help individuals protect their personal email addresses from spam, marketing lists, and unwanted exposure. We prioritize privacy by design. We do not require you to provide your real name, physical address, phone number, or payment details.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          2. Information We Process
        </h2>
        <p>
          To operate the temporary email service, we process:
        </p>
        <ul class="list-disc list-inside space-y-1 pl-2">
          <li>Randomly generated or user-specified email addresses and their cryptographic password hashes.</li>
          <li>Incoming emails sent to your active disposable mailbox, including email bodies, headers, sender addresses, timestamps, and attachments.</li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          3. 24-Hour Message Retention & Automatic Purge
        </h2>
        <p>
          All received messages, attachments, headers, and metadata are strictly stored for a maximum period of <strong>24 hours</strong>. Upon reaching the 24-hour retention window, emails are automatically, permanently, and irrevocably purged from all databases and cloud storage buckets. We do not retain backups or archives of deleted mail.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          4. Browser Local Storage
        </h2>
        <p>
          We do not use tracking or advertising cookies. We only use browser local storage (<code>localStorage</code>) on your device to keep your active authentication token and color theme preference across page reloads. You can clear or delete your session at any time directly through the account menu.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          5. Third-Party Sharing
        </h2>
        <p>
          We do not sell, rent, trade, or share your data with any third-party marketing or advertising networks. We will only disclose information if strictly required by applicable law or a valid court order.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          6. Contact Us
        </h2>
        <p>
          If you have questions or concerns regarding our privacy practices, please contact us at <a href="mailto:support@pvrge.com" class="text-lime-600 dark:text-lime-400 font-medium hover:underline">support@pvrge.com</a>.
        </p>
      </section>
    </div>
  </div>
</template>
