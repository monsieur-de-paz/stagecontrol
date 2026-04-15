const { app, BrowserWindow, ipcMain, systemPreferences, screen, Menu, shell, session, protocol, net, desktopCapturer, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

// ═══ CUSTOM PROTOCOL ═══════════════════════════════
// Serve everything under app:// so pages + iframes share one origin
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false, stream: true }
}]);

let controlWin = null;
let displayWin = null;
let configPath = null;

// ═══ OPEN EXTERNAL URL ════════════════════════════
ipcMain.on('open-url', (_event, url) => {
  const safe = /^https?:\/\//i.test(url);
  if (safe) shell.openExternal(url);
});

// ═══ ABOUT WINDOW ══════════════════════════════════
let aboutWin = null;
function openAboutWindow() {
  if (aboutWin && !aboutWin.isDestroyed()) { aboutWin.focus(); return; }
  aboutWin = new BrowserWindow({
    width: 360,
    height: 480,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    title: 'À propos — StageControl',
    icon: path.join(__dirname, 'icone', 'stagecontrol.icns'),
    backgroundColor: '#07070f',
    parent: controlWin || undefined,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  aboutWin.loadURL('app://local/about.html');
  aboutWin.on('closed', () => { aboutWin = null; });
}

// ═══ IPC RELAY ═════════════════════════════════════
// Relay messages between renderer windows
ipcMain.on('sc-msg', (event, data) => {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(win => {
    if (!win.isDestroyed() && win.webContents.id !== event.sender.id) {
      win.webContents.send('sc-msg', data);
    }
  });
});

// ═══ DISPLAY MANAGEMENT ═══════════════════════════
ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    label: d.label || (d.bounds.width + 'x' + d.bounds.height),
    width: d.bounds.width,
    height: d.bounds.height,
    x: d.bounds.x,
    y: d.bounds.y,
    isPrimary: d.id === screen.getPrimaryDisplay().id
  }));
});

ipcMain.handle('move-display-to', (event, displayId) => {
  if (!displayWin || displayWin.isDestroyed()) return false;
  const target = screen.getAllDisplays().find(d => d.id === displayId);
  if (!target) return false;
  displayWin.setBounds({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height
  });
  displayWin.setFullScreen(true);
  return true;
});

ipcMain.handle('toggle-display-fullscreen', () => {
  if (!displayWin || displayWin.isDestroyed()) return;
  displayWin.setFullScreen(!displayWin.isFullScreen());
});

// ═══ VIDEO RECORDING ══════════════════════════════
let recTempPath = null;
let recWriteStream = null;

ipcMain.handle('init-recording', async (_event, ext) => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = 'StageControl-' + ts + '.' + (ext || 'webm');
  recTempPath = path.join(os.tmpdir(), name);
  recWriteStream = fs.createWriteStream(recTempPath);
  return { tempPath: recTempPath, name: name };
});

ipcMain.handle('write-recording-chunk', async (_event, chunk) => {
  if (recWriteStream && !recWriteStream.destroyed) {
    const buf = Buffer.isBuffer(chunk) ? chunk
      : ArrayBuffer.isView(chunk) ? Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      : Buffer.from(chunk);
    if (buf.length > 0) recWriteStream.write(buf);
  }
});

ipcMain.handle('finish-recording', async () => {
  return new Promise((resolve) => {
    if (recWriteStream && !recWriteStream.destroyed) {
      recWriteStream.end(() => {
        const p = recTempPath;
        const size = fs.existsSync(p) ? fs.statSync(p).size : 0;
        recWriteStream = null;
        resolve({ tempPath: p, size: size });
      });
    } else {
      resolve({ tempPath: recTempPath, size: 0 });
    }
  });
});

ipcMain.handle('export-recording', async () => {
  if (!recTempPath || !fs.existsSync(recTempPath)) return { saved: false };
  const ext = path.extname(recTempPath).slice(1);
  const result = await dialog.showSaveDialog(controlWin || BrowserWindow.getFocusedWindow(), {
    title: 'Enregistrer la vid\u00e9o',
    defaultPath: path.basename(recTempPath),
    filters: [{ name: 'Vid\u00e9o', extensions: [ext, 'webm', 'mp4', 'mov'] }]
  });
  if (result.canceled || !result.filePath) return { saved: false };
  fs.copyFileSync(recTempPath, result.filePath);
  return { saved: true, path: result.filePath };
});

// ═══ CONFIGURATION ═════════════════════════════════
ipcMain.handle('save-config', async (_event, configData) => {
  if (!configPath) return { ok: false, error: 'App not ready' };
  try {
    fs.writeFileSync(configPath, JSON.stringify(configData), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('load-config', async () => {
  if (!configPath || !fs.existsSync(configPath)) return { ok: true, data: null };
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ═══ CREATE WINDOWS ════════════════════════════════
function createWindows() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find(d => d.id !== primary.id);

  // Control window — always on primary
  controlWin = new BrowserWindow({
    width: 1440,
    height: 900,
    x: primary.bounds.x + 20,
    y: primary.bounds.y + 20,
    title: 'StageControl — RÉGIE',    icon: path.join(__dirname, 'icone', 'stagecontrol.icns'),    backgroundColor: '#07070f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  controlWin.loadURL('app://local/control.html');

  // Context menu (cut / copy / paste) for all editable fields
  controlWin.webContents.on('context-menu', (_event, params) => {
    const items = [];
    if (params.isEditable || params.editFlags.canCut || params.editFlags.canCopy || params.editFlags.canPaste) {
      if (params.editFlags.canCut)  items.push({ role: 'cut',   label: 'Couper'  });
      if (params.editFlags.canCopy) items.push({ role: 'copy',  label: 'Copier'  });
      items.push({ role: 'paste', label: 'Coller' });
      items.push({ type: 'separator' });
      items.push({ role: 'selectAll', label: 'Tout sélectionner' });
    } else if (params.editFlags.canCopy) {
      items.push({ role: 'copy', label: 'Copier' });
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: controlWin });
  });

  // Display window — on external monitor if available, otherwise secondary window
  const displayBounds = external
    ? { x: external.bounds.x, y: external.bounds.y, width: external.bounds.width, height: external.bounds.height }
    : { x: primary.bounds.x + 80, y: primary.bounds.y + 80, width: 1280, height: 720 };

  displayWin = new BrowserWindow({
    ...displayBounds,
    title: 'StageControl — Display',    frame: false,    icon: path.join(__dirname, 'icone', 'stagecontrol.icns'),    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  displayWin.loadURL('app://local/display.html');

  // Fullscreen on external monitor
  if (external) {
    displayWin.setFullScreen(true);
  }

  // Handle window close
  controlWin.on('closed', () => {
    controlWin = null;
    if (displayWin && !displayWin.isDestroyed()) displayWin.close();
    app.quit();
  });
  displayWin.on('closed', () => { displayWin = null; });
}

// ═══ MENU ══════════════════════════════════════════
function buildMenu() {
  const template = [
    {
      label: 'StageControl',
      submenu: [
        {
          label: 'À propos de StageControl…',
          click: () => openAboutWindow()
        },
        { type: 'separator' },
        {
          label: 'Réinitialiser l\'application…',
          click: async () => {
            const result = await dialog.showMessageBox(controlWin || BrowserWindow.getFocusedWindow(), {
              type: 'warning',
              title: 'Réinitialiser StageControl',
              message: 'Réinitialiser entièrement l\'application ?',
              detail: 'Tous les joueurs, sons, mèmes, paramètres et réglages seront supprimés. Cette action est irréversible.',
              buttons: ['Réinitialiser', 'Annuler'],
              defaultId: 1,
              cancelId: 1
            });
            if (result.response === 0) {
              if (configPath && fs.existsSync(configPath)) fs.unlinkSync(configPath);
              if (controlWin && !controlWin.isDestroyed()) {
                await controlWin.webContents.executeJavaScript('localStorage.clear()');
                controlWin.reload();
              }
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' }
      ]
    },
    {
      label: 'Display',
      submenu: [
        {
          label: 'Plein écran Display',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            if (displayWin && !displayWin.isDestroyed()) {
              displayWin.setFullScreen(!displayWin.isFullScreen());
            }
          }
        },
        {
          label: 'Rouvrir Display',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            if (!displayWin || displayWin.isDestroyed()) {
              const displays = screen.getAllDisplays();
              const primary = screen.getPrimaryDisplay();
              const external = displays.find(d => d.id !== primary.id);
              const bounds = external
                ? { x: external.bounds.x, y: external.bounds.y, width: external.bounds.width, height: external.bounds.height }
                : { x: primary.bounds.x + 80, y: primary.bounds.y + 80, width: 1280, height: 720 };
              displayWin = new BrowserWindow({
                ...bounds,
                title: 'StageControl — Display',                frame: false,                icon: path.join(__dirname, 'icone', 'stagecontrol.icns'),                backgroundColor: '#000000',
                webPreferences: {
                  preload: path.join(__dirname, 'preload.js'),
                  contextIsolation: true,
                  nodeIntegration: false,
                  backgroundThrottling: false
                }
              });
              displayWin.loadURL('app://local/display.html');
              if (external) displayWin.setFullScreen(true);
              displayWin.on('closed', () => { displayWin = null; });
            } else {
              displayWin.focus();
            }
          }
        },
        { type: 'separator' },
        ...screen.getAllDisplays().map((d, i) => ({
          label: 'Déplacer vers : ' + (d.label || ('Écran ' + (i + 1) + ' — ' + d.bounds.width + 'x' + d.bounds.height)),
          click: () => {
            if (displayWin && !displayWin.isDestroyed()) {
              displayWin.setFullScreen(false);
              displayWin.setBounds({ x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height });
              setTimeout(() => displayWin.setFullScreen(true), 300);
            }
          }
        }))
      ]
    },
    {      label: 'Configuration',
      submenu: [
        {
          label: 'Exporter la configuration\u2026',
          click: async () => {
            if (!configPath || !fs.existsSync(configPath)) {
              dialog.showMessageBoxSync(controlWin || BrowserWindow.getFocusedWindow(), { message: 'Aucune configuration sauvegard\u00e9e.', type: 'info' });
              return;
            }
            const result = await dialog.showSaveDialog(controlWin || BrowserWindow.getFocusedWindow(), {
              title: 'Exporter la configuration',
              defaultPath: 'StageControl-config.scconfig',
              filters: [{ name: 'StageControl Config', extensions: ['scconfig'] }]
            });
            if (!result.canceled && result.filePath) {
              fs.copyFileSync(configPath, result.filePath);
            }
          }
        },
        {
          label: 'Importer une configuration\u2026',
          click: async () => {
            const result = await dialog.showOpenDialog(controlWin || BrowserWindow.getFocusedWindow(), {
              title: 'Importer une configuration',
              filters: [{ name: 'StageControl Config', extensions: ['scconfig'] }],
              properties: ['openFile']
            });
            if (result.canceled || !result.filePaths.length) return;
            try {
              const raw = fs.readFileSync(result.filePaths[0], 'utf8');
              JSON.parse(raw);
              fs.copyFileSync(result.filePaths[0], configPath);
              if (controlWin && !controlWin.isDestroyed()) {
                controlWin.webContents.send('sc-msg', { type: 'config-imported' });
              }
            } catch (e) {
              dialog.showMessageBoxSync(controlWin || BrowserWindow.getFocusedWindow(), { message: 'Fichier de configuration invalide.\n' + e.message, type: 'error' });
            }
          }
        }
      ]
    },
    {      label: 'Fenêtre',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Dev',
      submenu: [
        { role: 'reload', label: 'Recharger Régie' },
        {
          label: 'Recharger Display',
          click: () => { if (displayWin && !displayWin.isDestroyed()) displayWin.reload(); }
        },
        { role: 'toggleDevTools', label: 'DevTools Régie' },
        {
          label: 'DevTools Display',
          click: () => { if (displayWin && !displayWin.isDestroyed()) displayWin.webContents.toggleDevTools(); }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ═══ APP LIFECYCLE ═════════════════════════════════
app.whenReady().then(async () => {
  // Config path
  configPath = path.join(app.getPath('userData'), 'config.json');

  // Request camera permission on macOS (native OS dialog)
  if (process.platform === 'darwin') {
    const camStatus = systemPreferences.getMediaAccessStatus('camera');
    if (camStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('camera');
    }
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    if (micStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }
  }

  // Register app:// protocol handler
  protocol.handle('app', (request) => {
    const reqUrl = new URL(request.url);
    const filePath = path.join(__dirname, decodeURIComponent(reqUrl.pathname));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  // Allow camera/microphone everywhere (main windows + preview iframe)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));

  // Auto-select display window for getDisplayMedia (video recording)
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['window'] });
      const wantedId = (displayWin && !displayWin.isDestroyed()) ? displayWin.getMediaSourceId() : null;
      const displaySource = sources.find(s => s.id === wantedId) || sources.find(s => s.name.includes('Display')) || sources[0];
      callback({ video: displaySource, audio: 'loopback' });
    } catch (e) {
      callback(null);
    }
  });

  buildMenu();
  createWindows();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (!controlWin) createWindows();
});
