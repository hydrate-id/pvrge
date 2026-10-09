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
        <h2 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">Contacts</h2>
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
      <p>If you have any questions, feedback, or abuse reports, please contact us directly:</p>
      <ul class="list-disc pl-5 mt-3 space-y-2">
        <li>
          Email:
          <a href="mailto:support@pvrge.com" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            support@pvrge.com
          </a>
        </li>
        <li>
          Telegram:
          <a href="https://t.me/pvrgebot" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            t.me/pvrgebot
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
