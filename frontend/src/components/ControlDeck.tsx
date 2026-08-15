import React, { memo } from 'react';
import { 
  Sun, 
  Wind, 
  Droplets, 
  Flame, 
  Zap, 
  Sparkles, 
  Leaf, 
  Eye, 
  EyeOff, 
  Layers, 
  ArrowUpDown, 
  ArrowLeftRight 
} from 'lucide-react';
import { RollingNumber } from './RollingNumber';

import type { 
  ACDevice, 
  DisplayMode, 
  HVACMode, 
  FanMode, 
  PresetMode, 
  ConvertiMode, 
  SwingMode 
} from '../types';

interface ControlDeckProps {
  device: ACDevice;
  onDisplayChange: (display: DisplayMode) => void;
  onHVACChange: (mode: HVACMode) => void;
  onFanChange: (fan: FanMode) => void;
  onPresetChange: (preset: PresetMode) => void;
  onConvertiChange: (converti: ConvertiMode) => void;
  onVerticalSwingChange: (swing: SwingMode) => void;
  onHorizontalSwingChange: (swing: SwingMode) => void;
}

const HVAC_MODES: { value: HVACMode; label: string; icon: React.ElementType }[] = [
  { value: 'cool', label: 'Cool', icon: Sun },
  { value: 'auto', label: 'Auto', icon: Sparkles },
  { value: 'dry', label: 'Dry', icon: Droplets },
  { value: 'fan', label: 'Fan', icon: Wind },
  { value: 'heat', label: 'Heat', icon: Flame },
];

const FAN_SPEEDS: { value: FanMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'quiet', label: 'Quiet' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
];

const PRESETS: { value: PresetMode; label: string; icon: React.ElementType }[] = [
  { value: 'none', label: 'None', icon: Layers },
  { value: 'eco', label: 'Eco', icon: Leaf },
  { value: 'boost', label: 'Boost', icon: Zap },
  { value: 'clean', label: 'Clean', icon: Sparkles },
];

const CONVERTI_OPTIONS: { value: ConvertiMode; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 40, label: '40%' },
  { value: 50, label: '50%' },
  { value: 55, label: '55%' },
  { value: 70, label: '70%' },
  { value: 80, label: '80%' },
  { value: 90, label: '90%' },
  { value: 100, label: 'FC' },
  { value: 110, label: 'HC' },
];

const SWING_POSITIONS: { value: SwingMode; label: string }[] = [
  { value: 0, label: 'Auto' },
  { value: 1, label: 'Pos 1' },
  { value: 2, label: 'Pos 2' },
  { value: 3, label: 'Pos 3' },
  { value: 4, label: 'Pos 4' },
  { value: 5, label: 'Pos 5' },
];

// ============================================================================
// Official Panasonic MirAIe Swing Icons (SVG Replicas)
// ============================================================================

const MirAIeVerticalSwingIcon: React.FC<{ level: number; className?: string }> = ({ level, className = "w-6 h-6" }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* MirAIe AC Indoor Unit Quarter Profile */}
      <path 
        d="M13 5H18C18.55 5 19 5.45 19 6V11C19 11.55 18.55 12 18 12C15.24 12 13 9.76 13 7V5Z" 
        fill="currentColor" 
      />

      {/* Pos 1: Horizontal line pointing left */}
      {level === 1 && (
        <line x1="11" y1="5.5" x2="6" y2="5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Pos 2: Angled high-left */}
      {level === 2 && (
        <line x1="11" y1="8" x2="6.5" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Pos 3: Angled middle 45-deg */}
      {level === 3 && (
        <line x1="12" y1="11" x2="7.5" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Pos 4: Angled steep down */}
      {level === 4 && (
        <line x1="14" y1="13" x2="11" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Pos 5: Straight down vertical */}
      {level === 5 && (
        <line x1="17.5" y1="13.5" x2="17.5" y2="18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
};

const MirAIeHorizontalSwingIcon: React.FC<{ level: number; className?: string }> = ({ level, className = "w-6 h-6" }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* MirAIe AC Indoor Unit Top Header Pill */}
      <rect x="5" y="5" width="14" height="4.5" rx="2" fill="currentColor" />

      {/* Pos 1: Dual parallel straight vertical lines (| |) */}
      {level === 1 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9.5" y1="11.5" x2="9.5" y2="16.5" />
          <line x1="14.5" y1="11.5" x2="14.5" y2="16.5" />
        </g>
      )}

      {/* Pos 2: Dual parallel lines tilted left (/ /) */}
      {level === 2 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9.5" y1="11.5" x2="7.5" y2="16.5" />
          <line x1="14.5" y1="11.5" x2="12.5" y2="16.5" />
        </g>
      )}

      {/* Pos 3: Left line tilted left (/), Right line straight down (|) */}
      {level === 3 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9.5" y1="11.5" x2="7.5" y2="16.5" />
          <line x1="14.5" y1="11.5" x2="14.5" y2="16.5" />
        </g>
      )}

      {/* Pos 4: Left line straight down (|), Right line tilted right (\) */}
      {level === 4 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9.5" y1="11.5" x2="9.5" y2="16.5" />
          <line x1="14.5" y1="11.5" x2="16.5" y2="16.5" />
        </g>
      )}

      {/* Pos 5: Dual parallel lines tilted right (\ \) */}
      {level === 5 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="9.5" y1="11.5" x2="11.5" y2="16.5" />
          <line x1="14.5" y1="11.5" x2="16.5" y2="16.5" />
        </g>
      )}
    </svg>
  );
};


// ============================================================================
// Main ControlDeck Component
// ============================================================================

export const ControlDeck: React.FC<ControlDeckProps> = memo(({
  device,
  onDisplayChange,
  onHVACChange,
  onFanChange,
  onPresetChange,
  onConvertiChange,
  onVerticalSwingChange,
  onHorizontalSwingChange,
}) => {
  const isPowerOn = device.power === 'on';
  const isDisplayOn = device.display_mode === 'on';

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-md transition-opacity duration-200 ${
        !isPowerOn ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      {/* 1. HVAC Operating Modes */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Mode
        </span>
        <div className="grid grid-cols-5 gap-2">
          {HVAC_MODES.map(({ value, label, icon: Icon }) => {
            const isSelected = device.hvac_mode === value;
            return (
              <button
                key={value}
                onClick={() => onHVACChange(value)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Fan Speeds */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Fan Speed
        </span>
        <div className="grid grid-cols-5 gap-2">
          {FAN_SPEEDS.map(({ value, label }) => {
            const isSelected = device.fan_mode === value;
            return (
              <button
                key={value}
                onClick={() => onFanChange(value)}
                className={`py-2 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Converti 7-in-1 Modes */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Converti 7-in-1 Mode
          </span>
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {device.converti_mode === 0 ? (
              'Off'
            ) : (
              <span className="inline-flex items-center">
                <RollingNumber value={device.converti_mode} heightEm={1.1} />
                <span>%</span>
              </span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
          {CONVERTI_OPTIONS.map(({ value, label }) => {
            const isSelected = Number(device.converti_mode) === value;
            return (
              <button
                key={value}
                onClick={() => onConvertiChange(value)}
                className={`py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Special Modes & LED Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Preset Modes */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Presets
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map(({ value, label, icon: Icon }) => {
              const isSelected = device.preset_mode === value;
              return (
                <button
                  key={value}
                  onClick={() => onPresetChange(value)}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LED Toggle */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            AC Unit LED
          </span>
          <button
            onClick={() => onDisplayChange(isDisplayOn ? 'off' : 'on')}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
              isDisplayOn
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            {isDisplayOn ? (
              <>
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>LED ON</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-slate-500" />
                <span>LED OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Swings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
        {/* Vertical Swing */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Vertical Swing</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {SWING_POSITIONS.map(({ value, label }) => {
              const isSelected = Number(device.vertical_swing_mode) === value;
              return (
                <button
                  key={value}
                  title={`Vertical: ${label}`}
                  onClick={() => onVerticalSwingChange(value)}
                  className={`h-9 rounded-lg border flex items-center justify-center transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {value === 0 ? (
                    <span className="text-[11px] font-bold tracking-wider">AUTO</span>
                  ) : (
                    <MirAIeVerticalSwingIcon level={value} className="w-6 h-6" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal Swing */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Horizontal Swing</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {SWING_POSITIONS.map(({ value, label }) => {
              const isSelected = Number(device.horizontal_swing_mode) === value;
              return (
                <button
                  key={value}
                  title={`Horizontal: ${label}`}
                  onClick={() => onHorizontalSwingChange(value)}
                  className={`h-9 rounded-lg border flex items-center justify-center transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {value === 0 ? (
                    <span className="text-[11px] font-bold tracking-wider">AUTO</span>
                  ) : (
                    <MirAIeHorizontalSwingIcon level={value} className="w-6 h-6" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});