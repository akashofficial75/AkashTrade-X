import React, { useState, useEffect, useRef } from "react";
import { TradingChart } from "./TradingChart";
import { Plus } from "lucide-react";
import { useLayoutSave } from "../contexts/LayoutSaveContext";

import { ErrorBoundary } from "./ErrorBoundary";

export type LayoutType = 1 | 2 | 4 | 6 | 8;

interface ChartConfig {
  id: string;
  symbol: string;
  pineStudies?: string[];
  pineScriptsContents?: string[];
}

interface ChartGridProps {
  layout: LayoutType;
}

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "XAUUSD=X", "XAGUSD=X", "AAPL", "EURUSD=X", "SOLUSDT", "CL=F"];

export const ChartGrid: React.FC<ChartGridProps> = ({ layout }) => {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [pineStudies, setPineStudies] = useState<string[]>([]);
  const { markUnsaved, currentLayoutName } = useLayoutSave();
  const initRef = useRef(false);

  useEffect(() => {
     // Load from local storage or set defaults based on layout
     try {
       const saved = localStorage.getItem(`trading_layout_config_${currentLayoutName}`);
       if (saved) {
         const parsed = JSON.parse(saved).map((c: any) => ({
             id: c.id,
             symbol: c.symbol,
             pineStudies: c.pineStudies,
             pineScriptsContents: c.pineScriptsContents
         }));
         setCharts(parsed.slice(0, layout));
       } else {
         const initial = Array.from({ length: layout }).map((_, i) => ({
           id: `chart-${Date.now()}-${i}`,
           symbol: DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length]
         }));
         setCharts(initial);
       }
     } catch (e) {
        console.error("Failed to parse layout config", e);
     }
  }, [currentLayoutName]);

  // Update layout count change
  useEffect(() => {
    setCharts(prev => {
        if (prev.length === 0) return prev; // Skip initial render
        if (prev.length < layout) {
           const toAdd = layout - prev.length;
           const newCharts = Array.from({ length: toAdd }).map((_, i) => ({
               id: `chart-${Date.now()}-${i}`,
               symbol: DEFAULT_SYMBOLS[Math.floor(Math.random() * DEFAULT_SYMBOLS.length)]
           }));
           return [...prev, ...newCharts];
        } else if (prev.length > layout) {
           return prev.slice(0, layout);
        }
        return prev;
    });
  }, [layout]);

  // Mark unsaved on change
  useEffect(() => {
     if (charts.length > 0) {
       if (initRef.current) {
           markUnsaved();
       } else {
           initRef.current = true;
       }
     }
  }, [charts, markUnsaved]);

  // Handle explicit save request
  useEffect(() => {
     const handleSave = (e: Event) => {
         const customEvent = e as CustomEvent<{ layoutName: string }>;
         const name = customEvent.detail.layoutName;
         if (charts.length > 0) {
             const toSave = charts.map(c => ({
                 id: c.id,
                 symbol: c.symbol,
                 pineStudies: c.pineStudies,
                 pineScriptsContents: c.pineScriptsContents
             }));
             localStorage.setItem(`trading_layout_config_${name}`, JSON.stringify(toSave));
         }
     };
     window.addEventListener('app-request-save', handleSave);
     return () => window.removeEventListener('app-request-save', handleSave);
  }, [charts]);

  useEffect(() => {
     const handleOpenChart = (e: Event) => {
        const customEvent = e as CustomEvent<{ symbol: string }>;
        const symbol = customEvent.detail.symbol;

        setCharts(prev => {
            if (prev.length === 0) return [{ id: `chart-${Date.now()}`, symbol }];
            // Update the first chart with the new symbol WITHOUT changing ID
            const next = [...prev];
            next[0] = { ...next[0], symbol }; 
            return next;
        });
     };

     const handleApplyPine = (e: Event) => {
        const customEvent = e as CustomEvent<{ studies: string[], script: string }>;
        const newStudies = customEvent.detail.studies;
        const newScript = customEvent.detail.script;
        
        setPineStudies(prev => [...new Set([...prev, ...newStudies])]);
        
        // Force remount of charts to apply new studies
        setCharts(prev => prev.map(c => ({ 
            ...c, 
            id: `chart-${Date.now()}-${Math.random()}`,
            pineStudies: [...new Set([...(c.pineStudies || []), ...newStudies])],
            pineScriptsContents: [...(c.pineScriptsContents || []), newScript]
        })));
     };

     window.addEventListener('open-chart', handleOpenChart);
     window.addEventListener('apply-pine', handleApplyPine);
     return () => {
         window.removeEventListener('open-chart', handleOpenChart);
         window.removeEventListener('apply-pine', handleApplyPine);
     };
  }, []);

  const removeChart = (id: string) => {
     setCharts(prev => {
         const newCharts = prev.filter(c => c.id !== id);
         if (newCharts.length === 0) {
             return [{ id: `chart-${Date.now()}`, symbol: "BTCUSDT" }];
         }
         return newCharts;
     });
  };

  const getGridClasses = () => {
    switch (layout) {
      case 1: return "grid-cols-1 grid-rows-1";
      case 2: return "grid-cols-2 grid-rows-1";
      case 4: return "grid-cols-2 grid-rows-2";
      case 6: return "grid-cols-3 grid-rows-2";
      case 8: return "grid-cols-4 grid-rows-2";
      default: return "grid-cols-1";
    }
  };

  return (
    <div className={`grid gap-2 p-2 w-full h-full ${getGridClasses()}`} style={{ minHeight: "calc(100vh - 64px)" }}>
       {charts.map((chart) => (
         <ErrorBoundary key={chart.id}>
           <TradingChart 
             id={chart.id} 
             initialSymbol={chart.symbol} 
             pineStudies={chart.pineStudies || pineStudies}
             pineScriptsContents={chart.pineScriptsContents}
             onRemove={removeChart}
           />
         </ErrorBoundary>
       ))}
       {charts.length < layout && (
         <div 
           onClick={() => {
              setCharts(prev => [...prev, { id: `chart-${Date.now()}`, symbol: "ETHUSDT" }]);
           }}
           className="flex items-center justify-center border-2 border-dashed border-[#2a2e39] rounded-lg bg-[#131722] text-gray-500 hover:text-white hover:border-gray-500 cursor-pointer transition-colors"
         >
            <Plus size={48} opacity={0.5} />
         </div>
       )}
    </div>
  );
};
