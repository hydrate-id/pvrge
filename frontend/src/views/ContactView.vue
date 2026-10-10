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
        <h1 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">Contact us</h1>
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
      <p>
        If you need help, have any questions, feedback, or need to report abuse, our support team is available to assist you.
      </p>
      <p class="mt-3">
        Our service is designed to be completely self-explanatory and easy to use, giving you temporary disposable email addresses instantly without complications.
      </p>

      <div class="mt-4">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Why choose pvrge?</h2>
        <ul class="list-disc pl-5 mt-2 space-y-1.5">
          <li><strong>No fees:</strong> Free disposable email service with no hidden costs or subscription plans.</li>
          <li><strong>Anonymous:</strong> No personal details or registration required to protect your privacy and security.</li>
          <li><strong>Delete mailbox:</strong> Easily delete your temporary mailbox and incoming messages at any time.</li>
        </ul>
      </div>

      <div class="mt-4 space-y-2">
        <div>
          <a
            href="mailto:support@pvrge.com"
            class="text-lg/6 text-emerald-600 dark:text-emerald-400 font-medium"
          >
            support@pvrge.com
          </a>
        </div>
        <div>
          <a
            href="https://t.me/pvrgebot"
            target="_blank"
            rel="noopener noreferrer"
            class="text-lg/6 text-emerald-600 dark:text-emerald-400 font-medium"
          >
            Telegram
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
