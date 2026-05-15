const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;
const PORT = 5000;

// ── Lanzar el servidor Express ──────────────────────────────────────────────
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');

  // En producción (.exe), el ejecutable de node está dentro del paquete
  const nodeBin = process.platform === 'win32'
    ? path.join(process.resourcesPath, 'node', 'node.exe')
    : 'node';

  serverProcess = spawn(nodeBin, [serverPath], {
    cwd: __dirname,
    env: { ...process.env, PORT: PORT },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', d => console.log('[SERVER]', d.toString()));
  serverProcess.stderr.on('data', d => console.error('[SERVER ERR]', d.toString()));

  serverProcess.on('close', code => {
    console.log(`Server process exited with code ${code}`);
  });
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
    show: false, // no mostrar hasta que cargue
  });

  // Pantalla de carga mientras arranca el servidor
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.show();

  // Cuando el servidor esté listo, cargar la app real
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