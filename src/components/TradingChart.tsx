import React, { useState, useEffect, useRef } from "react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { X, Maximize2, Eye, EyeOff } from "lucide-react";
import { PineOverlay } from "./PineOverlay";
import { useLayoutSave } from "../contexts/LayoutSaveContext";

interface TradingChartProps {
  id: string;
  initialSymbol?: string;
  initialInterval?: string;
  pineStudies?: string[];
  pineScriptsContents?: string[];
  onRemove: (id: string) => void;
  syncCrosshair?: boolean;
}

const getTVSymbol = (sym: string) => {
    const s = sym.toUpperCase();
    if (s === "XAUUSD=X" || s === "XAUUSD") return "OANDA:XAUUSD";
    if (s === "XAGUSD=X" || s === "XAGUSD") return "OANDA:XAGUSD";
    if (s.endsWith("USDT")) return `BINANCE:${s}`;
    if (s.endsWith("USD") && s.length <= 8) return `COINBASE:${s}`;
    return sym;
};

const getTVInterval = (inv: string) => {
    switch (inv) {
        case "1m": return "1";
        case "3m": return "3";
        case "5m": return "5";
        case "15m": return "15";
        case "30m": return "30";
        case "1h": return "60";
        case "2h": return "120";
        case "4h": return "240";
        case "1d": return "D";
        case "1w": return "W";
        case "1M": return "M";
        default: return "1";
    }
}

export const TradingChart: React.FC<TradingChartProps> = ({ id, initialSymbol = "BTCUSDT", initialInterval = "1m", pineStudies, pineScriptsContents, onRemove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const tvIntervalStr = getTVInterval(initialInterval);
  const [tvSymbol, setTvSymbol] = useState(getTVSymbol(initialSymbol));
  const [tvInterval, setTvInterval] = useState<string>(tvIntervalStr);
  const [activeScripts, setActiveScripts] = useState<string[]>(pineScriptsContents || []);
  const [hiddenScriptIndices, setHiddenScriptIndices] = useState<number[]>([]);

  // Candle Countdown State
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [activeInterval, setActiveInterval] = useState<string>(tvIntervalStr);

  const { markUnsaved } = useLayoutSave();

  // Watch for symbol prop changes from parent
  useEffect(() => {
     const newTVSymbol = getTVSymbol(initialSymbol);
     if (newTVSymbol !== tvSymbol) {
         setTvSymbol(newTVSymbol);
     }
  }, [initialSymbol, tvSymbol]);

  // Sync activeInterval when initial tvIntervalStr changes
  useEffect(() => {
     setActiveInterval(tvIntervalStr);
  }, [tvIntervalStr]);

  // Robustly intercept TradingView cross-origin messages for timeframe syncing
  useEffect(() => {
      const handleMessage = (e: MessageEvent) => {
          if (!e.data) return;
          try {
             let payload = e.data;
             if (typeof payload === 'string') {
                 if (!payload.startsWith('{')) return;
                 payload = JSON.parse(payload);
             }
             
             // Recursively search for interval change in the payload
             const findInterval = (obj: any, depth = 0): string | null => {
                 if (depth > 5 || !obj || typeof obj !== 'object') return null;
                 
                 // TV Charting Library standard event
                 if (obj.name === 'onIntervalChange' || obj.name === 'interval_change') {
                     if (typeof obj.data === 'string') return obj.data;
                     if (obj.data && typeof obj.data.interval === 'string') return obj.data.interval;
                     if (obj.data && typeof obj.data.resolution === 'string') return obj.data.resolution;
                 }
                 // TV lightweight widget event
                 if (obj.name === 'tv-widget-event') {
                     if (typeof obj.data === 'string' && ['1','3','5','15','30','60','120','240','D','W'].includes(obj.data)) {
                         return obj.data;
                     }
                 }

                 for (const key of Object.keys(obj)) {
                     const res = findInterval(obj[key], depth + 1);
                     if (res) return res;
                 }
                 return null;
             };

             const foundInterval = findInterval(payload);
             if (foundInterval) {
                 setActiveInterval(foundInterval);
             }
          } catch(err) {
             // Ignore parsing errors for non-JSON messages
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update Countdown Timer based on activeInterval
  useEffect(() => {
      const getIntervalSeconds = (inv: string) => {
            const i = inv.toLowerCase();
            if (i === "1" || i === "1m") return 60;
            if (i === "3" || i === "3m") return 180;
            if (i === "5" || i === "5m") return 300;
            if (i === "15" || i === "15m") return 900;
            if (i === "30" || i === "30m") return 1800;
            if (i === "60" || i === "1h" || i === "h") return 3600;
            if (i === "120" || i === "2h") return 7200;
            if (i === "240" || i === "4h") return 14400;
            if (i === "d" || i === "1d") return 86400;
            if (i === "w" || i === "1w") return 604800;
            return 60;
      };

      const intervalInSeconds = getIntervalSeconds(activeInterval);

      const updateTimer = () => {
          const now = Math.floor(Date.now() / 1000);
          const elapsed = now % intervalInSeconds;
          let remaining = intervalInSeconds - elapsed;

          if (remaining <= 0) {
              remaining = intervalInSeconds;
          }

          if (intervalInSeconds >= 86400) {
              const d = Math.floor(remaining / 86400);
              const h = Math.floor((remaining % 86400) / 3600);
              const m = Math.floor((remaining % 3600) / 60);
              setTimeLeft(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
          } else {
              const h = Math.floor(remaining / 3600);
              const m = Math.floor((remaining % 3600) / 60);
              const s = remaining % 60;
              let formatted = "";
              if (h > 0) formatted += `${h.toString().padStart(2, '0')}:`;
              formatted += `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              setTimeLeft(formatted);
          }
      };

      updateTimer();
      const timerId = setInterval(updateTimer, 1000);
      return () => clearInterval(timerId);
  }, [activeInterval]);

  React.useEffect(() => {
      setActiveScripts(prev => {
          const next = pineScriptsContents || [];
          if (prev.length === 0 && next.length === 0) return prev;
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
          return next;
      });
  }, [pineScriptsContents]);

  return (
    <div ref={containerRef} className="flex flex-col relative w-full h-full bg-[#131722] rounded-lg overflow-hidden border border-[#2a2e39]">
      {/* Custom absolute close buttons to overlay on top of TradingView widget so we can close grid items */}
      <div className="absolute top-2 right-2 z-50 flex items-center space-x-1">
         <button 
           onClick={() => containerRef.current?.requestFullscreen()} 
           className="p-1.5 bg-[#2a2e39] text-gray-300 hover:text-white rounded shadow opacity-50 hover:opacity-100 transition-opacity"
           title="Fullscreen"
         >
           <Maximize2 size={14} />
         </button>
         <button 
           onClick={() => onRemove(id)} 
           className="p-1.5 bg-[#2a2e39] text-gray-300 hover:text-red-500 rounded shadow opacity-50 hover:opacity-100 transition-opacity"
           title="Remove Chart"
         >
           <X size={14} />
         </button>
      </div>

      <div className="flex-1 w-full relative">
        {/* Custom Pine Script Overlays */}
        {activeScripts.map((scriptContent, idx) => (
             <div key={idx} className={`absolute top-12 left-2 z-40 bg-[#1e222d] bg-opacity-90 border border-[#2a2e39] rounded shadow-lg p-2 backdrop-blur-sm min-w-[200px] pointer-events-none transition-all duration-300 group ${idx > 0 ? `mt-[${idx * 60}px]` : ''} ${hiddenScriptIndices.includes(idx) ? 'opacity-30' : 'opacity-100'}`}>
                {/* Overlay Component */}
                {!hiddenScriptIndices.includes(idx) && (
                   <PineOverlay
                      scriptContent={scriptContent}
                      symbol={tvSymbol}
                      interval={tvInterval}
                      width={containerRef.current?.clientWidth || 800}
                      height={containerRef.current?.clientHeight || 600}
                   />
                )}
                
                {/* Controller Header inside overlay */}
                <div className="absolute -top-3 left-2 bg-[#2a2e39] px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide text-[#2962ff] pointer-events-auto flex items-center justify-between w-full pr-4 border border-[#363a45]">
                    <span>Custom Indicator {idx + 1}</span>
                    <div className="flex space-x-2 items-center">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const isHidden = hiddenScriptIndices.includes(idx);
                                if (isHidden) {
                                    setHiddenScriptIndices(prev => prev.filter(i => i !== idx));
                                } else {
                                    setHiddenScriptIndices(prev => [...prev, idx]);
                                }
                                markUnsaved();
                            }}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${hiddenScriptIndices.includes(idx) ? 'opacity-100 text-gray-500 hover:text-white' : 'text-gray-400 hover:text-blue-400'}`}
                            title={hiddenScriptIndices.includes(idx) ? "Show Indicator" : "Hide Indicator"}
                        >
                            {hiddenScriptIndices.includes(idx) ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveScripts(prev => prev.filter((_, i) => i !== idx));
                                setHiddenScriptIndices(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
                                markUnsaved();
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
                            title="Remove Indicator"
                        >
                            <X size={10} />
                        </button>
                    </div>
                </div>
            </div>
        ))}

        <AdvancedRealTimeChart
          symbol={tvSymbol}
          interval={tvInterval as any}
          container_id={`tv_chart_${id}_${tvSymbol.replace(/[^a-zA-Z0-9]/g, '_')}`}
          theme="dark"
          style="1"
          autosize
          hide_top_toolbar={false}
          backgroundColor="#131722"
          gridLineColor="#1e222d"
          hide_side_toolbar={false}
          timezone="Etc/UTC"
          studies={pineStudies || []}
        />

        {/* Native TradingView-Style Countdown Timer Overlay */}
        <div className="absolute top-2 right-20 z-50 pointer-events-auto group/timer">
            {/* The Timer Value */}
            <div className="flex items-center space-x-1 bg-[#2962ff] text-white text-[11px] font-mono px-2 py-[3px] rounded opacity-90 shadow border border-transparent tracking-widest cursor-pointer whitespace-nowrap">
                <span>{timeLeft}</span>
            </div>

            {/* Subtle Fallback Interval Menu if Auto-Sync Fails or user wants manual control */}
            <div className="absolute top-full right-0 mt-1 hidden group-hover/timer:flex flex-col bg-[#1e222d] border border-[#363a45] rounded shadow-xl overflow-hidden w-24 z-50">
                <div className="px-2 py-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-gray-500 bg-[#131722] border-b border-[#363a45]">
                    <span>Timer Sync</span>
                    <span className="text-[#2962ff] font-bold">{activeInterval}</span>
                </div>
                <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                    {["1", "3", "5", "15", "30", "60", "240", "D"].map(inv => (
                        <button 
                            key={inv} 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveInterval(inv);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#2962ff] transition-colors ${activeInterval === inv ? 'bg-[#2a2e39] text-[#2962ff] font-bold' : 'text-gray-300'}`}
                        >
                            {inv === "60" ? "1H" : inv === "240" ? "4H" : inv === "D" ? "1D" : `${inv}m`}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

