import React from 'react';
import { Power, WifiOff } from 'lucide-react';
import type { PowerMode } from '../types';

interface PowerSwitchProps {
  power: PowerMode;
  online: boolean;
  onToggle: (nextPower: PowerMode) => void;
}

export const PowerSwitch: React.FC<PowerSwitchProps> = ({ power, online, onToggle }) => {
  const isPoweredOn = power === 'on';

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-red-500/20 text-red-400 text-xs font-medium cursor-not-allowed opacity-60 select-none">
        <WifiOff className="w-4 h-4" />
        <span>DEVICE OFFLINE</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggle(isPoweredOn ? 'off' : 'on')}
      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-200 select-none shadow-lg active:scale-95 ${
        isPoweredOn
          ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/25 hover:bg-cyan-400'
          : 'bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
      }`}
    >
      <Power className={`w-4 h-4 ${isPoweredOn ? 'stroke-[2.5]' : ''}`} />
      <span>{isPoweredOn ? 'Power ON' : 'Turn ON'}</span>
    </button>
  );
};