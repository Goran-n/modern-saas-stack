<template>
  <div class="login-container">
    <div class="login-header">
      <h2>Sign in to Figgy</h2>
      <p>Sign in to enable file transfers</p>
    </div>

    <div class="welcome-content">
      <p>Get started with Figgy file transfers</p>
      
      <div class="auth-buttons">
        <button @click="openAuthTab" class="btn-primary">
          Get Started
        </button>
        
        <button @click="openAuthTab" class="btn-secondary">
          Already have account?
        </button>
      </div>
    </div>

    <div class="login-footer">
      <a href="#" @click.prevent="openWebApp" class="link">
        Open Figgy web app →
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MessageType } from '../../types/messages';
import { env } from '../../config/env';

const openAuthTab = async () => {
  // Send message to background script to open auth tab
  chrome.runtime.sendMessage({
    type: MessageType.AUTH_REQUEST,
    payload: {}
  });
};

const openWebApp = () => {
  chrome.tabs.create({ url: `${env.APP_URL}/auth/login` });
};
</script>

<style scoped>
.login-container {
  padding: 20px;
  max-width: 320px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: #6c757d;
}

.welcome-content {
  text-align: center;
  margin-bottom: 24px;
}

.welcome-content p {
  margin: 0 0 20px;
  color: #6c757d;
  font-size: 14px;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  padding: 10px 16px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0052a3;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 16px;
  background-color: white;
  color: #495057;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: #f8f9fa;
  border-color: #adb5bd;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.link {
  color: #0066cc;
  text-decoration: none;
  font-size: 13px;
  transition: color 0.2s;
}

.link:hover {
  color: #0052a3;
  text-decoration: underline;
}
</style>