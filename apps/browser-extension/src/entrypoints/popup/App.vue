<template>
  <div class="popup">
    <!-- Show login if not authenticated -->
    <Login v-if="!isAuthenticated" />
    
    <!-- Show main interface if authenticated -->
    <template v-else>
      <header>
        <h1>Figgy → Xero</h1>
        <p>Drag files between apps</p>
      </header>
      
      <main>
        <!-- Status -->
        <div class="status success">
          <span>Ready to transfer files</span>
        </div>
        
        <!-- User info -->
        <div class="user-info">
          <span class="user-email">{{ userEmail }}</span>
          <button @click="handleSignOut" class="btn-link">Sign out</button>
        </div>
        
        <!-- Instructions -->
        <div class="instructions">
          <h2>How to use:</h2>
          <ol>
            <li>Open your files in Figgy</li>
            <li>Drag any file from the page</li>
            <li>Drop it into Xero</li>
          </ol>
        </div>
        
        <!-- Quick Links -->
        <div class="links">
          <button @click="openFiggy" class="btn">Open Figgy</button>
          <button @click="openXero" class="btn">Open Xero</button>
        </div>
      </main>
      
      <footer>
        <span class="version">v{{ version }}</span>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { getConfig } from '../../utils/config';
import { useAuthStore } from '../../stores/auth';
import { createConsole } from '../../utils/console';
import Login from './Login.vue';

const version = chrome.runtime.getManifest().version;
const config = getConfig().getApiConfig();
const console = createConsole('popup');

const { isAuthenticated, userEmail, initAuth, signOut, onAuthStateChange } = useAuthStore();

// Initialize auth on mount
onMounted(async () => {
  console.info('Popup mounted, initializing auth...');
  
  await initAuth();
  
  // Listen for auth state changes
  const unsubscribe = onAuthStateChange();
  
  // Listen for messages from background script about auth updates
  const messageListener = (message: any) => {
    if (message.type === 'AUTH_UPDATED') {
      console.info('Received auth update message from background:', message.payload);
      // Refresh auth state
      initAuth();
    }
  };
  
  chrome.runtime.onMessage.addListener(messageListener);
  
  // Add a periodic check for auth state in case something was missed
  const authCheckInterval = setInterval(async () => {
    console.debug('Periodic auth check...');
    await initAuth();
  }, 5000); // Check every 5 seconds
  
  // Clean up on unmount
  return () => {
    console.info('Cleaning up auth listeners...');
    unsubscribe.subscription.unsubscribe();
    chrome.runtime.onMessage.removeListener(messageListener);
    clearInterval(authCheckInterval);
  };
});

function openFiggy() {
  chrome.tabs.create({ url: `${config.APP_URL}/files` });
}

function openXero() {
  chrome.tabs.create({ url: 'https://go.xero.com/app/files' });
}

async function handleSignOut() {
  await signOut();
}
</script>

<style scoped>
.popup {
  width: 320px;
  background: #fff;
  font-family: var(--font-family-sans, system-ui, -apple-system, sans-serif);
}

header {
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

header p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #6c757d;
}

main {
  padding: 16px;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
}

.user-email {
  color: #495057;
  font-weight: 500;
}

.btn-link {
  background: none;
  border: none;
  color: #0066cc;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.btn-link:hover {
  color: #0052a3;
}

.instructions {
  margin-bottom: 16px;
}

.instructions h2 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.instructions ol {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #495057;
}

.instructions li {
  margin: 4px 0;
}

.links {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: #fff;
  color: #495057;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}


footer {
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.version {
  font-size: 12px;
  color: #6c757d;
}
</style>