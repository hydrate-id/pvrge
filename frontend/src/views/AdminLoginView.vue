<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSession } from '../composables/useSession';
import Eye from '@primeicons/vue/eye';
import EyeSlash from '@primeicons/vue/eye-slash';
import Spinner from '@primeicons/vue/spinner';
import Shield from '@primeicons/vue/shield';

const route = useRoute();
const router = useRouter();
const session = useSession();

const email = 'support@pvrge.com';
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  if (!password.value) {
    errorMessage.value = 'Password is required.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    await session.loginAccount({
      email,
      password: password.value,
    });

    const target = route.query.redirect ? String(route.query.redirect) : '/onduty';
    router.push(target);
  } catch (err) {
    errorMessage.value = err?.message || 'Login failed. Please check your credentials.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <!-- Header -->
      <div class="text-center">
        <div class="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-sm mb-4">
          <Shield class="size-7" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          On-Duty Administration
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Restricted access for support desk and operational staff.
        </p>
      </div>

      <!-- Card -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/80 sm:p-8">
        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          <svg class="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
          </svg>
          <div class="flex-1 font-medium">{{ errorMessage }}</div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Email Field (Readonly) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Duty Account
              </label>
              <span class="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                Support Desk
              </span>
            </div>
            <div class="relative">
              <input
                type="email"
                :value="email"
                disabled
                readonly
                class="block w-full rounded-lg border border-gray-300 bg-gray-100 px-3.5 py-2.5 font-mono text-sm text-gray-700 shadow-xs cursor-not-allowed dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300 focus:outline-none"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div>
            <label for="admin-password" class="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <div class="relative">
              <input
                id="admin-password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                required
                autocomplete="current-password"
                placeholder="Enter admin password..."
                class="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                :title="showPassword ? 'Hide password' : 'Show password'"
              >
                <EyeSlash v-if="showPassword" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="isLoading"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <Spinner v-if="isLoading" class="size-4 animate-spin" />
              <span>{{ isLoading ? 'Authenticating...' : 'Log In to Duty' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Footer back link -->
      <div class="text-center text-sm">
        <router-link to="/" class="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          &larr; Return to Public Inbox
        </router-link>
      </div>
    </div>
  </div>
</template>
