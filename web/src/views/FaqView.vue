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
          Frequently Asked Questions
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Everything you need to know about pvrge disposable temporary mail, capabilities, and boundaries.
        </p>
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
      <div class="divide-y divide-gray-200 dark:divide-gray-700/60 space-y-5">
        <!-- FAQ 1 -->
        <div class="pt-2 first:pt-0 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            1. What is pvrge and how does it work?
          </h2>
          <p>
            pvrge is a modern, high-speed, and privacy-first disposable temporary email service. It gives you instant, throwaway inboxes without registration, personal identification, or passwords. Incoming emails appear in real time, are accessible strictly during your session, and are automatically purged after 24 hours.
          </p>
        </div>

        <!-- FAQ 2 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            2. Can I use custom usernames and multiple domains?
          </h2>
          <p>
            Yes. You can either generate a secure random address using our built-in username generator or manually specify your desired mailbox prefix. You can select any active domain from our managed multi-domain pool and concurrently switch between multiple disposable accounts right inside your browser.
          </p>
        </div>

        <!-- FAQ 3 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            3. Can I send outbound emails or reply to messages?
          </h2>
          <p>
            No. pvrge is strictly an <strong>inbound-only</strong> service. Outbound email sending, forwarding, and replying are disabled by design. This restriction protects our server IP reputation, eliminates spam relays and abuse, and ensures high deliverability for all incoming verification emails.
          </p>
        </div>

        <!-- FAQ 4 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            4. How long do you retain incoming messages? (24-Hour Retention)
          </h2>
          <p>
            All received emails and attachments are automatically and irreversibly deleted after <strong>24 hours</strong> from arrival. We do not maintain backups, historical archives, or recovery logs once the retention window expires.
          </p>
        </div>

        <!-- FAQ 5 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            5. How does automatic OTP and verification code extraction work?
          </h2>
          <p>
            When verification emails arrive, pvrge's parser automatically detects one-time passwords (OTP), 2FA tokens, and numerical activation codes. The extracted code is highlighted directly in the message header with a quick-copy button, allowing you to finish account activations with one click.
          </p>
        </div>

        <!-- FAQ 6 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            6. What are the SPF and DKIM security badges?
          </h2>
          <p>
            Each incoming email is validated cryptographically against sender policy frameworks (SPF) and DomainKeys Identified Mail (DKIM). We display clear verification badges in the email viewer so you can instantly verify whether an email genuinely originated from the claimed domain or is potentially spoofed.
          </p>
        </div>

        <!-- FAQ 7 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            7. Is reading emails safe from trackers and malware? (Sandboxed Viewer)
          </h2>
          <p>
            Yes. pvrge renders HTML email bodies inside an isolated, sandboxed viewer with restricted execution policies. Tracking pixels, external script execution, unauthorized cookies, and dangerous DOM elements are effectively blocked to prevent stealth tracking and phishing exploits.
          </p>
        </div>

        <!-- FAQ 8 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            8. Can I download attachments and export raw RFC 822 source?
          </h2>
          <p>
            Yes. Any attachments sent with incoming messages can be safely downloaded from the email view. Additionally, technical users and developers can download the complete, unmodified raw RFC 822 (<code>.eml</code>) message file for offline inspection, header analysis, or auditing.
          </p>
        </div>

        <!-- FAQ 9 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            9. What are the service limitations and size quotas?
          </h2>
          <p>
            To maintain high availability and prevent platform degradation, the following limits apply:
          </p>
          <ul class="list-disc list-inside space-y-1 pl-2 mt-2">
            <li><strong>Maximum Email Size:</strong> 2 MB per email (larger messages will be rejected by our MX servers).</li>
            <li><strong>Maximum Attachments:</strong> Up to 5 attachments per message.</li>
            <li><strong>Account Creation Limit:</strong> Up to 5 new accounts per day per IP address.</li>
            <li><strong>Inbound Only:</strong> No outbound sending or relaying capabilities.</li>
          </ul>
        </div>

        <!-- FAQ 10 -->
        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            10. I forgot my credentials or deleted my inbox. Can you reset or restore it?
          </h2>
          <p>
            No. pvrge does not offer password reset or mailbox recovery. Because we operate under a strict zero-knowledge model, your access tokens exist only within your device's browser storage. We do not store personal identification, recovery emails, or phone numbers to verify ownership.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
