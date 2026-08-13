# --- Pydantic Data Models ---

from miraie_ac.enums import (
    ConvertiMode,
    FanMode,
    HVACMode,
    PowerMode,
    PresetMode,
    SwingMode,
    ConsumptionPeriodType
)
from pydantic import BaseModel, Field

# class PowerConsumptionReqest(BaseModel):
#     period_type: ConsumptionPeriodType
#     from_date: 
#     to_date:

class TemperatureRequest(BaseModel):
    temperature: int = Field(..., ge=16, le=30, description="Target temperature between 16 and 30 °C")

class PowerRequest(BaseModel):
    power: PowerMode

class HVACModeRequest(BaseModel):
    hvac_mode: HVACMode

class ConvertiRequest(BaseModel):
    converti_mode: ConvertiMode

class FanModeRequest(BaseModel):
    fan_mode: FanMode

class SwingModeRequest(BaseModel):
    swing_mode: SwingMode

class PresetModeRequest(BaseModel):
    preset_mode: PresetMode

class UnifiedStateRequest(BaseModel):
    power: PowerMode
    temperature: int | None = Field(None, ge=16, le=30)
    hvac_mode: HVACMode | None = None
    fan_mode: FanMode | None = None
    vertical_swing_mode: SwingMode | None = None
    horizontal_swing_mode: SwingMode | None = None
    preset_mode: PresetMode | None = None
    converti_mode: ConvertiMode | None = None