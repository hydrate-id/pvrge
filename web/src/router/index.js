import { createRouter, createWebHistory } from 'vue-router';
import InboxView from '../views/InboxView.vue';
import FaqView from '../views/FaqView.vue';
import PrivacyView from '../views/PrivacyView.vue';
import TermsView from '../views/TermsView.vue';
import ContactView from '../views/ContactView.vue';
import AdminLoginView from '../views/AdminLoginView.vue';
import AdminUsersView from '../views/AdminUsersView.vue';
import AdminSupportView from '../views/AdminSupportView.vue';
import { useSession } from '../composables/useSession';

const routes = [
  { path: '/', name: 'inbox', component: InboxView },
  { path: '/view/:id', name: 'message-detail', component: InboxView },
  { path: '/view/:id/source', name: 'message-source', component: InboxView },
  { path: '/onduty', name: 'onduty-inbox', component: InboxView },
  { path: '/onduty/view/:id', name: 'onduty-message-detail', component: InboxView },
  { path: '/onduty/view/:id/source', name: 'onduty-message-source', component: InboxView },
  { path: '/onduty/users', name: 'onduty-users', component: AdminUsersView },
  { path: '/onduty/support', name: 'onduty-support', component: AdminSupportView },
  { path: '/onduty/login', name: 'onduty-login', component: AdminLoginView },
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

router.beforeEach(async (to, from, next) => {
  const session = useSession();
  if (to.path.startsWith('/onduty')) {
    await session.checkDutySession();
  }
  const dutyActive = session.isDutyActive.value;
  if (dutyActive) {
    if (to.path === '/' || to.path.startsWith('/view/') || to.path === '/onduty/login') {
      return next('/onduty');
    }
    return next();
  }
  if (!dutyActive) {
    if (to.path.startsWith('/onduty') && to.path !== '/onduty/login') {
      return next({ path: '/onduty/login', query: { redirect: to.fullPath } });
    }
    return next();
  }
  next();
});
