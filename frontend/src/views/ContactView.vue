<template>
  <div class="w-full space-y-4">
    <!-- Tombol Back -->
    <div>
      <router-link
        to="/"
        class="flex items-center text-base/5 font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-500"
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

      <div class="mt-9 space-y-4">
        <div class="flex items-center gap-3">
          <svg class="size-6 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          <a
            href="mailto:support@pvrge.com"
            class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            support@pvrge.com
          </a>
        </div>
        <div class="flex items-center gap-3">
          <svg class="size-6 text-indigo-600 dark:text-indigo-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
          <a
            href="https://t.me/pvrgebot"
            target="_blank"
            rel="noopener noreferrer"
            class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            https://t.me/pvrgebot
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
