const { contextBridge, ipcRenderer } = require('electron');

// Local BroadcastChannel for iframe preview (same renderer process)
const localBC = new BroadcastChannel('stagecontrol');

contextBridge.exposeInMainWorld('sc', {
  // Send a message to other windows via main process IPC
  send: (data) => {
    ipcRenderer.send('sc-msg', data);
    // Also post to local BroadcastChannel so iframe preview receives it
    localBC.postMessage(data);
  },

  // Register a handler for messages from other windows
  onMessage: (callback) => {
    ipcRenderer.on('sc-msg', (_event, data) => {
      callback(data);
      // Also broadcast locally for iframe previews
      localBC.postMessage(data);
    });
  },

  // Display management
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  moveDisplayTo: (displayId) => ipcRenderer.invoke('move-display-to', displayId),
  toggleDisplayFullscreen: () => ipcRenderer.invoke('toggle-display-fullscreen'),

  // Video recording
  initRecording: (ext) => ipcRenderer.invoke('init-recording', ext),
  writeRecordingChunk: (chunk) => {
    // Ensure we send a proper Uint8Array for reliable IPC serialization
    var arr = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    return ipcRenderer.invoke('write-recording-chunk', arr);
  },
  finishRecording: () => ipcRenderer.invoke('finish-recording'),
  exportRecording: () => ipcRenderer.invoke('export-recording'),

  // Platform info
  platform: process.platform
});
