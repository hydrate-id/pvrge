<script setup>
</script>

<template>
  <footer class="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <!-- Left: Brand & retention guarantee -->
        <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span class="font-semibold text-slate-700 dark:text-slate-300">pvrge</span>
          <span>•</span>
          <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <i class="pi pi-clock text-xs" />
            24-hour automatic message purge
          </span>
        </div>

        <!-- Navigation Links: Inbox, FAQ, Privacy, Terms, Contact -->
        <nav class="flex items-center flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <router-link to="/" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            Inbox
          </router-link>
          <router-link to="/faq" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            FAQ
          </router-link>
          <router-link to="/privacy" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            Privacy Policy
          </router-link>
          <router-link to="/terms" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            Terms of Service
          </router-link>
          <router-link to="/contact" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            Contact
          </router-link>
        </nav>

        <!-- Right: Copyright -->
        <div class="text-[11px] text-slate-400 dark:text-slate-500">
          &copy; {{ new Date().getFullYear() }} pvrge. All rights reserved.
        </div>

      </div>
    </div>
  </footer>
</template>
