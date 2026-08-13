import asyncio
import os
import sys
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from miraie_ac import MirAIeBroker, MirAIeHub, SwingMode
from miraie_ac.enums import ConvertiMode, FanMode, HVACMode, PowerMode
from schemas import (
    ConvertiRequest,
    FanModeRequest,
    HVACModeRequest,
    PowerRequest,
    PresetModeRequest,
    SwingModeRequest,
    TemperatureRequest,
    UnifiedStateRequest,
    # PowerConsumptionRequest,
)

load_dotenv()

MOBILE_NUMBER = os.getenv("MOBILE_NUMBER")
PASSWORD = os.getenv("PASSWORD")

# Global instances
hub: MirAIeHub | None = None
broker: MirAIeBroker | None = None


async def wait_for_broker_connection(broker_instance: MirAIeBroker, timeout: int = 15):
    """Waits until the MQTT client in broker is fully initialized."""
    start_time = asyncio.get_event_loop().time()
    while not hasattr(broker_instance, "client") or broker_instance.client is None:
        if asyncio.get_event_loop().time() - start_time > timeout:
            raise TimeoutError("Timed out waiting for broker client connection.")
        await asyncio.sleep(0.5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the MirAIe connection once on server boot."""
    global hub, broker
    print("[MirAIe] Initializing connection to MirAIe service...")
    
    broker = MirAIeBroker()
    hub = MirAIeHub()

    try:
        await hub.init(MOBILE_NUMBER, PASSWORD, broker)
        await wait_for_broker_connection(broker)
        print(f"[MirAIe] Connected! Discovered {len(hub.home.devices)} device(s).")
    except Exception as e:
        print(f"[MirAIe] Startup connection error: {e}")

    yield

    print("[MirAIe] Shutting down background service...")


app = FastAPI(title="MirAIe AC REST API", lifespan=lifespan)

# CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---

def get_device(device_id: str, check_online: bool = True):
    if not hub or not hub.home or not hub.home.devices:
        raise HTTPException(status_code=503, detail="MirAIe service not initialized or no devices found.")

    for device in hub.home.devices:
        if device.id == device_id:
            if check_online and not device.status.is_online:
                raise HTTPException(status_code=503, detail=f"{device.friendly_name} is currently offline")

            return device

    raise HTTPException(status_code=404, detail=f"Device id {device_id} not found.") 

def serialize_device(device):
    """Formats raw MirAIe device data into clean JSON for the frontend."""
    return {
        "id": device.id,
        "name": device.name,
        "friendly_name": device.friendly_name,
        "online": device.status.is_online,
        "temperature": device.status.temperature,
        "room_temperature": device.status.room_temperature,
        "power": device.status.power_mode,
        "fan_mode": device.status.fan_mode,
        "vertical_swing_mode": device.status.v_swing_mode,
        "horizontal_swing_mode": device.status.h_swing_mode,
        "display_mode": device.status.display_mode,
        "hvac_mode": device.status.hvac_mode,
        "preset_mode": device.status.preset_mode,
        "converti_mode": device.status.converti_mode,
    }


# --- API Routes ---

@app.get("/api/health")
async def health_check():
    connected = broker is not None and getattr(broker, "client", None) is not None
    return {"status": "ok", "broker_connected": connected}


@app.get("/api/devices")
async def list_devices():
    if not hub or not hub.home:
        raise HTTPException(status_code=503, detail="MirAIe hub not ready")
    return [serialize_device(dev) for dev in hub.home.devices]


@app.get("/api/devices/{device_id}")
async def get_device_status(device_id: str):
    device = get_device(device_id, check_online=False)
    return serialize_device(device)

# @app.get("/api/devices/{device_id}/power-consumption")
# async def get_power_consumption_info(device_id: str, req: PowerConsumptionRequest):
#     ...

@app.post("/api/devices/{device_id}/power")
async def set_power(device_id: str, req: PowerRequest):
    device = get_device(device_id)

    if req.power == PowerMode.ON:
        await device.turn_on()
    elif req.power == PowerMode.OFF:
        await device.turn_off()
    else:
        raise HTTPException(status_code=400, detail=f"Invalid power mode: {req.power}")

    return {"status": "success", "power": req.power}


@app.post("/api/devices/{device_id}/temperature")
async def set_temperature(device_id: str, req: TemperatureRequest):
    device = get_device(device_id)
    await device.set_temperature(req.temperature)
    return {"status": "success", "temperature": req.temperature}

@app.post("/api/devices/{device_id}/hvac-mode")
async def set_hvac_mode(device_id: str, req: HVACModeRequest):
    device = get_device(device_id)
    await device.set_hvac_mode(req.hvac_mode)
    return {"status": "success", "hvac_mode": req.hvac_mode}

@app.post("/api/devices/{device_id}/preset-mode")
async def set_preset_mode(device_id: str, req: PresetModeRequest):
    device = get_device(device_id)
    await device.set_preset_mode(req.preset_mode)
    return {"status": "success", "preset_mode": req.preset_mode}

@app.post("/api/devices/{device_id}/fan-mode")
async def set_fan_mode(device_id: str, req: FanModeRequest):
    device = get_device(device_id)
    await device.set_fan_mode(req.fan_mode)
    return {"status": "success", "fan_mode": req.fan_mode}

@app.post("/api/devices/{device_id}/v-swing-mode")
async def set_v_swing_mode(device_id: str, req: SwingModeRequest):
    device = get_device(device_id)
    await device.set_v_swing_mode(req.swing_mode)
    return {"status": "success", "v_swing_mode": req.swing_mode}

@app.post("/api/devices/{device_id}/h-swing-mode")
async def set_h_swing_mode(device_id: str, req: SwingModeRequest):
    device = get_device(device_id)
    await device.set_h_swing_mode(req.swing_mode)
    return {"status": "success", "h_swing_mode": req.swing_mode}

@app.post("/api/devices/{device_id}/converti")
async def set_converti(device_id: str, req: ConvertiRequest):
    device = get_device(device_id)
    try:
        await device.set_converti_mode(req.converti_mode)
        return {"status": "success", "converti_mode": req.converti_mode}
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid converti mode: {req.converti_mode}")


@app.post("/api/devices/{device_id}/state")
async def update_state(device_id: str, req: UnifiedStateRequest):
    """Unified endpoint to apply multiple settings in one payload."""
    device = get_device(device_id)
    
    if req.power is not None:
        if req.power == PowerMode.ON:
            await device.turn_on()
        elif req.power == PowerMode.OFF:
            await device.turn_off()

    if req.temperature is not None:
        await device.set_temperature(req.temperature)

    if req.converti_mode is not None:
        await device.set_converti_mode(req.converti_mode)

    if req.fan_mode is not None:
        await device.set_fan_mode(req.fan_mode)  

    if req.preset_mode is not None:
        await device.set_preset_mode(req.preset_mode) 

    if req.hvac_mode is not None:
        await device.set_hvac_mode(req.hvac_mode)

    if req.horizontal_swing_mode is not None:
        await device.set_h_swing_mode(req.horizontal_swing_mode)

    if req.vertical_swing_mode is not None:
        await device.set_v_swing_mode(req.vertical_swing_mode)

    return {"status": "success", "updated_device": serialize_device(device)}


if __name__ == "__main__":
    import uvicorn
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)