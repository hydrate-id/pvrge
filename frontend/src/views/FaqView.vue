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
        Frequently Asked Questions
      </h1>

      <div class="divide-y divide-gray-200 dark:divide-gray-700/60 space-y-5">
        <div class="pt-2 first:pt-0 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            What is pvrge?
          </h2>
          <p>
            pvrge is a fast, disposable temporary email service that gives you throwaway email addresses to receive verification emails, activation links, or one-time codes without exposing your private inbox to spam and trackers.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            How long are received emails kept?
          </h2>
          <p>
            Messages and their attachments are kept for exactly <strong>24 hours</strong>. After 24 hours, our automated system permanently purges them from our storage and databases.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Can I reuse my mailbox again later?
          </h2>
          <p>
            Yes. Every disposable mailbox has a unique password. You can hover or click the password in the account menu in the top bar to view and copy it. With your email and password, you can log back into this mailbox at any time using the "Log in" option.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Can I have multiple mailboxes?
          </h2>
          <p>
            Yes. You can create multiple temporary accounts and switch between them seamlessly using the account dropdown in the top bar.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Can I send emails from pvrge?
          </h2>
          <p>
            No. pvrge is strictly designed for receiving emails. Outgoing mail is disabled to protect reputation and prevent abuse or unauthorized spam.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            How do I delete my account immediately?
          </h2>
          <p>
            Click the trash icon in the top right or select "Delete account" in the account dropdown menu. Your mailbox and all associated messages will be deleted immediately.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
