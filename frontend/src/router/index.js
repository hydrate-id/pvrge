import { createRouter, createWebHistory } from 'vue-router';
import InboxView from '../views/InboxView.vue';
import FaqView from '../views/FaqView.vue';
import PrivacyView from '../views/PrivacyView.vue';
import TermsView from '../views/TermsView.vue';
import ContactView from '../views/ContactView.vue';

const routes = [
  { path: '/', name: 'inbox', component: InboxView },
  { path: '/faq', name: 'faq', component: FaqView },
  { path: '/privacy', name: 'privacy', component: PrivacyView },
  { path: '/terms', name: 'terms', component: TermsView },
  { path: '/contact', name: 'contact', component: ContactView },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
