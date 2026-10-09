<script setup>
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-vue-next';
import { ref } from 'vue';

const name = ref('');
const email = ref('');
const message = ref('');
const submitted = ref(false);

function handleSubmit() {
  if (!name.value || !email.value || !message.value) return;
  submitted.value = true;
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
    <!-- Header -->
    <div class="text-center max-w-2xl mx-auto mb-12">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 mb-4">
        <MessageSquare class="w-3.5 h-3.5" />
        Get in Touch
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Contact Support
      </h1>
      <p class="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
        Have questions, feedback, or need to report abuse? Reach out to our technical team.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-5 gap-8">
      
      <!-- Contact Info Card -->
      <div class="md:col-span-2 space-y-4">
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            Support Channels
          </h2>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            We operate automated edge infrastructure with high availability. For questions or abuse notices, contact us via email.
          </p>

          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div class="flex items-center gap-3 text-xs">
              <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Mail class="w-4 h-4" />
              </div>
              <div class="truncate">
                <div class="font-medium text-slate-400 text-[11px]">Email Support</div>
                <div class="font-semibold text-slate-900 dark:text-white font-mono">support@pvrge.mail</div>
              </div>
            </div>

            <div class="flex items-center gap-3 text-xs">
              <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Mail class="w-4 h-4" />
              </div>
              <div class="truncate">
                <div class="font-medium text-slate-400 text-[11px]">Abuse Inquiries</div>
                <div class="font-semibold text-slate-900 dark:text-white font-mono">abuse@pvrge.mail</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Form -->
      <div class="md:col-span-3">
        <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          
          <div v-if="submitted" class="text-center py-10 space-y-3">
            <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Message Dispatched</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Thank you for contacting us. Your inquiry has been sent to our support desk.
            </p>
            <button
              @click="submitted = false; name = ''; email = ''; message = '';"
              class="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Send another message
            </button>
          </div>

          <form v-else @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Name
              </label>
              <input
                v-model="name"
                required
                type="text"
                placeholder="Jane Doe"
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Email Address
              </label>
              <input
                v-model="email"
                required
                type="email"
                placeholder="jane@example.com"
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message
              </label>
              <textarea
                v-model="message"
                required
                rows="4"
                placeholder="Describe your question, issue, or report..."
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <Send class="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </form>

        </div>
      </div>

    </div>
  </div>
</template>
