import React, { useState, useEffect, useMemo, memo } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import { RollingNumber } from "./RollingNumber";
import type { ConsumptionPeriodType } from "../types";

interface PowerConsumptionCardProps {
  deviceId: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface Bucket {
  aliases: string[];
  label: string;
}

const toNumericConsumption = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 10) / 10 : 0;
};

const keyVariants = (rawValue: unknown): string[] => {
  const values = new Set<string>();
  const raw = String(rawValue ?? "").trim();

  if (!raw) {
    return [];
  }

  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  const digitsOnly = raw.replace(/\D/g, "");

  [raw, raw.toLowerCase(), compact, digitsOnly].forEach((v) => {
    if (v) values.add(v);
  });

  const isoLike = raw.replace(/\s+/g, "").replace(/[^\dA-Za-z]/g, "-");
  if (isoLike) values.add(isoLike);

  return [...values];
};

const matchEnergyValue = (
  recordKey: string,
  bucketAliases: string[],
  period: ConsumptionPeriodType,
): boolean => {
  const bucketTokens = new Set<string>();

  bucketAliases.forEach((alias) => {
    keyVariants(alias).forEach((variant) => bucketTokens.add(variant));
  });

  const recordTokens = keyVariants(recordKey);

  return recordTokens.some((token) => {
    if (bucketTokens.has(token)) return true;

    if (period === "Monthly") {
      // Try MMYYYY format first (most reliable)
      const keyMatch = token.match(/(\d{2})(\d{4})/);
      if (keyMatch) {
        const keyMonthYear = keyMatch[0]; // e.g., "082026"
        const bucketHasMatch = [...bucketTokens].some((entry) => {
          const bucketMatch = entry.match(/(\d{2})(\d{4})/);
          return bucketMatch && bucketMatch[0] === keyMonthYear;
        });
        if (bucketHasMatch) return true;
      }

      // Fallback: try matching month names or numbers
      const monthPattern =
        /(\d{1,2})|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
      const keyMonthPart = token.match(monthPattern)?.[0]?.toLowerCase();
      if (!keyMonthPart) return false;

      return [...bucketTokens].some((entry) => {
        const bucketMonthPart = entry.match(monthPattern)?.[0]?.toLowerCase();
        return bucketMonthPart === keyMonthPart;
      });
    }

    if (period === "Weekly") {
      const weekNumbers = new Set([
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "w1",
        "w2",
        "w3",
        "w4",
        "w5",
        "w6",
        "w7",
      ]);
      const recordNumber = token.replace(/[^0-9]/g, "");
      if (weekNumbers.has(token) || weekNumbers.has(recordNumber)) return true;
    }

    return false;
  });
};

const normalizeEnergyMap = (
  rawData: Record<string, any> | Array<Record<string, any>> | undefined,
  period: ConsumptionPeriodType,
  buckets: Bucket[],
): number[] => {
  const entries: Array<[string, unknown]> = [];

  if (Array.isArray(rawData)) {
    rawData.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const keyFromRecord =
        item.day ??
        item.week ??
        item.month ??
        item.date ??
        item.key ??
        item.period ??
        item.label ??
        item.name;

      const valueFromRecord =
        item.power ?? item.value ?? item.kwh ?? item.energy ?? item.amount;
      if (keyFromRecord !== undefined && valueFromRecord !== undefined) {
        entries.push([String(keyFromRecord), valueFromRecord]);
      }
    });
  } else if (rawData && typeof rawData === "object") {
    Object.entries(rawData).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        const nestedKey =
          value.day ?? value.week ?? value.month ?? value.date ?? value.key;
        const nestedValue =
          value.power ??
          value.value ??
          value.kwh ??
          value.energy ??
          value.amount;
        if (nestedKey !== undefined && nestedValue !== undefined) {
          entries.push([String(nestedKey), nestedValue]);
        }
        return;
      }

      entries.push([key, value]);
    });
  }

  const resolved = buckets.map((bucket) => {
    for (const [recordKey, recordValue] of entries) {
      if (matchEnergyValue(recordKey, bucket.aliases, period)) {
        return toNumericConsumption(recordValue);
      }
    }
    return null;
  });

  if (resolved.some((item) => item !== null)) {
    return resolved.map((item) => item ?? 0);
  }

  if (entries.length > 0) {
    const rawValues = entries.map(([, value]) => toNumericConsumption(value));
    const aligned = Array(7).fill(0);
    const slice = rawValues.slice(-7);
    slice.forEach((value, idx) => {
      aligned[7 - slice.length + idx] = value;
    });
    return aligned;
  }

  return Array(7).fill(0);
};

export const PowerConsumptionCard: React.FC<PowerConsumptionCardProps> = memo(
  ({ deviceId }) => {
    const [period, setPeriod] = useState<ConsumptionPeriodType>("Daily");
    const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [labels, setLabels] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
      let isMounted = true;

      const fetchEnergy = async () => {
        setIsLoading(true);
        const today = new Date();
        const buckets: Bucket[] = [];
        let fromDateParam = "";
        let toDateParam = "";

        // -------------------------------------------------------------
        // 1. Calculate Periods & Date Ranges (MirAIe Standards)
        // -------------------------------------------------------------
        if (period === "Daily") {
          // Last 7 days in DDMMYYYY format
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            const dd = String(d.getDate()).padStart(2, "0");
            const dStr = String(d.getDate());
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = String(d.getFullYear());
            const fullDate = `${dd}${mm}${yyyy}`;

            buckets.push({
              aliases: [fullDate, `${yyyy}-${mm}-${dd}`, dd, dStr],
              label: `${dd} ${MONTH_NAMES[d.getMonth()]}`,
            });
          }
          fromDateParam = buckets[0].aliases[0];
          toDateParam = buckets[buckets.length - 1].aliases[0];
        } else if (period === "Weekly") {
          // MirAIe Weekly: from_date and to_date MUST BE SUNDAYS in DDMMYYYY format
          const getMostRecentSunday = (d: Date) => {
            const res = new Date(d);
            res.setDate(d.getDate() - d.getDay()); // Sunday is 0
            return res;
          };

          const latestSunday = getMostRecentSunday(today);

          for (let i = 6; i >= 0; i--) {
            const sun = new Date(latestSunday);
            sun.setDate(latestSunday.getDate() - i * 7);

            const sat = new Date(sun);
            sat.setDate(sun.getDate() + 6);

            const sunDD = String(sun.getDate()).padStart(2, "0");
            const sunMM = String(sun.getMonth() + 1).padStart(2, "0");
            const sunYYYY = String(sun.getFullYear());
            const sunDateStr = `${sunDD}${sunMM}${sunYYYY}`;

            const satDD = String(sat.getDate()).padStart(2, "0");
            const satMM = MONTH_NAMES[sat.getMonth()];

            const seqIndex = 6 - i; // 0 to 6

            // Human friendly range label: "09 - 15 Aug"
            const label =
              sun.getMonth() === sat.getMonth()
                ? `${sunDD} - ${satDD} ${satMM}`
                : `${sunDD} ${MONTH_NAMES[sun.getMonth()]} - ${satDD} ${satMM}`;

            buckets.push({
              aliases: [
                sunDateStr,
                String(seqIndex + 1), // "1".."7"
                String(seqIndex), // "0".."6"
                `Week ${seqIndex + 1}`,
                `W${seqIndex + 1}`,
              ],
              label,
            });
          }
          // from_date = oldest Sunday, to_date = most recent Sunday
          fromDateParam = buckets[0].aliases[0];
          toDateParam = buckets[buckets.length - 1].aliases[0];
        } else {
          // MirAIe Monthly: MUST BE MMYYYY (6 digits) format
          for (let i = 6; i >= 0; i--) {
            const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthNum = m.getMonth() + 1; // 1 to 12
            const mm = String(monthNum).padStart(2, "0");
            const mStr = String(monthNum);
            const yyyy = String(m.getFullYear());
            const mmyyyy = `${mm}${yyyy}`;
            const monthName = MONTH_NAMES[m.getMonth()];

            buckets.push({
              aliases: [
                mStr, // "8"
                mm, // "08"
                mmyyyy, // "082026"
                monthName, // "Aug"
                `${monthName} ${yyyy}`, // "Aug 2026"
                `${yyyy}-${mm}`, // "2026-08"
                String(6 - i + 1), // 1..7 index
              ],
              label: `${monthName} '${yyyy.slice(-2)}`,
            });
          }
          // Query from 6 months ago (MMYYYY) to current month (MMYYYY)
          fromDateParam = buckets[0].aliases[2];
          toDateParam = buckets[buckets.length - 1].aliases[2];
        }

        if (isMounted) {
          setLabels(buckets.map((b) => b.label));
        }

        // -------------------------------------------------------------
        // 2. Fetch & Map Energy Dictionary
        // -------------------------------------------------------------
        try {
          const res = await fetch(`/api/devices/${deviceId}/energy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              period_type: period,
              from_date: fromDateParam,
              to_date: toDateParam,
            }),
          });

          const json = await res.json();
          const energyMap = json.data ?? {};
          console.log(`[MirAIe Energy ${period} Result]:`, energyMap);

          if (isMounted) {
            const normalized = normalizeEnergyMap(energyMap, period, buckets);
            setChartData(normalized);
          }
        } catch (err) {
          console.error("Failed to load energy stats:", err);
          if (isMounted) setChartData([0, 0, 0, 0, 0, 0, 0]);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      if (deviceId) {
        fetchEnergy();
      }

      return () => {
        isMounted = false;
      };
    }, [deviceId, period]);

    const totalConsumption = useMemo(() => {
      return chartData.reduce((acc, curr) => acc + curr, 0).toFixed(1);
    }, [chartData]);

    const latestVal = chartData[chartData.length - 1] || 0;
    const maxVal = Math.max(...chartData, 5); // 5 kWh baseline height scale

    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-lg select-none">
        {/* Header & Period Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Power Consumption
            </span>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-medium">
            {(["Daily", "Weekly", "Monthly"] as ConsumptionPeriodType[]).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    period === p
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Metrics Readout */}
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="flex items-baseline gap-1">
              <RollingNumber
                value={latestVal.toFixed(1)}
                className="text-2xl sm:text-3xl font-black text-white tracking-tight"
                heightEm={1.1}
              />
              <span className="text-xs font-semibold text-cyan-400">kWh</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {period === "Daily"
                ? "Today"
                : period === "Weekly"
                  ? "Current Week"
                  : "Current Month"}
            </span>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-slate-300 font-mono font-semibold text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <RollingNumber
                value={totalConsumption}
                className="text-white"
                heightEm={1.1}
              />
              <span>kWh</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Total in 7-period view
            </span>
          </div>
        </div>

        {/* Thicker Hardware-Accelerated Bar Visualizer */}
        <div className="h-44 w-full pt-4 flex items-end justify-between gap-3 sm:gap-6 relative">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
              Loading consumption telemetry...
            </div>
          ) : (
            chartData.map((val, idx) => {
              const heightPercent = Math.max(
                Math.round((val / maxVal) * 100),
                4,
              );
              const isLatest = idx === chartData.length - 1;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                >
                  {/* Floating Value Tooltip on Hover */}
                  <span className="text-[10px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {val} kWh
                  </span>

                  {/* Thicker Bar (max-w-[48px]) */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[48px] rounded-t-lg transition-all duration-500 ease-out ${
                      isLatest
                        ? "bg-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.45)]"
                        : "bg-cyan-500/35 hover:bg-cyan-400/80"
                    }`}
                  />

                  {/* X-Axis Label */}
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate max-w-[70px] text-center">
                    {labels[idx] || ""}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  },
);
