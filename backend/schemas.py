from pydantic import BaseModel, Field
from miraie_ac.enums import (
    ConvertiMode,
    FanMode,
    HVACMode,
    PowerMode,
    PresetMode,
    SwingMode,
    DisplayMode,
    ConsumptionPeriodType,
)


class TemperatureRequest(BaseModel):
    temperature: int = Field(..., ge=16, le=30, description="Target temperature between 16 and 30 °C")


class PowerRequest(BaseModel):
    power: PowerMode


class DisplayRequest(BaseModel):
    display_mode: DisplayMode


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


class PowerConsumptionRequest(BaseModel):
    period_type: ConsumptionPeriodType
    from_date: str = Field(..., description="Date format DDMMYYYY, e.g. 12082026")
    to_date: str = Field(..., description="Date format DDMMYYYY, e.g. 13082026")


class UnifiedStateRequest(BaseModel):
    power: PowerMode
    temperature: int | None = Field(None, ge=16, le=30)
    display_mode: DisplayMode | None = None
    hvac_mode: HVACMode | None = None
    fan_mode: FanMode | None = None
    vertical_swing_mode: SwingMode | None = None
    horizontal_swing_mode: SwingMode | None = None
    preset_mode: PresetMode | None = None
    converti_mode: ConvertiMode | None = None

class AuthCredentialsRequest(BaseModel):
    mobile_number: str = Field(..., description="Phone number with country code, e.g. +91XXXXXXXXXX")
    password: str = Field(..., description="MirAIe Account Password")

class AuthStatusResponse(BaseModel):
    configured: bool
    mobile_number: str | None = None