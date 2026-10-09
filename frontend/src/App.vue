<script setup>
import { ref, onMounted } from 'vue';
import Header from './components/Header.vue';
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
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <!-- Header with active email, multi-session switch & theme toggle -->
    <Header :isRefreshing="isRefreshing" @refresh="handleRefresh" />

    <!-- Main View (Edge-to-Edge Full Screen) -->
    <main class="flex-1 flex overflow-hidden min-h-0 w-full">
      <router-view />
    </main>
  </div>
</template>
