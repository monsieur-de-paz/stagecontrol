const { app, BrowserWindow, ipcMain, systemPreferences, screen, Menu } = require('electron');
const path = require('path');

let controlWin = null;
let displayWin = null;

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
    title: 'StageControl — RÉGIE',
    backgroundColor: '#07070f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  controlWin.loadFile('control.html');

  // Display window — on external monitor if available, otherwise secondary window
  const displayBounds = external
    ? { x: external.bounds.x, y: external.bounds.y, width: external.bounds.width, height: external.bounds.height }
    : { x: primary.bounds.x + 80, y: primary.bounds.y + 80, width: 1280, height: 720 };

  displayWin = new BrowserWindow({
    ...displayBounds,
    title: 'StageControl — Display',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  displayWin.loadFile('display.html');

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
        { role: 'about', label: 'À propos de StageControl' },
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
                title: 'StageControl — Display',
                backgroundColor: '#000000',
                webPreferences: {
                  preload: path.join(__dirname, 'preload.js'),
                  contextIsolation: true,
                  nodeIntegration: false
                }
              });
              displayWin.loadFile('display.html');
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
    {
      label: 'Fenêtre',
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
  // Request camera permission on macOS (native OS dialog)
  if (process.platform === 'darwin') {
    const camStatus = systemPreferences.getMediaAccessStatus('camera');
    if (camStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('camera');
    }
  }

  buildMenu();
  createWindows();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (!controlWin) createWindows();
});
