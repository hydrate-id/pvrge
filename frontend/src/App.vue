<script setup>
import { ref, onMounted } from 'vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import { useSession } from './composables/useSession';

const session = useSession();
const isRefreshing = ref(false);

async function handleRefresh() {
  isRefreshing.value = true;
  window.dispatchEvent(new CustomEvent('pvrge:refresh'));
  setTimeout(() => {
    isRefreshing.value = false;
  }, 600);
}

onMounted(async () => {
  await session.initSession();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <!-- Header with active email, multi-session switch & theme toggle -->
    <Header :isRefreshing="isRefreshing" @refresh="handleRefresh" />

    <!-- Main View -->
    <main class="flex-1 flex flex-col min-h-0">
      <router-view />
    </main>

    <!-- Footer with legal links & retention note -->
    <Footer />
  </div>
</template>
