import os
import sys
import subprocess
import threading
import webbrowser
import time
import requests
from datetime import datetime
import pystray
from PIL import Image, ImageDraw

PORT = 8000
APP_URL = f"http://localhost:{PORT}"
DOCS_URL = f"http://localhost:{PORT}/docs"
HEALTH_URL = f"http://localhost:{PORT}/api/auth/status"

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")
VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
PYTHON_EXE = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

server_proc: subprocess.Popen | None = None
startup_time: datetime | None = None
monitor_stop = False
manual_stop_requested = False


# -------------------------------------------------------------
# Process & Health Helpers
# -------------------------------------------------------------
def is_proc_alive() -> bool:
    """Checks if the subprocess is physically running."""
    return server_proc is not None and server_proc.poll() is None


def is_server_healthy() -> bool:
    """Checks if FastAPI is actively responding to HTTP traffic."""
    if not is_proc_alive():
        return False
    try:
        # Fast timeout to keep the tray menu snappy
        response = requests.get(HEALTH_URL, timeout=1.0)
        return response.status_code < 500
    except Exception:
        # Fallback probe to /docs if /api/auth/status is uninitialized
        try:
            r = requests.get(DOCS_URL, timeout=0.8)
            return r.status_code < 500
        except Exception:
            return False


def start_server(icon=None, item=None):
    global server_proc, startup_time, manual_stop_requested
    manual_stop_requested = False
    if not is_proc_alive():
        cmd = [PYTHON_EXE, "main.py"]
        flags = 0x08000000 if sys.platform == "win32" else 0
        
        # Ensure child process inherits utf-8 flags
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        server_proc = subprocess.Popen(
            cmd,
            cwd=BACKEND_DIR,
            creationflags=flags,
            env=env
        )
        startup_time = datetime.now()
        if icon:
            icon.notify("Starting server...", "MirAIe Controller")


def stop_server(icon=None, item=None):
    global server_proc, startup_time, manual_stop_requested
    manual_stop_requested = True
    if server_proc is not None:
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(server_proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass
        server_proc = None
        startup_time = None
        if icon:
            icon.notify("Server stopped", "MirAIe Controller")


def restart_server(icon=None, item=None):
    stop_server(icon)
    time.sleep(1)
    start_server(icon)
    if icon:
        icon.notify("Server restarted", "MirAIe Controller")


def monitor_server():
    """Restart the child only when it dies or stops answering HTTP requests."""
    global monitor_stop
    failed_checks = 0

    while not monitor_stop:
        time.sleep(10)
        if monitor_stop:
            break

        if not is_proc_alive() and not manual_stop_requested:
            start_server()
            failed_checks = 0
            continue

        if is_server_healthy():
            failed_checks = 0
            continue

        if startup_time and (datetime.now() - startup_time).total_seconds() < 30:
            continue

        failed_checks += 1
        if failed_checks >= 3:
            restart_server()
            failed_checks = 0


# -------------------------------------------------------------
# Tray Menu & Icon
# -------------------------------------------------------------
def create_icon():
    """Draws a clean Cyan ring icon for the tray."""
    size = 64
    img = Image.new("RGBA", (size, size), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)
    draw.ellipse((8, 8, size - 8, size - 8), outline=(6, 182, 212, 255), width=4)
    draw.ellipse((24, 24, size - 24, size - 24), fill=(6, 182, 212, 255))
    return img

def load_icon():
    icon_path = os.path.join(PROJECT_DIR, "./assets/favicon.png") # or icon.ico
    if os.path.exists(icon_path):
        return Image.open(icon_path).convert("RGBA")

    # Fallback to the programmatic drawing if file is missing
    return create_icon()

def make_menu():
    """Generates the live tray menu items with real-time status."""
    proc_alive = is_proc_alive()
    healthy = is_server_healthy()

    # Determine visual badge & message
    if healthy:
        status_icon = "🟢"
        status_text = "Online (Ready)"
    elif proc_alive:
        status_icon = "🟡"
        status_text = "Starting up..."
    else:
        status_icon = "🔴"
        status_text = "Offline"

    # Format uptime
    if startup_time and proc_alive:
        mins = (datetime.now() - startup_time).total_seconds() / 60
        uptime_text = f"⏱️ Uptime: {mins:.1f} min"
    else:
        uptime_text = "⏱️ Uptime: Stopped"

    return (
        pystray.MenuItem("╔══ Panasonic MirAIe Controller ══╗", lambda: None, enabled=False),
        pystray.MenuItem(f"{status_icon} Status: {status_text}", lambda: None, enabled=False),
        pystray.MenuItem(f"📍 Address: http://localhost:{PORT}", lambda: None, enabled=False),
        pystray.MenuItem(uptime_text, lambda: None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("🌐 Open Dashboard", lambda icon, item: webbrowser.open(APP_URL), default=True),
        pystray.MenuItem("📜 API Docs (/docs)", lambda icon, item: webbrowser.open(DOCS_URL)),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("🔄 Restart Server", restart_server, enabled=proc_alive),
        pystray.MenuItem("⏹️ Stop Server", stop_server, enabled=proc_alive),
        pystray.MenuItem("▶️ Start Server", start_server, enabled=not proc_alive),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("❌ Exit", lambda icon, item: (stop_server(icon), icon.stop())),
    )


def main():
    global monitor_stop
    start_server()
    monitor_stop = False
    monitor_thread = threading.Thread(target=monitor_server, daemon=True)
    monitor_thread.start()

    # Passing make_menu (the function itself) ensures pystray calls it
    # every time you right-click, rendering real-time status and uptime.
    icon = pystray.Icon("MirAIeAC", load_icon(), "MirAIe Controller", menu=pystray.Menu(make_menu))
    try:
        icon.run()
    finally:
        monitor_stop = True
        stop_server()


if __name__ == "__main__":
    main()