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
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-6">
      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing or using the pvrge service, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you should immediately cease use of the service.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          2. Nature of the Service
        </h2>
        <p>
          pvrge provides temporary, throwaway email accounts designed solely for transient message reception. Because all messages and attachments are automatically deleted after 24 hours, pvrge is not intended for storing vital documents, financial records, or critical personal correspondence.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          3. Prohibited Activities
        </h2>
        <p>
          You agree not to use pvrge for any illegal, fraudulent, or abusive activities, including:
        </p>
        <ul class="list-disc list-inside space-y-1 pl-2">
          <li>Transmitting spam, phishing materials, malware, or unsolicited advertisements.</li>
          <li>Conducting unauthorized penetration testing, hacking, or denial-of-service attacks against our systems or third-party platforms.</li>
          <li>Circumventing platform abuse controls or attempting to gain unauthorized access to mailboxes belonging to other users.</li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          4. Disclaimer of Warranties & Limitation of Liability
        </h2>
        <p>
          The service is provided on an "as is" and "as available" basis without warranties of any kind. pvrge shall not be held liable for any loss of data, message delivery failure, or consequential damages resulting from the use or inability to use the service.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          5. Termination
        </h2>
        <p>
          We reserve the right to suspend or block IP addresses, domains, or accounts that violate these terms or threaten the stability of the platform at our sole discretion.
        </p>
      </section>
    </div>
  </div>
</template>
