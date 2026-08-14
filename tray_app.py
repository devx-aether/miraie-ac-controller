import os
import sys
import socket
import webbrowser
import subprocess
import shutil
import time
import threading
import requests
from datetime import datetime
from PIL import Image, ImageDraw
import pystray

# -------------------------------------------------------------
# Paths & Mode Configuration
# -------------------------------------------------------------

RUN_IN_PROD = True

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")
FRONTEND_DIR = os.path.join(PROJECT_DIR, "frontend")
LOGS_DIR = os.path.join(PROJECT_DIR, "logs")

DIST_DIR = None
if os.path.exists(os.path.join(FRONTEND_DIR, "dist", "index.html")):
    DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
elif os.path.exists(os.path.join(FRONTEND_DIR, "index.html")):
    DIST_DIR = FRONTEND_DIR

# Automatic Mode Detection
IS_PROD = (DIST_DIR is not None) and RUN_IN_PROD

# Ports & URLs Configuration
BACKEND_PORT = 8000
FRONTEND_PORT = 3000 if not IS_PROD else BACKEND_PORT

DASHBOARD_URL = f"http://localhost:{BACKEND_PORT}" if IS_PROD else f"http://localhost:{FRONTEND_PORT}"
BACKEND_URL = f"http://localhost:{BACKEND_PORT}/docs"
BACKEND_HEALTH = f"http://localhost:{BACKEND_PORT}/docs"

# Ensure logs directory exists
os.makedirs(LOGS_DIR, exist_ok=True)
BACKEND_LOG = os.path.join(LOGS_DIR, "backend.log")
FRONTEND_LOG = os.path.join(LOGS_DIR, "frontend.log")

# 1. Resolve Python Executable (.venv inside backend folder)
VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
if os.path.exists(VENV_PYTHON):
    PYTHON_EXE = VENV_PYTHON
else:
    PYTHON_EXE = sys.executable

# 2. Resolve NPM Executable (Windows npm.cmd)
NPM_CMD = shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"

# Process Handlers & State
backend_proc: subprocess.Popen | None = None
frontend_proc: subprocess.Popen | None = None
tray_icon: pystray.Icon | None = None
startup_time: datetime | None = None


# -------------------------------------------------------------
# Port Validation & Health Checks (Fail-Fast Engine)
# -------------------------------------------------------------
def is_port_available(port: int, host: str = "127.0.0.1") -> bool:
    """Checks if a local network port is completely free to bind."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, port))
            return True
        except OSError:
            return False


def is_running(proc: subprocess.Popen | None) -> bool:
    """Checks if a subprocess is alive."""
    return proc is not None and proc.poll() is None


def is_backend_healthy() -> bool:
    """Checks if FastAPI server is up and accepting HTTP traffic."""
    try:
        response = requests.get(BACKEND_HEALTH, timeout=2)
        return response.status_code < 500
    except Exception:
        return False


def is_frontend_healthy() -> bool:
    """Checks if the dashboard is reachable."""
    try:
        response = requests.get(DASHBOARD_URL, timeout=2)
        return response.status_code < 500
    except Exception:
        return False


def wait_for_backend(timeout: int = 30) -> bool:
    """Polls backend health until online or timeout."""
    start = time.time()
    while time.time() - start < timeout:
        if is_backend_healthy():
            return True
        time.sleep(1)
    return False


def wait_for_frontend(timeout: int = 30) -> bool:
    """Polls frontend health until online or timeout."""
    start = time.time()
    while time.time() - start < timeout:
        if is_frontend_healthy():
            return True
        time.sleep(1)
    return False


def get_hide_window_flags() -> int:
    """Windows flag to prevent command prompts from flashing."""
    if sys.platform == "win32":
        return 0x08000000  # CREATE_NO_WINDOW
    return 0


def open_logs_folder(icon=None, item=None):
    """Reliably opens the logs folder in Windows File Explorer."""
    os.makedirs(LOGS_DIR, exist_ok=True)
    if sys.platform == "win32":
        subprocess.Popen(["explorer", os.path.abspath(LOGS_DIR)])
    else:
        webbrowser.open(f"file://{os.path.abspath(LOGS_DIR)}")


# -------------------------------------------------------------
# Process Management
# -------------------------------------------------------------
def start_backend():
    global backend_proc
    if not is_running(backend_proc):
        # 1. Fail-Fast Port Check
        if not is_port_available(BACKEND_PORT):
            err_msg = f"Port {BACKEND_PORT} is already occupied by another application!"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ [ERROR] {err_msg}")
            with open(BACKEND_LOG, "a", encoding="utf-8") as f:
                f.write(f"\n[{datetime.now().isoformat()}] PORT CONFLICT: {err_msg}\n")
            if tray_icon:
                tray_icon.notify(f"Port {BACKEND_PORT} Occupied", "Backend Port Conflict")
            return

        mode_label = "Production (Embedded UI)" if IS_PROD else "Dev API"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting FastAPI [{mode_label}] on port {BACKEND_PORT}...")

        cmd = [
            PYTHON_EXE,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(BACKEND_PORT),
            "--loop",
            "asyncio",
        ]

        sub_env = os.environ.copy()
        sub_env["PYTHONIOENCODING"] = "utf-8"
        sub_env["PYTHONUTF8"] = "1"

        log_file = open(BACKEND_LOG, "a", encoding="utf-8")
        log_file.write(f"\n{'='*60}\n[{datetime.now().isoformat()}] Backend Start [{mode_label}]\n{'='*60}\n")
        log_file.flush()

        backend_proc = subprocess.Popen(
            cmd,
            cwd=BACKEND_DIR,
            creationflags=get_hide_window_flags(),
            stdout=log_file,
            stderr=log_file,
            env=sub_env,
        )

        def wait_and_notify_backend():
            if wait_for_backend():
                if tray_icon:
                    tray_icon.notify(f"Listening on port {BACKEND_PORT}", "✅ Server Ready")
            else:
                if tray_icon:
                    tray_icon.notify("Check backend.log for details", "⚠️ Server Slow/Failed")

        threading.Thread(target=wait_and_notify_backend, daemon=True).start()


def start_frontend():
    global frontend_proc
    # In Production mode, FastAPI serves the frontend bundle from dist/
    if IS_PROD:
        return

    if not is_running(frontend_proc):
        # Fail-Fast Port Check for Dev Vite Server
        if not is_port_available(FRONTEND_PORT):
            err_msg = f"Port {FRONTEND_PORT} is already occupied by another application!"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ [ERROR] {err_msg}")
            with open(FRONTEND_LOG, "a", encoding="utf-8") as f:
                f.write(f"\n[{datetime.now().isoformat()}] PORT CONFLICT: {err_msg}\n")
            if tray_icon:
                tray_icon.notify(f"Port {FRONTEND_PORT} Occupied", "Frontend Port Conflict")
            return

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting Vite Dev Server on port {FRONTEND_PORT}...")
        log_file = open(FRONTEND_LOG, "a", encoding="utf-8")
        log_file.write(f"\n{'='*60}\n[{datetime.now().isoformat()}] Frontend Dev Start\n{'='*60}\n")
        log_file.flush()

        cmd = [NPM_CMD, "run", "dev", "--", "--port", str(FRONTEND_PORT), "--strictPort"]

        frontend_proc = subprocess.Popen(
            cmd,
            cwd=FRONTEND_DIR,
            creationflags=get_hide_window_flags(),
            stdout=log_file,
            stderr=log_file,
            shell=True,
            env=os.environ.copy(),
        )

        def wait_and_notify_frontend():
            if wait_for_frontend():
                if tray_icon:
                    tray_icon.notify("Vite Dev Server Online", "✅ Frontend Ready")
            else:
                if tray_icon:
                    tray_icon.notify("Check frontend.log for details", "⚠️ Frontend Slow/Failed")

        threading.Thread(target=wait_and_notify_frontend, daemon=True).start()


def stop_process(proc: subprocess.Popen | None):
    """Cleanly terminates a Windows process and its subprocess tree."""
    if proc is not None:
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=get_hide_window_flags(),
            )
        except Exception:
            pass


def stop_backend_only(icon=None, item=None):
    global backend_proc
    stop_process(backend_proc)
    backend_proc = None
    if icon:
        icon.notify("FastAPI server shut down", "⏹️ Server Stopped")


def stop_frontend_only(icon=None, item=None):
    global frontend_proc
    stop_process(frontend_proc)
    frontend_proc = None
    if icon:
        icon.notify("Vite server shut down", "⏹️ Frontend Stopped")


def start_all(icon=None, item=None):
    global startup_time
    if startup_time is None:
        startup_time = datetime.now()
    start_backend()
    if not IS_PROD:
        start_frontend()


def stop_all(icon=None, item=None):
    global backend_proc, frontend_proc, startup_time
    stop_process(backend_proc)
    stop_process(frontend_proc)
    backend_proc = None
    frontend_proc = None
    startup_time = None
    if icon:
        icon.notify("All servers shut down", "⏹️ Services Stopped")


def restart_all(icon=None, item=None):
    stop_all(icon)
    time.sleep(1)
    start_all(icon)
    if icon:
        icon.notify("Services coming online...", "🔄 Servers Restarted")


# -------------------------------------------------------------
# Tray Menu & Icon
# -------------------------------------------------------------
def create_tray_icon():
    """Generates a high-res snowflake system tray icon."""
    size = 256
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")

    # Outer slate circle with cyan accent
    border_width = 12
    margin = 8
    draw.ellipse(
        (margin, margin, size - margin, size - margin),
        fill=(15, 23, 42, 255),
        outline=(6, 182, 212, 255),
        width=border_width,
    )

    # Snowflake spokes
    c = size // 2
    spoke_length = size // 2 - 30
    spoke_width = 16
    cyan = (6, 182, 212, 255)

    # Cross
    draw.line((c, c - spoke_length, c, c + spoke_length), fill=cyan, width=spoke_width)
    draw.line((c - spoke_length, c, c + spoke_length, c), fill=cyan, width=spoke_width)

    # Diagonal
    offset = int(spoke_length * 0.707)
    draw.line((c - offset, c - offset, c + offset, c + offset), fill=cyan, width=spoke_width)
    draw.line((c - offset, c + offset, c + offset, c - offset), fill=cyan, width=spoke_width)

    # Center dot
    center_size = 24
    draw.ellipse(
        (c - center_size, c - center_size, c + center_size, c + center_size),
        fill=(255, 255, 255, 255),
    )

    return image.resize((64, 64), Image.Resampling.LANCZOS)


def make_menu():
    """Generates live menu items tailored to Production or Dev mode."""
    backend_running = is_running(backend_proc)
    backend_healthy = is_backend_healthy() if backend_running else False
    backend_icon = "🟢" if backend_healthy else ("🟡" if backend_running else "🔴")

    menu_items = [
        pystray.MenuItem("╔══ Panasonic MirAIe Controller ══╗", lambda: None, enabled=False),
        pystray.MenuItem(
            f"   Mode: {'🚀 Production (Dist Bundle)' if IS_PROD else '🛠️ Development (Vite Dev)'}",
            lambda: None,
            enabled=False,
        ),
        pystray.Menu.SEPARATOR,
    ]

    # --- Mode-Specific Status Blocks ---
    if IS_PROD:
        # Production: Single Unified Server
        menu_items.extend([
            pystray.MenuItem(f"{backend_icon} Unified App (Port :{BACKEND_PORT})", lambda: None, enabled=False),
            pystray.MenuItem(
                f"   Status: {'✅ Online (App & API)' if backend_healthy else ('⏳ Starting...' if backend_running else '❌ Offline')}",
                lambda: None,
                enabled=False,
            ),
            pystray.MenuItem(f"   URL: {DASHBOARD_URL}", lambda: None, enabled=False),
        ])
    else:
        # Development: Separate Frontend and Backend
        frontend_running = is_running(frontend_proc)
        frontend_healthy = is_frontend_healthy() if frontend_running else False
        frontend_icon = "🟢" if frontend_healthy else ("🟡" if frontend_running else "🔴")

        menu_items.extend([
            pystray.MenuItem(f"{frontend_icon} Frontend (Vite :{FRONTEND_PORT})", lambda: None, enabled=False),
            pystray.MenuItem(
                f"   Status: {'✅ Online' if frontend_healthy else ('⏳ Starting...' if frontend_running else '❌ Offline')}",
                lambda: None,
                enabled=False,
            ),
            pystray.MenuItem(f"   URL: {DASHBOARD_URL}", lambda: None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(f"{backend_icon} Backend (FastAPI :{BACKEND_PORT})", lambda: None, enabled=False),
            pystray.MenuItem(
                f"   Status: {'✅ Online' if backend_healthy else ('⏳ Starting...' if backend_running else '❌ Offline')}",
                lambda: None,
                enabled=False,
            ),
            pystray.MenuItem(f"   URL: {BACKEND_URL}", lambda: None, enabled=False),
        ])

    # --- Global Controls ---
    menu_items.extend([
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(
            f"⏱️  Uptime: {(datetime.now() - startup_time).total_seconds() / 60:.1f} min" if startup_time else "⏱️  Uptime: Not Started",
            lambda: None,
            enabled=False,
        ),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(
            "🌐 Open Dashboard",
            lambda icon, item: webbrowser.open(DASHBOARD_URL),
            enabled=backend_running if IS_PROD else (frontend_running or backend_running),
            default=True,
        ),
        pystray.MenuItem(
            "📜 Open API Docs",
            lambda icon, item: webbrowser.open(BACKEND_URL),
            enabled=backend_running,
        ),
        pystray.MenuItem(
            "📁 View Logs",
            open_logs_folder,
            enabled=True,
        ),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(
            "🔄 Restart Server" if IS_PROD else "🔄 Restart All",
            restart_all,
            enabled=backend_running or (not IS_PROD and is_running(frontend_proc)),
        ),
        pystray.MenuItem(
            "⏹️ Stop Server" if IS_PROD else "⏹️ Stop All",
            stop_all,
            enabled=backend_running or (not IS_PROD and is_running(frontend_proc)),
        ),
        pystray.MenuItem(
            "▶️ Start Server" if IS_PROD else "▶️ Start All",
            start_all,
            enabled=not backend_running,
        ),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(
            "❌ Exit Tray App",
            lambda icon, item: (stop_all(icon), icon.stop()),
        ),
    ])

    return tuple(menu_items)


def main():
    global tray_icon

    mode_str = "PRODUCTION (Built bundle)" if IS_PROD else "DEVELOPMENT (Vite Dev Server)"
    print("\n" + "=" * 60)
    print("🎯 MirAIe AC Controller - System Tray Application")
    print(f"Running in {mode_str} Mode")
    print("=" * 60)
    print(f"Dashboard URL: {DASHBOARD_URL}")
    print(f"API Docs URL:  {BACKEND_URL}")
    print(f"Logs Path:     {LOGS_DIR}")
    print("=" * 60 + "\n")

    icon = pystray.Icon(
        "MirAIeAC",
        create_tray_icon(),
        "Panasonic MirAIe AC Controller",
        menu=pystray.Menu(make_menu),
    )

    tray_icon = icon

    # Start services
    start_all(icon)

    # Initial tray notification
    icon.notify(
        f"Mode: {'Production' if IS_PROD else 'Development'} on port {DASHBOARD_URL.split(':')[-1]}",
        "🚀 MirAIe Controller Online",
    )

    icon.run()


if __name__ == "__main__":
    main()