import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from miraie_ac import MirAIeBroker, MirAIeHub
from miraie_ac.enums import (
    ConsumptionPeriodType,
    ConvertiMode,
    DisplayMode,
    FanMode,
    HVACMode,
    PowerMode,
    PresetMode,
    SwingMode,
)
from schemas import (
    AuthCredentialsRequest,
    ConvertiRequest,
    DisplayRequest,
    FanModeRequest,
    HVACModeRequest,
    PowerConsumptionRequest,
    PowerRequest,
    PresetModeRequest,
    SwingModeRequest,
    TemperatureRequest,
    UnifiedStateRequest,
)

# ---------------------------------------------------------------------------
# Explicitly inject ConvertiMode 50% only
# ---------------------------------------------------------------------------
if 50 not in ConvertiMode._value2member_map_:
    c50_member = object.__new__(ConvertiMode)
    c50_member._name_ = "C50"
    c50_member._value_ = 50
    ConvertiMode._value2member_map_[50] = c50_member
    ConvertiMode._member_map_["C50"] = c50_member

CONFIG_FILE = "credentials.json"

broker: MirAIeBroker | None = None
hub: MirAIeHub | None = None


def load_credentials():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return None


def save_credentials(mobile: str, pwd: str):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"mobile_number": mobile, "password": pwd}, f, indent=2)


async def init_miraie(mobile: str, pwd: str):
    global hub, broker
    if hub and getattr(hub, "http", None):
        try:
            await hub.http.close()
        except Exception:
            pass

    broker = MirAIeBroker()
    hub = MirAIeHub()
    await hub.init(mobile, pwd, broker)

    # Safely wait for the MQTT broker client to attach without crashing
    for _ in range(15):
        if getattr(broker, "client", None) is not None:
            break
        await asyncio.sleep(1)


def extract_val(attr, default=None):
    if attr is None:
        return default
    return attr.value if hasattr(attr, "value") else attr


def format_device(device):
    st = getattr(device, "status", None)
    dev_name = getattr(device, "friendly_name", None) or getattr(device, "name", "AC Unit")

    # Determine online status safely
    is_online = getattr(device, "is_online", getattr(device, "is_connected", True))
    if st and hasattr(st, "is_online"):
        is_online = bool(st.is_online)
    elif st and hasattr(st, "is_connected"):
        is_online = bool(st.is_connected)

    return {
        "id": str(getattr(device, "id", "unknown")),
        "name": dev_name,
        "friendly_name": dev_name,
        "online": bool(is_online),
        "temperature": int(st.temperature) if (st and getattr(st, "temperature", None) is not None) else 24,
        "room_temperature": int(st.room_temperature) if (st and getattr(st, "room_temperature", None) is not None) else 26,
        "power": str(extract_val(st.power_mode if st else PowerMode.OFF, "off")).lower(),
        "display_mode": str(extract_val(st.display_mode if st else DisplayMode.OFF, "off")).lower(),
        "hvac_mode": str(extract_val(st.hvac_mode if st else HVACMode.COOL, "cool")).lower(),
        "fan_mode": str(extract_val(st.fan_mode if st else FanMode.AUTO, "auto")).lower(),
        "preset_mode": str(extract_val(st.preset_mode if st else PresetMode.NONE, "none")).lower(),
        "converti_mode": int(extract_val(st.converti_mode if st else ConvertiMode.OFF, 0)),
        "vertical_swing_mode": int(extract_val(getattr(st, "vertical_swing_mode", getattr(st, "v_swing_mode", 0)), 0)),
        "horizontal_swing_mode": int(extract_val(getattr(st, "horizontal_swing_mode", getattr(st, "h_swing_mode", 0)), 0)),
    }


def get_device(device_id: str):
    global hub
    if not hub or not hub.home or not hub.home.devices:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MirAIe Hub is not initialized. Setup credentials.",
        )

    for dev in hub.home.devices:
        if str(getattr(dev, "id", "")) == device_id or str(getattr(dev, "friendly_name", "")) == device_id:
            return dev

    if len(hub.home.devices) > 0:
        return hub.home.devices[0]

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Device {device_id} not found")


@asynccontextmanager
async def lifespan(app: FastAPI):
    creds = load_credentials()
    if creds:
        print(f"🔄 Auto-authenticating with {creds.get('mobile_number')}...")
        try:
            await init_miraie(creds["mobile_number"], creds["password"])
            print("✅ MirAIe Hub Initialized successfully!")
        except Exception as e:
            print(f"❌ Failed to initialize MirAIe Hub: {e}")
    else:
        print("⚠️ No credentials found. Waiting for frontend setup.")

    yield

    if hub and getattr(hub, "http", None):
        await hub.http.close()


app = FastAPI(title="MirAIe AC API Controller", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth / Setup Routes ---

@app.get("/api/auth/status")
async def get_auth_status():
    creds = load_credentials()
    is_ready = bool(hub and hub.home and hub.home.devices)
    return {
        "configured": bool(creds),
        "connected": is_ready,
        "mobile_number": creds.get("mobile_number") if creds else None,
    }


@app.post("/api/auth/setup")
async def setup_credentials(req: AuthCredentialsRequest):
    try:
        await init_miraie(req.mobile_number, req.password)
        save_credentials(req.mobile_number, req.password)
        return {"status": "success", "message": "MirAIe Hub Connected!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")


# --- Device & Energy Routes ---

@app.get("/api/devices")
async def list_devices():
    if not hub or not hub.home or not hub.home.devices:
        return []
    return [format_device(dev) for dev in hub.home.devices]


@app.post("/api/devices/{device_id}/energy")
async def get_energy_consumption(device_id: str, req: PowerConsumptionRequest):
    dev = get_device(device_id)
    try:
        period_map = {
            "Daily": ConsumptionPeriodType.DAILY,
            "Weekly": ConsumptionPeriodType.WEEKLY,
            "Monthly": ConsumptionPeriodType.MONTHLY,
            "DAILY": ConsumptionPeriodType.DAILY,
            "WEEKLY": ConsumptionPeriodType.WEEKLY,
            "MONTHLY": ConsumptionPeriodType.MONTHLY,
        }

        raw_period = req.period_type
        if isinstance(raw_period, ConsumptionPeriodType):
            period_enum = raw_period
        elif isinstance(raw_period, str):
            period_enum = period_map.get(raw_period, ConsumptionPeriodType.DAILY)
        else:
            period_enum = ConsumptionPeriodType.DAILY

        if isinstance(req.period_type, str) and req.period_type not in period_map:
            period_enum = period_map.get(str(req.period_type).split(".")[-1], ConsumptionPeriodType.DAILY)

        print(f"\n⚡ [ENERGY QUERY]: {period_enum} from '{req.from_date}' to '{req.to_date}'")
        result_dict = await hub.get_energy_consumption(
            dev,
            period_enum,
            req.from_date,
            req.to_date
        )
        print(f"📊 [ENERGY RETURNED]: {result_dict}\n")

        return {"status": "success", "data": result_dict or {}}
    except Exception as e:
        print(f"❌ [ENERGY ERROR]: {e}")
        return {"status": "error", "message": str(e), "data": {}}


@app.post("/api/devices/{device_id}/temperature")
async def set_temperature(device_id: str, req: TemperatureRequest):
    dev = get_device(device_id)
    await dev.set_temperature(req.temperature)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/state")
async def set_unified_state(device_id: str, req: UnifiedStateRequest):
    dev = get_device(device_id)
    print(f"\n⚡ Executing Preset Macro for {dev.friendly_name}: {req.model_dump(exclude_unset=True)}")

    async def safe_exec(name: str, coro):
        try:
            await coro
            await asyncio.sleep(0.15)
        except Exception as err:
            print(f"⚠️ Warning on macro step '{name}': {err}")

    # 1. Power State First
    if req.power is not None:
        if str(req.power).lower() in ("on", "powermode.on"):
            await safe_exec("turn_on", dev.turn_on())
        else:
            await safe_exec("turn_off", dev.turn_off())
            return {"status": "success", "device": format_device(dev)}

    # 2. HVAC Mode
    if req.hvac_mode is not None:
        await safe_exec("set_hvac_mode", dev.set_hvac_mode(req.hvac_mode))

    # 3. Target Temperature
    if req.temperature is not None:
        await safe_exec("set_temperature", dev.set_temperature(req.temperature))

    # 4. Preset Mode
    if req.preset_mode is not None:
        await safe_exec("set_preset_mode", dev.set_preset_mode(req.preset_mode))

    # 5. Fan Speed (Only if preset is NONE)
    preset_val = str(extract_val(req.preset_mode, "none")).lower()
    if req.fan_mode is not None and preset_val in ("none", "presetmode.none", ""):
        await safe_exec("set_fan_mode", dev.set_fan_mode(req.fan_mode))

    # 6. Converti Mode
    hvac_val = str(extract_val(req.hvac_mode, "cool")).lower()
    if req.converti_mode is not None and "cool" in hvac_val and preset_val in ("none", "presetmode.none", ""):
        await safe_exec("set_converti_mode", dev.set_converti_mode(req.converti_mode))

    # 7. Swings
    if req.vertical_swing_mode is not None:
        v_swing_coro = dev.set_vertical_swing_mode(req.vertical_swing_mode) if hasattr(dev, "set_vertical_swing_mode") else dev.set_v_swing_mode(req.vertical_swing_mode)
        await safe_exec("set_vertical_swing", v_swing_coro)

    if req.horizontal_swing_mode is not None:
        h_swing_coro = dev.set_horizontal_swing_mode(req.horizontal_swing_mode) if hasattr(dev, "set_horizontal_swing_mode") else dev.set_h_swing_mode(req.horizontal_swing_mode)
        await safe_exec("set_horizontal_swing", h_swing_coro)

    # 8. LED Display
    if req.display_mode is not None:
        disp_val = str(req.display_mode).lower()
        if "on" in disp_val:
            await safe_exec("display_on", dev.turn_display_light_on() if hasattr(dev, "turn_display_light_on") else dev.set_display_mode(DisplayMode.ON))
        else:
            await safe_exec("display_off", dev.turn_display_light_off() if hasattr(dev, "turn_display_light_off") else dev.set_display_mode(DisplayMode.OFF))

    print(f"✅ Macro execution complete for {dev.friendly_name}\n")
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/power")
async def set_power(device_id: str, req: PowerRequest):
    dev = get_device(device_id)
    if req.power == PowerMode.ON or req.power == "on":
        await dev.turn_on()
    else:
        await dev.turn_off()
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/display")
async def set_display(device_id: str, req: DisplayRequest):
    dev = get_device(device_id)
    await dev.set_display_mode(req.display_mode)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/hvac-mode")
async def set_hvac_mode(device_id: str, req: HVACModeRequest):
    dev = get_device(device_id)
    await dev.set_hvac_mode(req.hvac_mode)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/fan-mode")
async def set_fan_mode(device_id: str, req: FanModeRequest):
    dev = get_device(device_id)
    await dev.set_fan_mode(req.fan_mode)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/preset-mode")
async def set_preset_mode(device_id: str, req: PresetModeRequest):
    dev = get_device(device_id)
    await dev.set_preset_mode(req.preset_mode)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/converti-mode")
async def set_converti_mode(device_id: str, req: ConvertiRequest):
    dev = get_device(device_id)
    await dev.set_converti_mode(req.converti_mode)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/vertical-swing")
async def set_vertical_swing(device_id: str, req: SwingModeRequest):
    dev = get_device(device_id)
    if hasattr(dev, "set_vertical_swing_mode"):
        await dev.set_vertical_swing_mode(req.swing_mode)
    else:
        await dev.set_v_swing_mode(req.swing_mode)
    return {"status": "success", "device": format_device(dev)}


@app.post("/api/devices/{device_id}/horizontal-swing")
async def set_horizontal_swing(device_id: str, req: SwingModeRequest):
    dev = get_device(device_id)
    if hasattr(dev, "set_horizontal_swing_mode"):
        await dev.set_horizontal_swing_mode(req.swing_mode)
    else:
        await dev.set_h_swing_mode(req.swing_mode)
    return {"status": "success", "device": format_device(dev)}


# =============================================================
# Mount & Serve React Static Build (Production SPA Mode)
# =============================================================
BASE_FRONTEND = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
DIST_PATH = None

if os.path.exists(os.path.join(BASE_FRONTEND, "dist", "index.html")):
    DIST_PATH = os.path.join(BASE_FRONTEND, "dist")
elif os.path.exists(os.path.join(BASE_FRONTEND, "index.html")):
    DIST_PATH = BASE_FRONTEND

if DIST_PATH and os.path.exists(DIST_PATH):
    assets_dir = os.path.join(DIST_PATH, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/"):
            return FileResponse(status_code=404)

        requested_file = os.path.join(DIST_PATH, full_path)
        if os.path.exists(requested_file) and os.path.isfile(requested_file):
            return FileResponse(requested_file)

        index_file = os.path.join(DIST_PATH, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)

        return {"status": "error", "message": "index.html not found"}


if __name__ == "__main__":
    import uvicorn

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    loop_type = "asyncio" if sys.platform == "win32" else "auto"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        loop=loop_type,
    )