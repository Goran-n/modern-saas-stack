<template>
  <div class="slack-link-container">
    <div class="slack-link-card">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <h2>Verifying your link...</h2>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h2>{{ errorTitle }}</h2>
        <p>{{ error }}</p>
        <NuxtLink to="/" class="button button-secondary">
          Go to Dashboard
        </NuxtLink>
      </div>

      <div v-else-if="!user" class="auth-required">
        <div class="slack-icon">
          <svg width="54" height="54" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fill-rule="evenodd">
              <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
              <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
              <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
              <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
            </g>
          </svg>
        </div>
        <h2>Link Your Slack Account</h2>
        <p>Please sign in to link your Slack account with Figgy.</p>
        <button @click="signIn" class="button button-primary">
          Sign in to Continue
        </button>
      </div>

      <div v-else-if="!tenants || tenants.length === 0" class="no-tenants">
        <div class="error-icon">🔍</div>
        <h2>No Organizations Found</h2>
        <p>You don't have access to any organizations yet. Please contact your administrator.</p>
        <NuxtLink to="/" class="button button-secondary">
          Go to Dashboard
        </NuxtLink>
      </div>

      <div v-else-if="linking" class="linking-state">
        <div class="spinner"></div>
        <h2>Linking your account...</h2>
        <p>Please wait while we connect your Slack account.</p>
      </div>

      <div v-else-if="linkingComplete" class="success-state">
        <div class="success-icon">✅</div>
        <h2>Account Linked Successfully!</h2>
        <p>Your Slack account has been linked to {{ linkedTenantNames }}.</p>
        <p class="success-message">You can now return to Slack and start using Figgy!</p>
        <div class="button-group">
          <button @click="returnToSlack" class="button button-primary">
            Open Slack
          </button>
          <NuxtLink to="/" class="button button-secondary">
            Go to Dashboard
          </NuxtLink>
        </div>
      </div>

      <div v-else class="tenant-selection">
        <div class="slack-icon">
          <svg width="54" height="54" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fill-rule="evenodd">
              <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
              <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
              <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
              <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
            </g>
          </svg>
        </div>
        <h2>Link Your Slack Account</h2>
        <p v-if="tokenInfo?.slackEmail">
          Linking Slack account: <strong>{{ tokenInfo.slackEmail }}</strong>
        </p>
        <p>You have access to the following organizations:</p>
        
        <div class="tenant-list">
          <div v-for="tenant in tenants" :key="tenant.id" class="tenant-item">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="selectedTenants" 
                :value="tenant.id"
                :disabled="linking"
              />
              <span class="tenant-name">{{ tenant.name }}</span>
              <span class="tenant-role">({{ tenant.role }})</span>
            </label>
          </div>
        </div>

        <div class="actions">
          <button 
            @click="linkAccount" 
            :disabled="selectedTenants.length === 0 || linking"
            class="button button-primary"
          >
            Link Selected Organizations
          </button>
          <button @click="selectAll" class="button button-secondary">
            Select All
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseUser, useApi } from '#imports'

const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()
const api = useApi()

const loading = ref(true)
const linking = ref(false)
const linkingComplete = ref(false)
const error = ref('')
const errorTitle = ref('Error')
const tokenInfo = ref(null)
const tenants = ref([])
const selectedTenants = ref([])

const linkedTenantNames = computed(() => {
  if (!tenants.value || selectedTenants.value.length === 0) return ''
  const selected = tenants.value
    .filter(t => selectedTenants.value.includes(t.id))
    .map(t => t.name)
  
  if (selected.length === 1) return selected[0]
  if (selected.length === 2) return `${selected[0]} and ${selected[1]}`
  return `${selected.slice(0, -1).join(', ')}, and ${selected[selected.length - 1]}`
})

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    error.value = 'No linking token provided. Please return to Slack and request a new link.'
    errorTitle.value = 'Invalid Link'
    loading.value = false
    return
  }

  // If user is not authenticated, show sign in prompt
  if (!user.value) {
    loading.value = false
    return
  }

  try {
    // Verify the token
    const verifyResponse = await api.post('/trpc/communication.verifySlackLinkingToken', {
      json: { token: route.query.token }
    })
    
    const verifyResult = verifyResponse.result?.data?.json
    
    if (!verifyResult?.valid) {
      error.value = 'This link has expired or is invalid. Please return to Slack and request a new link.'
      errorTitle.value = 'Link Expired'
      loading.value = false
      return
    }

    tokenInfo.value = verifyResult

    // Get user's tenants
    const tenantsResponse = await api.get('/trpc/auth.getUserTenants')
    const userTenants = tenantsResponse.result?.data?.json || []
    
    // Transform to match expected format
    tenants.value = userTenants.map(ut => ({
      id: ut.tenant.id,
      name: ut.tenant.name,
      role: ut.role
    }))

    // Auto-select all tenants by default
    selectedTenants.value = tenants.value.map(t => t.id)

    loading.value = false
  } catch (err) {
    error.value = 'An error occurred while verifying your link. Please try again.'
    loading.value = false
  }
})

async function signIn() {
  // Store the current URL to return after sign in
  sessionStorage.setItem('slack-link-return', window.location.href)
  await navigateTo('/login')
}

async function linkAccount() {
  if (selectedTenants.value.length === 0 || !tokenInfo.value) return

  linking.value = true
  error.value = ''

  try {
    const result = await api.post('/trpc/communication.linkSlackAccount', {
      json: {
        token: route.query.token,
        tenantIds: selectedTenants.value
      }
    })

    const linkResult = result.result?.data?.json

    if (linkResult?.success) {
      linkingComplete.value = true
    } else {
      error.value = linkResult?.error || 'Failed to link account'
      errorTitle.value = 'Linking Failed'
    }
  } catch (err) {
    error.value = 'An error occurred while linking your account. Please try again.'
    errorTitle.value = 'Linking Failed'
  } finally {
    linking.value = false
  }
}

function selectAll() {
  selectedTenants.value = tenants.value.map(t => t.id)
}

function returnToSlack() {
  // Try to open Slack desktop app
  window.location.href = 'slack://open'
  
  // Fallback to web app after a delay
  setTimeout(() => {
    window.open('https://app.slack.com', '_blank')
  }, 1000)
}
</script>

<style scoped>
.slack-link-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  padding: 20px;
}

.slack-link-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 40px;
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.slack-icon {
  margin-bottom: 24px;
}

h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.loading-state,
.linking-state {
  padding: 40px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state,
.no-tenants {
  padding: 20px 0;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #4caf50;
}

.success-message {
  color: #4caf50;
  font-weight: 500;
}

.tenant-list {
  text-align: left;
  margin: 24px 0;
  max-height: 300px;
  overflow-y: auto;
}

.tenant-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  transition: background-color 0.2s;
}

.tenant-item:hover {
  background-color: #f5f5f5;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.tenant-name {
  font-weight: 500;
  color: #333;
  flex: 1;
}

.tenant-role {
  color: #999;
  font-size: 14px;
  margin-left: 8px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

.button {
  padding: 12px 24px;
  border-radius: 4px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.button-primary {
  background-color: #3498db;
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.button-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.button-secondary {
  background-color: #ecf0f1;
  color: #34495e;
}

.button-secondary:hover {
  background-color: #d5dbdb;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.auth-required {
  padding: 40px 0;
}
</style>