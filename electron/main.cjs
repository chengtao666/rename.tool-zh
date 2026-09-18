const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let mainWindow = null;
let serverProcess = null;
let serverLog = null;

const APP_TITLE = "Rename.Tools 中文版";

function getStandalonePath() {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, "app");
	}

	return path.join(__dirname, "..", ".next", "standalone");
}

function getAvailablePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : 3000;
			server.close(() => resolve(port));
		});
	});
}

function waitForServer(url, timeoutMs = 45000) {
	const startedAt = Date.now();

	return new Promise((resolve, reject) => {
		const check = () => {
			const request = http.get(url, (response) => {
				response.resume();
				if (response.statusCode && response.statusCode < 500) {
					resolve();
					return;
				}
				retry();
			});

			request.on("error", retry);
			request.setTimeout(1500, () => request.destroy());
		};

		const retry = () => {
			if (Date.now() - startedAt >= timeoutMs) {
				reject(new Error("本地服务启动超时"));
				return;
			}
			setTimeout(check, 250);
		};

		check();
	});
}

async function startServer() {
	const appRoot = getStandalonePath();
	const serverPath = path.join(appRoot, "server.js");

	if (!fs.existsSync(serverPath)) {
		throw new Error(`未找到桌面版服务文件：${serverPath}`);
	}

	const port = await getAvailablePort();
	const logPath = path.join(app.getPath("userData"), "desktop-server.log");
	serverLog = fs.createWriteStream(logPath, { flags: "a" });

	serverProcess = spawn(process.execPath, [serverPath], {
		cwd: appRoot,
		env: {
			...process.env,
			ELECTRON_RUN_AS_NODE: "1",
			HOSTNAME: "127.0.0.1",
			NEXT_TELEMETRY_DISABLED: "1",
			NODE_ENV: "production",
			PORT: String(port),
		},
		windowsHide: true,
		stdio: ["ignore", "pipe", "pipe"],
	});

	serverProcess.stdout?.pipe(serverLog, { end: false });
	serverProcess.stderr?.pipe(serverLog, { end: false });
	serverProcess.on("exit", (code) => {
		if (code && !app.isQuitting) {
			dialog.showErrorBox(APP_TITLE, `本地服务已停止，退出代码：${code}`);
		}
	});

	const baseUrl = `http://127.0.0.1:${port}`;
	await waitForServer(`${baseUrl}/api/health`);
	return baseUrl;
}

function wireExternalLinks(window, baseUrl) {
	window.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:\/\//i.test(url)) {
			void shell.openExternal(url);
		}
		return { action: "deny" };
	});

	window.webContents.on("will-navigate", (event, url) => {
		if (url.startsWith(baseUrl)) {
			return;
		}

		event.preventDefault();
		if (/^https?:\/\//i.test(url)) {
			void shell.openExternal(url);
		}
	});
}

async function createWindow() {
	try {
		const baseUrl = await startServer();

		mainWindow = new BrowserWindow({
			width: 1440,
			height: 900,
			minWidth: 1024,
			minHeight: 680,
			title: APP_TITLE,
			backgroundColor: "#ffffff",
			autoHideMenuBar: true,
			icon: path.join(__dirname, "..", "public", "icon-512.png"),
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: true,
			},
		});

		mainWindow.removeMenu();
		wireExternalLinks(mainWindow, baseUrl);
		await mainWindow.loadURL(`${baseUrl}/zh/app`);
		mainWindow.on("closed", () => {
			mainWindow = null;
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		dialog.showErrorBox(APP_TITLE, `启动失败：${message}`);
		app.quit();
	}
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
			}
			mainWindow.focus();
		}
	});

	app.whenReady().then(createWindow);
}

app.on("before-quit", () => {
	app.isQuitting = true;
	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill();
	}
	serverLog?.end();
});

app.on("window-all-closed", () => {
	app.quit();
});
