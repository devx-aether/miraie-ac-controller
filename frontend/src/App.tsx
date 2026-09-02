import { useState, useEffect, useCallback, useRef } from "react";
import {
  Snowflake,
  RotateCw,
  ChevronDown,
  SlidersHorizontal,
  AlertCircle,
  Settings,
} from "lucide-react";

import { TemperatureDial } from "./components/TemperatureDial";
import { ControlDeck } from "./components/ControlDeck";
import { PowerSwitch } from "./components/PowerSwitch";
import { PowerConsumptionCard } from "./components/PowerConsumptionCard";
import { SettingsModal } from "./components/SettingsModal";
import { CreatePresetModal } from "./components/CreatePresetModal";
import { SmartMacrosDeck } from "./components/SmartMacrosDeck";
import { api } from "./api";

import type {
  ACDevice,
  PowerMode,
  DisplayMode,
  HVACMode,
  FanMode,
  PresetMode,
  ConvertiMode,
  SwingMode,
  SmartMacroPreset,
} from "./types";

const DEFAULT_PRESETS: SmartMacroPreset[] = [
  {
    id: "default_goodnight",
    name: "Goodnight",
    icon: "Moon",
    color: "indigo",
    power: "on",
    temperature: 26,
    hvac_mode: "cool",
    fan_mode: "quiet",
    preset_mode: "none",
    converti_mode: 50,
    display_mode: "off",
    vertical_swing_mode: 0,
    horizontal_swing_mode: 0,
  },
  {
    id: "default_turbo",
    name: "Turbo Chill",
    icon: "Zap",
    color: "amber",
    power: "on",
    temperature: 18,
    hvac_mode: "cool",
    fan_mode: "high",
    preset_mode: "boost",
    converti_mode: 110,
    display_mode: "on",
    vertical_swing_mode: 0,
    horizontal_swing_mode: 0,
  },
  {
    id: "default_dry",
    name: "Gentle Dry",
    icon: "Wind",
    color: "teal",
    power: "on",
    temperature: 25,
    hvac_mode: "dry",
    fan_mode: "low",
    preset_mode: "none",
    converti_mode: 70,
    display_mode: "on",
    vertical_swing_mode: 0,
    horizontal_swing_mode: 0,
  },
];

export default function App() {
  const [devices, setDevices] = useState<ACDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [authMobile, setAuthMobile] = useState<string>("");
  const [isCreatePresetOpen, setIsCreatePresetOpen] = useState<boolean>(false);

  const [presets, setPresets] = useState<SmartMacroPreset[]>(() => {
    try {
      const saved = localStorage.getItem("miraie_custom_presets");
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });

  const selectedDeviceIdRef = useRef<string>("");
  selectedDeviceIdRef.current = selectedDeviceId;

  const prevDevicesJsonRef = useRef<string>("");
  const syncTimeoutRef = useRef<number | null>(null);

  const checkAuthAndFetch = useCallback(async (showSync = false) => {
    if (showSync) setIsSyncing(true);
    try {
      const authData = await api.getAuthStatus();
      setAuthMobile(authData.mobile_number || "");

      if (!authData.configured) {
        setIsSettingsOpen(true);
      }

      const data = await api.getDevices();
      const jsonStr = JSON.stringify(data);

      if (jsonStr !== prevDevicesJsonRef.current) {
        prevDevicesJsonRef.current = jsonStr;
        setDevices(data);
      }

      setErrorMsg(null);

      if (data.length > 0 && !selectedDeviceIdRef.current) {
        setSelectedDeviceId(data[0].id);
      }
    } catch {
      setErrorMsg("Could not connect to AC Backend.");
    } finally {
      setIsLoading(false);
      if (showSync) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    checkAuthAndFetch();
    const interval = setInterval(() => checkAuthAndFetch(false), 10000);
    const refreshAfterWake = () => {
      if (document.visibilityState === "visible") checkAuthAndFetch(true);
    };
    document.addEventListener("visibilitychange", refreshAfterWake);
    window.addEventListener("online", refreshAfterWake);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshAfterWake);
      window.removeEventListener("online", refreshAfterWake);
    };
  }, [checkAuthAndFetch]);

  const currentDevice =
    devices.find((d) => d.id === selectedDeviceId) || devices[0];

  const executeUpdate = useCallback(
    async (
      updates: Partial<ACDevice>,
      apiCall: (id: string) => Promise<void>,
    ) => {
      const activeId = selectedDeviceIdRef.current;
      if (!activeId) return;

      let prevState: ACDevice | undefined;

      setDevices((prevList) => {
        prevState = prevList.find((d) => d.id === activeId);
        return prevList.map((d) =>
          d.id === activeId ? { ...d, ...updates } : d,
        );
      });

      try {
        await apiCall(activeId);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(
          () => checkAuthAndFetch(false),
          1200,
        );
      } catch {
        if (prevState) {
          setDevices((prevList) =>
            prevList.map((d) => (d.id === activeId ? prevState! : d)),
          );
        }
        setErrorMsg("Command failed. Rolling back.");
        setTimeout(() => setErrorMsg(null), 3000);
      }
    },
    [checkAuthAndFetch],
  );

  const handleTemp = useCallback(
    (t: number) => {
      executeUpdate({ temperature: t }, (id) => api.setTemperature(id, t));
    },
    [executeUpdate],
  );

  const handlePower = useCallback(
    (p: PowerMode) => {
      executeUpdate({ power: p }, (id) => api.setPower(id, p));
    },
    [executeUpdate],
  );

  const handleDisplay = useCallback(
    (d: DisplayMode) => {
      executeUpdate({ display_mode: d }, (id) => api.setDisplay(id, d));
    },
    [executeUpdate],
  );

  const handleHVAC = useCallback(
    (m: HVACMode) => {
      executeUpdate({ hvac_mode: m }, (id) => api.setHVACMode(id, m));
    },
    [executeUpdate],
  );

  const handleFan = useCallback(
    (f: FanMode) => {
      executeUpdate({ fan_mode: f }, (id) => api.setFanMode(id, f));
    },
    [executeUpdate],
  );

  const handlePreset = useCallback(
    (p: PresetMode) => {
      executeUpdate({ preset_mode: p }, (id) => api.setPresetMode(id, p));
    },
    [executeUpdate],
  );

  const handleConverti = useCallback(
    (c: ConvertiMode) => {
      executeUpdate({ converti_mode: c }, (id) => api.setConvertiMode(id, c));
    },
    [executeUpdate],
  );

  const handleVSwing = useCallback(
    (v: SwingMode) => {
      executeUpdate({ vertical_swing_mode: v }, (id) =>
        api.setVerticalSwing(id, v),
      );
    },
    [executeUpdate],
  );

  const handleHSwing = useCallback(
    (h: SwingMode) => {
      executeUpdate({ horizontal_swing_mode: h }, (id) =>
        api.setHorizontalSwing(id, h),
      );
    },
    [executeUpdate],
  );

  const handleSavePreset = useCallback((newPreset: SmartMacroPreset) => {
    setPresets((prev) => {
      const updated = [newPreset, ...prev];
      localStorage.setItem("miraie_custom_presets", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem("miraie_custom_presets", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleExecutePreset = useCallback(
    (preset: SmartMacroPreset) => {
      executeUpdate(
        {
          power: preset.power,
          temperature: preset.temperature,
          hvac_mode: preset.hvac_mode,
          fan_mode: preset.fan_mode,
          preset_mode: preset.preset_mode,
          converti_mode: preset.converti_mode,
          display_mode: preset.display_mode,
          vertical_swing_mode: preset.vertical_swing_mode,
          horizontal_swing_mode: preset.horizontal_swing_mode,
        },
        async (id) => {
          const res = await fetch(`/api/devices/${id}/state`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              power: preset.power,
              temperature: preset.temperature,
              hvac_mode: preset.hvac_mode,
              fan_mode: preset.fan_mode,
              preset_mode: preset.preset_mode,
              converti_mode: preset.converti_mode,
              display_mode: preset.display_mode,
              vertical_swing_mode: preset.vertical_swing_mode,
              horizontal_swing_mode: preset.horizontal_swing_mode,
            }),
          });
          if (!res.ok) throw new Error("Preset execution failed");
        },
      );
    },
    [executeUpdate],
  );

  if (isLoading && devices.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <Snowflake className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs font-medium tracking-wider uppercase">
          Loading MirAIe AC Hub...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex justify-center selection:bg-cyan-500 selection:text-slate-950 font-sans">
      <div className="w-full max-w-5xl flex flex-col gap-5">
        {/* Global Error Banner */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Top Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Snowflake className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Panasonic MirAIe
              </span>
              <div className="relative inline-block">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="appearance-none bg-transparent pr-8 py-0.5 text-base font-bold text-white cursor-pointer focus:outline-none focus:text-cyan-400 transition-colors"
                >
                  {devices.map((d) => (
                    <option
                      key={d.id}
                      value={d.id}
                      className="bg-slate-900 text-white"
                    >
                      {d.friendly_name || d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-1 top-1.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentDevice?.online
                    ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-slate-300">
                {currentDevice?.online ? "Online" : "Offline"}
              </span>
            </div>

            <button
              onClick={() => checkAuthAndFetch(true)}
              disabled={isSyncing}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 transition-colors active:scale-95"
              title="Sync latest state"
            >
              <RotateCw
                className={`w-4 h-4 ${isSyncing ? "animate-spin text-cyan-400" : ""}`}
              />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors active:scale-95"
              title="Settings & Credentials"
            >
              <Settings className="w-4 h-4" />
            </button>

            {currentDevice && (
              <PowerSwitch
                power={currentDevice.power}
                online={currentDevice.online}
                onToggle={handlePower}
              />
            )}
          </div>
        </header>

        {/* 2. Top Presets Quick Bar (Scrollable Carousel) */}
        <SmartMacrosDeck
          presets={presets}
          disabled={!currentDevice?.online}
          onExecute={handleExecutePreset}
          onOpenCreateModal={() => setIsCreatePresetOpen(true)}
          onDeletePreset={handleDeletePreset}
        />

        {/* 3. Main Dial & Controls Grid */}
        {currentDevice && (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-lg min-h-[380px]">
              <div className="absolute top-4 left-4 flex items-center gap-1.5 text-slate-500 text-xs font-semibold tracking-wider uppercase">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Target Temp
              </div>

              <TemperatureDial
                value={currentDevice.temperature}
                roomTemperature={currentDevice.room_temperature}
                power={currentDevice.power}
                onChangeEnd={handleTemp}
              />
            </section>

            <section className="lg:col-span-7">
              <ControlDeck
                device={currentDevice}
                onDisplayChange={handleDisplay}
                onHVACChange={handleHVAC}
                onFanChange={handleFan}
                onPresetChange={handlePreset}
                onConvertiChange={handleConverti}
                onVerticalSwingChange={handleVSwing}
                onHorizontalSwingChange={handleHSwing}
              />
            </section>
          </main>
        )}

        {/* 4. Bottom Telemetry */}
        {currentDevice && (
          <footer className="w-full">
            <PowerConsumptionCard deviceId={currentDevice.id} />
          </footer>
        )}

        {/* Modals */}
        <SettingsModal
          isOpen={isSettingsOpen}
          initialMobile={authMobile}
          onClose={() => setIsSettingsOpen(false)}
          onSuccess={() => checkAuthAndFetch(true)}
        />

        <CreatePresetModal
          isOpen={isCreatePresetOpen}
          onClose={() => setIsCreatePresetOpen(false)}
          onSave={handleSavePreset}
        />
      </div>
    </div>
  );
}
