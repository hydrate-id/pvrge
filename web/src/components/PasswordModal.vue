<script setup>
import { ref } from 'vue';
import Key from '@primeicons/vue/key';
import Times from '@primeicons/vue/times';
import Eye from '@primeicons/vue/eye';
import EyeSlash from '@primeicons/vue/eye-slash';
import Check from '@primeicons/vue/check';
import Copy from '@primeicons/vue/copy';
import { copyText } from '../utils/clipboard';

const props = defineProps({
  isOpen: Boolean,
  email: String,
  password: String,
});

const emit = defineEmits(['close']);

const showPassword = ref(false);
const copied = ref(false);

async function copyPassword() {
  if (!props.password) return;
  const ok = await copyText(props.password);
  if (ok) {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div class="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
      <!-- Close button -->
      <button 
        @click="emit('close')" 
        class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
        aria-label="Close modal"
      >
        <Times class="size-4" />
      </button>

      <div class="flex items-center gap-3 mb-4">
        <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
          <Key class="size-5" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Account Password</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Keep this password to restore your inbox later</p>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Email Address
          </label>
          <div class="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-mono break-all select-all">
            {{ email || 'No account selected' }}
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Password
          </label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                :value="password || ''" 
                readonly 
                class="w-full pr-10 pl-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <EyeSlash v-if="showPassword" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
            <button 
              type="button"
              @click="copyPassword"
              class="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition shrink-0 active:scale-95 shadow-sm"
            >
              <Check v-if="copied" class="size-4 text-emerald-200" />
              <Copy v-else class="size-4" />
              <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
          💡 You can re-login to this temporary address anytime before the retention period expires using this password.
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button 
          @click="emit('close')" 
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
