import { createRouter, createWebHistory } from 'vue-router';
import InboxView from '../views/InboxView.vue';
import FaqView from '../views/FaqView.vue';
import PrivacyView from '../views/PrivacyView.vue';
import TermsView from '../views/TermsView.vue';
import ContactView from '../views/ContactView.vue';
import AdminLoginView from '../views/AdminLoginView.vue';
import AdminUsersView from '../views/AdminUsersView.vue';

const routes = [
  { path: '/', name: 'inbox', component: InboxView },
  { path: '/view/:id', name: 'message-detail', component: InboxView },
  { path: '/view/:id/source', name: 'message-source', component: InboxView },
  { path: '/onduty', name: 'onduty-inbox', component: InboxView },
  { path: '/onduty/view/:id', name: 'onduty-message-detail', component: InboxView },
  { path: '/onduty/view/:id/source', name: 'onduty-message-source', component: InboxView },
  { path: '/onduty/users', name: 'onduty-users', component: AdminUsersView },
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

function isDutyAuthenticated() {
  const duty = localStorage.getItem('pvrge_duty_session');
  if (!duty) return false;
  try {
    const parsed = JSON.parse(duty);
    return Boolean(parsed?.token && parsed?.account?.email === 'support@pvrge.com');
  } catch {
    return false;
  }
}

router.beforeEach((to, from, next) => {
  const dutyActive = isDutyAuthenticated();
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
