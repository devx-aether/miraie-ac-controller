// ==========================================
// 1. Primitive Enums & Types (Matching Python Enums)
// ==========================================

export type PowerMode = 'on' | 'off';

export type DisplayMode = 'on' | 'off';

export type HVACMode = 'cool' | 'auto' | 'dry' | 'fan' | 'heat';

export type PresetMode = 'none' | 'eco' | 'boost' | 'clean';

export type FanMode = 'auto' | 'quiet' | 'low' | 'medium' | 'high';

// Integer Enums matching Python SwingMode (0 = Auto, 1-5 = Fixed Angles)
export type SwingMode = 0 | 1 | 2 | 3 | 4 | 5;

// Integer Enums matching Python ConvertiMode
export type ConvertiMode = 0 | 40 | 50 | 55 | 70 | 80 | 90 | 100 | 110;

export type ConsumptionPeriodType = 'Daily' | 'Weekly' | 'Monthly';

// ==========================================
// 2. Main AC Device State Model
// ==========================================

export interface ACDevice {
  id: string;
  name: string;
  friendly_name: string;
  online: boolean;
  temperature: number;          // 16 - 30
  room_temperature: number;     // Ambient temp sensor
  power: PowerMode;
  display_mode: DisplayMode;
  hvac_mode: HVACMode;
  fan_mode: FanMode;
  preset_mode: PresetMode;
  converti_mode: ConvertiMode;
  vertical_swing_mode: SwingMode;
  horizontal_swing_mode: SwingMode;
}

// ==========================================
// 3. API Request Payloads (Matching Pydantic Models)
// ==========================================

export interface TemperatureRequest {
  temperature: number; // ge=16, le=30
}

export interface PowerRequest {
  power: PowerMode;
}

export interface DisplayRequest {
  display_mode: DisplayMode;
}

export interface HVACModeRequest {
  hvac_mode: HVACMode;
}

export interface ConvertiRequest {
  converti_mode: ConvertiMode;
}

export interface FanModeRequest {
  fan_mode: FanMode;
}

export interface SwingModeRequest {
  swing_mode: SwingMode;
}

export interface PresetModeRequest {
  preset_mode: PresetMode;
}

export interface UnifiedStateRequest {
  power: PowerMode;
  temperature?: number;
  display_mode?: DisplayMode;
  hvac_mode?: HVACMode;
  fan_mode?: FanMode;
  vertical_swing_mode?: SwingMode;
  horizontal_swing_mode?: SwingMode;
  preset_mode?: PresetMode;
  converti_mode?: ConvertiMode;
}

export interface PowerConsumptionRequest {
  period_type: ConsumptionPeriodType;
  from_date?: string;
  to_date?: string;
}

export type MacroIconName = 
  | 'Moon' 
  | 'Zap' 
  | 'Wind' 
  | 'Flame' 
  | 'Snowflake' 
  | 'Sparkles' 
  | 'Leaf' 
  | 'ShieldCheck' 
  | 'Sun' 
  | 'Coffee' 
  | 'Heart' 
  | 'Tv';

export type MacroColorName = 
  | 'cyan' 
  | 'amber' 
  | 'indigo' 
  | 'emerald' 
  | 'rose' 
  | 'purple' 
  | 'teal';

export interface SmartMacroPreset {
  id: string;
  name: string;
  icon: MacroIconName;
  color: MacroColorName;
  power: PowerMode;
  temperature: number;
  hvac_mode: HVACMode;
  fan_mode: FanMode;
  preset_mode: PresetMode;
  converti_mode: ConvertiMode;
  display_mode: DisplayMode;
  vertical_swing_mode: SwingMode;
  horizontal_swing_mode: SwingMode;
}