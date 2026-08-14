# MirAIe AC Controller

### **NOTE**: This project was made using AI.
- The Panasonic MirAIe app does not have an official web client or desktop app to control your AC conveniently from your computer. This project provides a lightweight local web dashboard and Windows system tray controller.
- Runs locally on your machine with background management and zero terminal clutter.

---

## 🛠️ Tech Stack & Acknowledgments

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) & [Uvicorn](https://www.uvicorn.org/)
- **Auth & Communication:** Built using the [`miraie-ac`](https://github.com/rkzofficial/miraie-ac) library by **rkzofficial** to communicate with Panasonic's MirAIe IoT backend via MQTT/REST.
- **Frontend:** React + Tailwind CSS (bundled via Vite)
- **Desktop Integration:** [Pystray](https://github.com/moses-palmer/pystray) & Pillow for Windows system tray management.

---

## 🚀 First-Time Setup

1. **Download & Extract:** Download the latest `miraie-controller-windows.zip` from the **[Releases](../../releases)** tab and extract it to a folder of your choice (e.g., `Documents\miraie_controller`).
2. **Setup Python Environment:**
   Open PowerShell inside the extracted folder and run:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt
   cd ..
3. Double click the `run_miraie_controller.vbs`. The app will start in the background, a snow flake icon will appear in your system tray.

---

### 🖥️ Instructions for Making the App Run on Startup

To have the controller start automatically every time you log into Windows:

1. Press Windows Key + R to open the Run dialog.
2. Type shell:startup and press Enter (this opens your user Startup folder).
3. Right-click inside the Startup folder $\rightarrow$ Select New $\rightarrow$ Shortcut.
4. Click Browse... and select your run_miraie_controller.vbs file (or paste its full path).
5. Click Next, name the shortcut MirAIe AC Controller, and click Finish.

---

### ❄️ System Tray Features

Right-click the snowflake icon in your taskbar tray to access:

- 🌐 Open Dashboard: Opens the interactive web UI (http://localhost:8000).
- 📜 Open API Docs: Opens the FastAPI Swagger documentation.
- 📁 View Logs: Opens the logs/ directory in File Explorer for easy troubleshooting.
- 🟢/🔴 Live Status: Real-time health status for both the API and UI.
- 🔄 Restart / ⏹️ Stop: Manage background server processes without opening Task Manager.
- ❌ Exit: Gracefully shuts down all background processes and exits.