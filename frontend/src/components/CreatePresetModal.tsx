import React, { useState, useCallback, memo } from 'react';
import {
  X,
  Plus,
  Moon,
  Zap,
  Wind,
  Flame,
  Snowflake,
  Sparkles,
  Leaf,
  ShieldCheck,
  Sun,
  Coffee,
  Heart,
  Tv,
  Eye,
  EyeOff,
  Sliders,
} from 'lucide-react';

import type {
  SmartMacroPreset,
  MacroIconName,
  MacroColorName,
  PowerMode,
  DisplayMode,
  HVACMode,
  FanMode,
  PresetMode,
  ConvertiMode,
  SwingMode,
} from '../types';

export const ICON_MAP: Record<MacroIconName, React.ElementType> = {
  Moon,
  Zap,
  Wind,
  Flame,
  Snowflake,
  Sparkles,
  Leaf,
  ShieldCheck,
  Sun,
  Coffee,
  Heart,
  Tv,
};

export const COLOR_CLASSES: Record<
  MacroColorName,
  { text: string; bg: string; border: string; glow: string }
> = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', glow: 'hover:border-cyan-500/50' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'hover:border-amber-500/50' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', glow: 'hover:border-indigo-500/50' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'hover:border-emerald-500/50' },
  rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'hover:border-rose-500/50' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'hover:border-purple-500/50' },
  teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', glow: 'hover:border-teal-500/50' },
};

const ICON_KEYS = Object.keys(ICON_MAP) as MacroIconName[];
const COLOR_KEYS = Object.keys(COLOR_CLASSES) as MacroColorName[];

// 1. Memoized Icon Picker Grid (Prevents 12 icons re-rendering on temp drag / typing)
const IconSelector = memo(({ selected, onSelect }: { selected: MacroIconName; onSelect: (i: MacroIconName) => void }) => {
  return (
    <div className="space-y-1.5">
      <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
        Select Icon
      </label>
      <div className="grid grid-cols-6 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
        {ICON_KEYS.map((iName) => {
          const IconComp = ICON_MAP[iName];
          const isSelected = selected === iName;
          return (
            <button
              type="button"
              key={iName}
              onClick={() => onSelect(iName)}
              className={`flex items-center justify-center p-2.5 rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <IconComp className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
});

// 2. Memoized Color Picker Palette
const ColorSelector = memo(({ selected, onSelect }: { selected: MacroColorName; onSelect: (c: MacroColorName) => void }) => {
  return (
    <div className="space-y-1.5">
      <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
        Select Accent Color
      </label>
      <div className="flex items-center gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
        {COLOR_KEYS.map((cName) => {
          const isSelected = selected === cName;
          const palette = COLOR_CLASSES[cName];
          return (
            <button
              type="button"
              key={cName}
              onClick={() => onSelect(cName)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${palette.bg} ${
                isSelected ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
});

interface CreatePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: SmartMacroPreset) => void;
}

export const CreatePresetModal: React.FC<CreatePresetModalProps> = memo(({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<MacroIconName>('Sparkles');
  const [color, setColor] = useState<MacroColorName>('cyan');

  // AC Parameters
  const [power, setPower] = useState<PowerMode>('on');
  const [temperature, setTemperature] = useState<number>(24);
  const [hvac_mode, setHVACMode] = useState<HVACMode>('cool');
  const [fan_mode, setFanMode] = useState<FanMode>('auto');
  const [preset_mode, setPresetMode] = useState<PresetMode>('none');
  const [converti_mode, setConvertiMode] = useState<ConvertiMode>(0);
  const [display_mode, setDisplayMode] = useState<DisplayMode>('on');
  const [vertical_swing_mode, setVerticalSwingMode] = useState<SwingMode>(0);
  const [horizontal_swing_mode, setHorizontalSwingMode] = useState<SwingMode>(0);

  const handleIconSelect = useCallback((i: MacroIconName) => setIcon(i), []);
  const handleColorSelect = useCallback((c: MacroColorName) => setColor(c), []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: `preset_${Date.now()}`,
      name: name.trim(),
      icon,
      color,
      power,
      temperature,
      hvac_mode,
      fan_mode,
      preset_mode,
      converti_mode,
      display_mode,
      vertical_swing_mode,
      horizontal_swing_mode,
    });

    setName('');
    onClose();
  };

  const PreviewIcon = ICON_MAP[icon] || Sparkles;
  const activeColorStyle = COLOR_CLASSES[color] || COLOR_CLASSES.cyan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Smart Preset</h2>
              <p className="text-xs text-slate-400">Configure a custom 1-click snapshot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Preset Name & Live Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Preset Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Deep Sleep, Gaming Chill"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Live Preview Chip */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Preview</span>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${activeColorStyle.bg} ${activeColorStyle.border} ${activeColorStyle.text}`}
              >
                <PreviewIcon className="w-4 h-4" />
                <span className="font-semibold">{name.trim() || 'Macro'}</span>
              </div>
            </div>
          </div>

          {/* Isolated Icon Selector */}
          <IconSelector selected={icon} onSelect={handleIconSelect} />

          {/* Isolated Color Selector */}
          <ColorSelector selected={color} onSelect={handleColorSelect} />

          {/* AC Parameters Section */}
          <div className="border-t border-slate-800 pt-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              AC Target Settings
            </h3>

            {/* Power & Temp */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Power</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPower('on')}
                    className={`py-1 rounded font-semibold transition-colors ${
                      power === 'on' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ON
                  </button>
                  <button
                    type="button"
                    onClick={() => setPower('off')}
                    className={`py-1 rounded font-semibold transition-colors ${
                      power === 'off' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Temperature</span>
                  <span className="font-mono text-cyan-400 font-bold">{temperature}°C</span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={30}
                  step={1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg mt-2"
                />
              </div>
            </div>

            {/* HVAC Mode & Fan Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">HVAC Mode</label>
                <select
                  value={hvac_mode}
                  onChange={(e) => setHVACMode(e.target.value as HVACMode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="cool">Cool</option>
                  <option value="auto">Auto</option>
                  <option value="dry">Dry</option>
                  <option value="fan">Fan Only</option>
                  <option value="heat">Heat</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Fan Speed</label>
                <select
                  value={fan_mode}
                  onChange={(e) => setFanMode(e.target.value as FanMode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="auto">Auto</option>
                  <option value="quiet">Quiet</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Converti & Preset Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Converti Capacity</label>
                <select
                  value={converti_mode}
                  onChange={(e) => setConvertiMode(Number(e.target.value) as ConvertiMode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={0}>Normal (Off)</option>
                  <option value={40}>40% Capacity</option>
                  <option value={50}>50% Capacity</option>
                  <option value={55}>55% Capacity</option>
                  <option value={70}>70% Capacity</option>
                  <option value={80}>80% Capacity</option>
                  <option value={90}>90% Capacity</option>
                  <option value={100}>100% Full (FC)</option>
                  <option value={110}>110% High (HC)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Special Preset</label>
                <select
                  value={preset_mode}
                  onChange={(e) => setPresetMode(e.target.value as PresetMode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="none">None (Standard)</option>
                  <option value="eco">Eco Mode</option>
                  <option value="boost">Boost Mode</option>
                  <option value="clean">Self Clean</option>
                </select>
              </div>
            </div>

            {/* Display Light & Swings */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Unit LED</label>
                <button
                  type="button"
                  onClick={() => setDisplayMode(display_mode === 'on' ? 'off' : 'on')}
                  className={`w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border font-medium transition-colors ${
                    display_mode === 'on'
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {display_mode === 'on' ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{display_mode === 'on' ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">V-Swing</label>
                <select
                  value={vertical_swing_mode}
                  onChange={(e) => setVerticalSwingMode(Number(e.target.value) as SwingMode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={0}>Auto</option>
                  <option value={1}>Pos 1</option>
                  <option value={2}>Pos 2</option>
                  <option value={3}>Pos 3</option>
                  <option value={4}>Pos 4</option>
                  <option value={5}>Pos 5</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">H-Swing</label>
                <select
                  value={horizontal_swing_mode}
                  onChange={(e) => setHorizontalSwingMode(Number(e.target.value) as SwingMode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={0}>Auto</option>
                  <option value={1}>Pos 1</option>
                  <option value={2}>Pos 2</option>
                  <option value={3}>Pos 3</option>
                  <option value={4}>Pos 4</option>
                  <option value={5}>Pos 5</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 active:scale-95 transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Save Preset Macro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});