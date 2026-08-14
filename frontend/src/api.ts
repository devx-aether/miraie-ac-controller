// src/api.ts
import type {
  ACDevice,
  PowerMode,
  DisplayMode,
  HVACMode,
  FanMode,
  PresetMode,
  ConvertiMode,
  SwingMode,
} from './types';

const API_BASE = '/api'; // Proxied by Vite to http://localhost:8000

export const api = {
  // Fetch all devices or current status
  async getDevices(): Promise<ACDevice[]> {
    const res = await fetch(`${API_BASE}/devices`);
    if (!res.ok) throw new Error(`Failed to fetch devices: ${res.statusText}`);
    return res.json();
  },

  // Set Target Temperature
  async setTemperature(deviceId: string, temperature: number): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/temperature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temperature }),
    });
    if (!res.ok) throw new Error('Failed to set temperature');
  },

  // Toggle Power
  async setPower(deviceId: string, power: PowerMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/power`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ power }),
    });
    if (!res.ok) throw new Error('Failed to set power');
  },

  // Toggle Display LED
  async setDisplay(deviceId: string, display_mode: DisplayMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/display`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_mode }),
    });
    if (!res.ok) throw new Error('Failed to set display mode');
  },

  // Change HVAC Mode
  async setHVACMode(deviceId: string, hvac_mode: HVACMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/hvac-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hvac_mode }),
    });
    if (!res.ok) throw new Error('Failed to set HVAC mode');
  },

  // Change Fan Speed
  async setFanMode(deviceId: string, fan_mode: FanMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/fan-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan_mode }),
    });
    if (!res.ok) throw new Error('Failed to set fan mode');
  },

  // Set Preset Mode (Eco, Boost, Clean)
  async setPresetMode(deviceId: string, preset_mode: PresetMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/preset-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_mode }),
    });
    if (!res.ok) throw new Error('Failed to set preset mode');
  },

  // Set Converti Capacity
  async setConvertiMode(deviceId: string, converti_mode: ConvertiMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/converti-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ converti_mode }),
    });
    if (!res.ok) throw new Error('Failed to set converti mode');
  },

  // Set Vertical Swing
  async setVerticalSwing(deviceId: string, vertical_swing_mode: SwingMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/vertical-swing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swing_mode: vertical_swing_mode }),
    });
    if (!res.ok) throw new Error('Failed to set vertical swing');
  },

  // Set Horizontal Swing
  async setHorizontalSwing(deviceId: string, horizontal_swing_mode: SwingMode): Promise<void> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/horizontal-swing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swing_mode: horizontal_swing_mode }),
    });
    if (!res.ok) throw new Error('Failed to set horizontal swing');
  },
};