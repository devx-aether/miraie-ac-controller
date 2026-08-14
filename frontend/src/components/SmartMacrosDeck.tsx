import React, { memo } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { ICON_MAP, COLOR_CLASSES } from './CreatePresetModal';
import type { SmartMacroPreset } from '../types';

interface SmartMacrosDeckProps {
  presets: SmartMacroPreset[];
  disabled: boolean;
  onExecute: (preset: SmartMacroPreset) => void;
  onOpenCreateModal: () => void;
  onDeletePreset: (id: string) => void;
}

export const SmartMacrosDeck: React.FC<SmartMacrosDeckProps> = memo(({
  presets,
  disabled,
  onExecute,
  onOpenCreateModal,
  onDeletePreset,
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md select-none">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        
        {/* "+ New Preset" Action Chip */}
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="whitespace-nowrap">New Preset</span>
        </button>

        {/* Separator Divider */}
        {presets.length > 0 && (
          <div className="h-7 w-[1px] bg-slate-800 flex-shrink-0" />
        )}

        {/* Horizontal Scrollable Presets Row */}
        {presets.map((preset) => {
          const IconComponent = ICON_MAP[preset.icon] || Zap;
          const colorStyle = COLOR_CLASSES[preset.color] || COLOR_CLASSES.cyan;

          return (
            <div
              key={preset.id}
              className="relative group flex-shrink-0"
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onExecute(preset)}
                className={`flex items-center gap-2.5 pl-3 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800/90 hover:bg-slate-900 transition-all text-left disabled:opacity-30 active:scale-95 ${colorStyle.glow}`}
              >
                {/* Icon Badge */}
                <div className={`p-1.5 rounded-lg ${colorStyle.bg} ${colorStyle.text}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Preset Info */}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {preset.temperature}°C • {preset.fan_mode}
                  </span>
                </div>
              </button>

              {/* Delete Button (Visible on Hover / Focused) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePreset(preset.id);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 opacity-0 group-hover:opacity-100 transition-opacity"
                title={`Delete preset "${preset.name}"`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});