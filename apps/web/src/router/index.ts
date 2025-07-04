import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAppStore } from '../stores/app'
import Home from '../views/Home.vue'
import Login from '../views/auth/Login.vue'
import Signup from '../views/auth/Signup.vue'
import TenantSelection from '../views/TenantSelection.vue'
import IntegrationsIndex from '../views/integrations/IntegrationsIndex.vue'
import NotFound from '../views/NotFound.vue'
import Error from '../views/Error.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/signup',
    name: 'Signup',
    component: Signup,
    meta: { requiresAuth: false },
  },
  {
    path: '/tenant-selection',
    name: 'TenantSelection',
    component: TenantSelection,
    meta: { requiresAuth: true, requiresTenant: false },
  },
  {
    path: '/integrations',
    name: 'Integrations',
    component: IntegrationsIndex,
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/integrations/oauth/callback',
    name: 'IntegrationOAuthCallback',
    component: () => import('../views/integrations/OAuthCallback.vue'),
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('../views/accounts/AccountsList.vue'),
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/accounts/:id',
    name: 'AccountDetail',
    component: () => import('../views/accounts/AccountDetail.vue'),
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: () => import('../views/contacts/ContactsList.vue'),
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/contacts/:id',
    name: 'ContactDetail',
    component: () => import('../views/contacts/ContactDetail.vue'),
    meta: { requiresAuth: true, requiresTenant: true },
  },
  {
    path: '/error',
    name: 'Error',
    component: Error,
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// App initialization guard
router.beforeEach(async (to, _from, next) => {
  const appStore = useAppStore()

  // Initialize app if not already done
  if (appStore.isUninitialized) {
    console.debug('Router: Initializing app...')
    try {
      await appStore.initialize()
    } catch (error) {
      console.error('Router: App initialization failed:', error)
      // Continue anyway, let individual pages handle errors
    }
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresTenant = to.meta.requiresTenant === true

  // Check authentication requirement
  if (requiresAuth && !appStore.isAuthenticated) {
    console.debug('Router: Redirecting to login - not authenticated')
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // Redirect authenticated users away from auth pages
  if (!requiresAuth && appStore.isAuthenticated) {
    console.debug('Router: Redirecting to home - already authenticated')
    next({ name: 'Home' })
    return
  }

  // Check workspace requirement
  if (requiresTenant && !appStore.workspace) {
    console.debug('Router: Redirecting to workspace selection - no workspace selected')
    next({ name: 'TenantSelection', query: { redirect: to.fullPath } })
    return
  }

  console.debug('Router: Navigation allowed', { 
    to: to.name, 
    isAuthenticated: appStore.isAuthenticated,
    hasWorkspace: !!appStore.workspace,
    requiresAuth,
    requiresTenant
  })
  
  next()
})

export default router