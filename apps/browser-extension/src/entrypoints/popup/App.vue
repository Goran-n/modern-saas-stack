<template>
  <div class="popup">
    <header>
      <h1>Kibly → Xero</h1>
      <p>Drag files between apps</p>
    </header>
    
    <main>
      <!-- Status -->
      <div class="status success">
        <span>Ready to transfer files</span>
      </div>
      
      <!-- Instructions -->
      <div class="instructions">
        <h2>How to use:</h2>
        <ol>
          <li>Open your files in Kibly</li>
          <li>Drag any file from the page</li>
          <li>Drop it into Xero</li>
        </ol>
      </div>
      
      <!-- Quick Links -->
      <div class="links">
        <button @click="openKibly" class="btn">Open Kibly</button>
        <button @click="openXero" class="btn">Open Xero</button>
      </div>
    </main>
    
    <footer>
      <span class="version">v{{ version }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { getConfig } from '../../utils/config';

const version = chrome.runtime.getManifest().version;
const config = getConfig().getApiConfig();

function openKibly() {
  chrome.tabs.create({ url: `${config.APP_URL}/files` });
}

function openXero() {
  chrome.tabs.create({ url: 'https://go.xero.com/app/files' });
}
</script>

<style scoped>
.popup {
  width: 320px;
  background: #fff;
  font-family: system-ui, -apple-system, sans-serif;
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