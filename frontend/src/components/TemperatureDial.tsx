import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { RollingNumber } from './RollingNumber';

interface TemperatureDialProps {
  value: number;                  // Current target temp from backend (e.g. 24)
  roomTemperature?: number;       // Ambient temp (e.g. 28)
  min?: number;                   // Default: 16
  max?: number;                   // Default: 30
  power?: 'on' | 'off';
  onChange?: (temp: number) => void;     // Live visual preview while dragging
  onChangeEnd: (temp: number) => void;  // Fires ONLY on release (API call)
}

export const TemperatureDial: React.FC<TemperatureDialProps> = ({
  value,
  roomTemperature = 26,
  min = 16,
  max = 30,
  power = 'on',
  onChange,
  onChangeEnd,
}) => {
  const [localTemp, setLocalTemp] = useState<number>(value);
  const isDragging = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalTemp(value);
    }
  }, [value]);

  // Geometry configuration
  const size = 300;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth - 24; // ~116px radius
  const trackTolerance = 28; // Active hit-zone band width

  // Arc geometry: Starts at bottom-left (135°) and sweeps 270° clockwise to 405° (45°)
  const startAngle = 135;
  const totalSweep = 270;
  const stepsCount = max - min;

  const clampedValue = Math.min(Math.max(localTemp, min), max);
  const isPoweredOn = power === 'on';

  const getAngleForValue = useCallback(
    (val: number) => {
      const stepIndex = val - min;
      return startAngle + (stepIndex / stepsCount) * totalSweep;
    },
    [min, stepsCount, startAngle, totalSweep]
  );

  const getPointOnRadius = useCallback(
    (angleDeg: number, r: number) => {
      const rad = (angleDeg * Math.PI) / 180;
      return {
        x: center + r * Math.cos(rad),
        y: center + r * Math.sin(rad),
      };
    },
    [center]
  );

  // Stepped tick marks
  const tickMarks = useMemo(() => {
    const ticks = [];
    for (let temp = min; temp <= max; temp++) {
      const angle = getAngleForValue(temp);
      const isSelected = temp === clampedValue;
      const isBelowCurrent = temp <= clampedValue;

      const innerP = getPointOnRadius(angle, radius - (isSelected ? 14 : 8));
      const outerP = getPointOnRadius(angle, radius + (isSelected ? 6 : 2));

      ticks.push({
        temp,
        angle,
        x1: innerP.x,
        y1: innerP.y,
        x2: outerP.x,
        y2: outerP.y,
        isSelected,
        isBelowCurrent,
      });
    }
    return ticks;
  }, [min, max, getAngleForValue, clampedValue, getPointOnRadius, radius]);

  const thumbAngle = getAngleForValue(clampedValue);
  const thumbPos = getPointOnRadius(thumbAngle, radius);

  const circumference = 2 * Math.PI * radius;
  const totalArcLength = (totalSweep / 360) * circumference;
  const activeArcLength = ((clampedValue - min) / stepsCount) * totalArcLength;

  const calculateTempFromEvent = useCallback(
    (clientX: number, clientY: number, checkRadius = false): number | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - (rect.left + rect.width / 2);
      const y = clientY - (rect.top + rect.height / 2);

      // Check distance from center to lock out clicks inside the center area
      if (checkRadius) {
        const distanceFromCenter = Math.sqrt(x * x + y * y);
        if (
          distanceFromCenter < radius - trackTolerance ||
          distanceFromCenter > radius + trackTolerance
        ) {
          return null;
        }
      }

      let deg = (Math.atan2(y, x) * 180) / Math.PI;
      let relativeDeg = deg - startAngle;
      if (relativeDeg < 0) relativeDeg += 360;

      // Ignore touches in the bottom gap deadzone
      if (relativeDeg > totalSweep + 20 && relativeDeg < 360 - 20) {
        return null;
      }

      const clampedDeg = Math.min(Math.max(relativeDeg, 0), totalSweep);
      const stepFraction = clampedDeg / totalSweep;
      return Math.round(min + stepFraction * stepsCount);
    },
    [min, stepsCount, startAngle, totalSweep, radius, trackTolerance]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isPoweredOn) return;

    const targetTemp = calculateTempFromEvent(e.clientX, e.clientY, true);
    if (targetTemp !== null) {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setLocalTemp(targetTemp);
      onChange?.(targetTemp);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const targetTemp = calculateTempFromEvent(e.clientX, e.clientY, false);
    if (targetTemp !== null && targetTemp !== localTemp) {
      setLocalTemp(targetTemp);
      onChange?.(targetTemp);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    const finalTemp = calculateTempFromEvent(e.clientX, e.clientY, false) ?? localTemp;
    onChangeEnd(finalTemp);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Dial Container */}
      <div className="relative flex items-center justify-center">
        <svg
          ref={svgRef}
          width={size}
          height={size}
          className="touch-none cursor-default"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Base Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isPoweredOn ? '#1e293b' : '#0f172a'}
            strokeWidth={strokeWidth}
            strokeDasharray={`${totalArcLength} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${startAngle} ${center} ${center})`}
            strokeLinecap="round"
          />

          {/* Active Progress Arc */}
          {isPoweredOn ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={strokeWidth}
              strokeDasharray={`${activeArcLength} ${circumference}`}
              strokeDashoffset={0}
              transform={`rotate(${startAngle} ${center} ${center})`}
              strokeLinecap="round"
            />
          ) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeDasharray={`${activeArcLength} ${circumference}`}
              strokeDashoffset={0}
              transform={`rotate(${startAngle} ${center} ${center})`}
              strokeLinecap="round"
            />
          )}

          {/* Invisible Fat Hit-Area (Only this area triggers cursor-pointer) */}
          {isPoweredOn && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="transparent"
              strokeWidth={trackTolerance * 2}
              strokeDasharray={`${totalArcLength} ${circumference}`}
              strokeDashoffset={0}
              transform={`rotate(${startAngle} ${center} ${center})`}
              strokeLinecap="round"
              className="cursor-pointer"
            />
          )}

          {/* Stepped Tick Marks */}
          {tickMarks.map((tick) => {
            let tickColor = '#1e293b';
            if (isPoweredOn) {
              tickColor = tick.isSelected
                ? '#ffffff'
                : tick.isBelowCurrent
                ? '#38bdf8'
                : '#334155';
            } else if (tick.isSelected) {
              tickColor = '#475569';
            } else if (tick.isBelowCurrent) {
              tickColor = '#334155';
            }

            return (
              <line
                key={tick.temp}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tickColor}
                strokeWidth={tick.isSelected ? 3.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Snapped Thumb Knob */}
          <g
            transform={`translate(${thumbPos.x}, ${thumbPos.y})`}
            className={isPoweredOn ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
          >
            <circle
              r={12}
              fill={isPoweredOn ? '#0f172a' : '#090d16'}
              stroke={isPoweredOn ? '#38bdf8' : '#334155'}
              strokeWidth={3}
            />
            <circle r={4} fill={isPoweredOn ? '#ffffff' : '#475569'} />
          </g>
        </svg>

        {/* Center Readout with Rolling Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-start">
            <RollingNumber
              value={clampedValue}
              heightEm={1.05}
              className={`text-6xl font-black tracking-tight transition-colors duration-200 ${
                isPoweredOn ? 'text-white' : 'text-slate-600'
              }`}
            />
            <span
              className={`text-2xl font-semibold mt-1 transition-colors duration-200 ${
                isPoweredOn ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              °C
            </span>
          </div>
          <span
            className={`text-xs font-medium mt-1 inline-flex items-center gap-1 transition-colors duration-200 ${
              isPoweredOn ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Room:
            <RollingNumber
              value={roomTemperature}
              heightEm={1.1}
              className={`font-semibold ${
                isPoweredOn ? 'text-slate-200' : 'text-slate-500'
              }`}
            />
            °C
          </span>
        </div>
      </div>

      {/* Range Indicator (Tucked closely under the arc endpoints) */}
      <span
        className={`text-[11px] font-mono tracking-wider uppercase -mt-6 transition-colors duration-200 ${
          isPoweredOn ? 'text-slate-500' : 'text-slate-700'
        }`}
      >
        {min}°C — {max}°C
      </span>
    </div>
  );
};