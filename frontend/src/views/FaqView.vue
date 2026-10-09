<script setup>
</script>

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
        <h1 class="text-2xl/7 font-bold text-gray-900 sm:truncate dark:text-gray-300">
          Frequently Asked Questions
        </h1>
      </div>
    </div>

    <div class="mt-4 overflow-hidden border-b border-gray-200 bg-white px-4 py-5 shadow sm:rounded-md sm:px-6 dark:border-gray-900 dark:bg-gray-800/75 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
      <div class="divide-y divide-gray-200 dark:divide-gray-700/60 space-y-5">
        <div class="pt-2 first:pt-0 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            What is temporary / disposable / anonymous mail?
          </h2>
          <p>
            A disposable mailbox is a temporary, completely anonymous email address that requires no registration.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Why would I need a temporary email address?
          </h2>
          <p>
            For signing up on sites you don't fully trust, for anonymous conversations, forums and giveaways: any situation where you want messages delivered instantly without exposing your identity.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            How is it different from regular mail?
          </h2>
          <ul class="list-disc list-inside space-y-1 pl-2">
            <li>It requires no registration;</li>
            <li>It is completely anonymous: your personal data, the address itself and all emails are erased once you delete the mailbox;</li>
            <li>Messages are delivered instantly;</li>
            <li>The address is generated automatically, so there is no hunting for a free username;</li>
            <li>The mailbox is protected from spam, hacking and exploits.</li>
          </ul>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            How do I send an email?
          </h2>
          <p>
            Unfortunately, we do not provide this feature.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            How do I extend the lifetime of my temporary mailbox?
          </h2>
          <p>
            There is nothing to extend: your mailbox stays valid until you delete it yourself.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            How long do you store incoming messages?
          </h2>
          <p>
            We store messages for 24 hours only. Sorry, we can't keep them indefinitely.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Can I read the emails I receive?
          </h2>
          <p>
            Yes, they appear right under your mailbox address, showing the sender, the subject and the text of each message. If the email you're waiting for isn't there yet, click "Refresh".
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            Do you keep renewing the domains used by this service?
          </h2>
          <p>
            Yes, we always renew our domains, so they won't disappear.
          </p>
        </div>

        <div class="pt-5 space-y-1.5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            I forgot my password. Can you reset it?
          </h2>
          <p>
            No. Your password is generated in your browser and stored encrypted, so there is no way for us to reset it.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
