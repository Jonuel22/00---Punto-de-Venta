const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;
const PORT = 5000;

// ── Buscar node.exe en el sistema ───────────────────────────────────────────
function findNode() {
  try {
    const result = execSync('where node', { encoding: 'utf8', timeout: 3000 }).trim().split('\n')[0].trim();
    if (result) return result;
  } catch (e) {}

  const fs = require('fs');
  const commonPaths = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
  ];
  for (const p of commonPaths) {
    try { if (fs.existsSync(p)) return p; } catch (e) {}
  }
  return null;
}

// ── Lanzar el servidor Express ──────────────────────────────────────────────
function startServer() {
  const isProd = app.isPackaged;

  const appRoot = isProd
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : __dirname;

  const serverPath = path.join(appRoot, 'server.js');
  const nodeBin = findNode();

  if (!nodeBin) {
    dialog.showErrorBox(
      'Node.js no encontrado',
      'No se encontró Node.js instalado en el sistema.\n\nPor favor instala Node.js desde:\nhttps://nodejs.org\n\nLuego vuelve a abrir la aplicación.'
    );
    app.quit();
    return;
  }

  serverProcess = spawn(nodeBin, [serverPath], {
    cwd: appRoot,
    env: {
      ...process.env,
      PORT: PORT,
      APP_ROOT: appRoot,
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', d => console.log('[SERVER]', d.toString()));
  serverProcess.stderr.on('data', d => console.error('[SERVER ERR]', d.toString()));
  serverProcess.on('close', code => console.log(`Server exited with code ${code}`));
}

// ── Esperar que el servidor esté listo ──────────────────────────────────────
function waitForServer(retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get(`http://localhost:${PORT}/`, (res) => {
        resolve();
      }).on('error', () => {
        if (n <= 0) return reject(new Error('El servidor no respondió a tiempo'));
        setTimeout(() => check(n - 1), delay);
      });
    };
    check(retries);
  });
}

// ── Crear ventana de impresión ──────────────────────────────────────────────
function createPrintWindow(url) {
  const printWin = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  printWin.loadURL(url);
  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print({}, (success) => {
      if (success) printWin.close();
    });
  });
}

// ── Crear la ventana principal ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'LOGO.jpg'),
    title: 'Punto de Venta - JCTechnology',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Permitir que window.open() funcione para impresión
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Si es una URL de datos (blob/data) o about:blank, abrir ventana nueva de Electron
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      }
    };
  });

  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.show();

  waitForServer()
    .then(() => {
      mainWindow.loadURL(`http://localhost:${PORT}/login.html`);
    })
    .catch((err) => {
      dialog.showErrorBox(
        'Error al iniciar',
        'No se pudo conectar con el servidor.\n\nAsegúrate de que MySQL esté corriendo.\n\n' + err.message
      );
      app.quit();
    });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Eventos de la app ───────────────────────────────────────────────────────
app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});