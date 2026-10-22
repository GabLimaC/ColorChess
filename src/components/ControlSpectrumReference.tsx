import React from 'react';

interface ControlSpectrumReferenceProps {
  className?: string;
}

const REFERENCE_TICKS = [
  { ratio: '0:1', label: '100% B', hue: 0, textColor: 'text-rose-700' },
  { ratio: '1:3', label: '75% B', hue: 60, textColor: 'text-orange-700' },
  { ratio: '1:2', label: '66% B', hue: 80, textColor: 'text-amber-700' },
  { ratio: '1:1', label: 'Standoff', hue: 120, textColor: 'text-green-700 font-bold' },
  { ratio: '2:1', label: '66% W', hue: 160, textColor: 'text-emerald-700' },
  { ratio: '3:1', label: '75% W', hue: 180, textColor: 'text-teal-700' },
  { ratio: '1:0', label: '100% W', hue: 240, textColor: 'text-sky-700' },
];

export const ControlSpectrumReference: React.FC<ControlSpectrumReferenceProps> = ({
  className = '',
}) => {
  return (
    <aside
      aria-label="Optical control spectrum reference"
      className={`flex flex-col items-center justify-between w-16 sm:w-20 bg-slate-50 border border-slate-300 rounded-xl p-2 sm:p-2.5 shadow-xs select-none ${className}`}
    >
      {/* Fixed Instrument Header Label */}
      <div className="w-full text-center pb-1.5 border-b border-slate-200">
        <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-900 uppercase block">
          SPECTRUM
        </span>
        <span className="text-[8px] sm:text-[8.5px] font-mono text-slate-500 font-medium tracking-tight block">
          PROPORTIONS
        </span>
      </div>

      {/* Main Spectrum Gradient Bar with Proportion Reference Markers */}
      <div className="flex-1 w-full my-2 flex items-center justify-center space-x-1.5 sm:space-x-2">
        {/* Continuous Linear Gradient Strip (H: 0 deg Red at top down to 240 deg Blue at bottom) */}
        <div
          style={{
            background:
              'linear-gradient(to bottom, hsl(0, 80%, 68%) 0%, hsl(60, 80%, 68%) 25%, hsl(120, 80%, 68%) 50%, hsl(180, 80%, 68%) 75%, hsl(240, 80%, 68%) 100%)',
          }}
          className="w-3 sm:w-3.5 h-full rounded-full border border-black shadow-inner flex-shrink-0"
          title="Color spectrum across Black (Red) at top to White (Blue) at bottom"
        />

        {/* Proportional Tick Labels */}
        <div className="flex flex-col justify-between h-full py-0.5 font-mono text-[9px] sm:text-[10px] leading-none">
          {REFERENCE_TICKS.map((tick) => (
            <div
              key={tick.ratio}
              className={`flex items-center space-x-1 ${tick.textColor}`}
              title={`Ratio ${tick.ratio} (${tick.label})`}
            >
              <span className="font-semibold">{tick.ratio}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Neutral Unlit Reference */}
      <div className="w-full pt-1.5 border-t border-slate-200 text-center">
        <div className="flex items-center justify-center space-x-1">
          <span className="w-2 h-2 rounded-xs bg-white border border-slate-400 inline-block shadow-2xs" />
          <span className="text-[8px] sm:text-[8.5px] font-mono text-slate-500 font-medium">
            0:0 Unlit
          </span>
        </div>
      </div>
    </aside>
  );
};
