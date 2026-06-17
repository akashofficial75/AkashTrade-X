import React, { useState, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { ChartGrid, LayoutType } from './components/ChartGrid';

// Suppress benign TradingView cross-origin script error on fast remounts
if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
        if (message === 'Script error.') {
            return true;
        }
        if (originalOnError) {
            return originalOnError(message, source, lineno, colno, error);
        }
        return false;
    };
}
import { MarketsDropdown } from './components/MarketsDropdown';
import { PineEditor } from './components/PineEditor';
import { compilePineScript } from './lib/pineParser';
import { LayoutGrid, AppWindow, Monitor, Code } from 'lucide-react';
import { LayoutSaveProvider, useLayoutSave } from './contexts/LayoutSaveContext';
import appLogo from './assets/images/akash_trade_logo_1781250322958.jpg';

type PineMode = 'normal' | 'maximized' | 'fullscreen';

function AppContent() {
  const [layout, setLayout] = useState<LayoutType>(4);
  const [showPineEditor, setShowPineEditor] = useState(false);
  const [pineMode, setPineMode] = useState<PineMode>('normal');
  const [pineSize, setPineSize] = useState({ width: '100%', height: '300px' });
  const { markUnsaved, currentLayoutName } = useLayoutSave();

  // Load saved App state per layout
  useEffect(() => {
     try {
         const savedState = localStorage.getItem(`app_state_${currentLayoutName}`);
         if (savedState) {
             const parsed = JSON.parse(savedState);
             if (parsed.layout) setLayout(parsed.layout);
             if (parsed.pineSize) setPineSize(parsed.pineSize);
         }
     } catch(e) {}
  }, [currentLayoutName]);

  // Handle explicit save request
  useEffect(() => {
     const handleSave = (e: Event) => {
         const customEvent = e as CustomEvent<{ layoutName: string }>;
         const name = customEvent.detail.layoutName;
         localStorage.setItem(`app_state_${name}`, JSON.stringify({
             layout,
             pineSize
         }));
     };
     window.addEventListener('app-request-save', handleSave);
     return () => window.removeEventListener('app-request-save', handleSave);
  }, [layout, pineSize]);

  const savePineSize = (size: { width: string | number; height: string | number }) => {
      setPineSize(size as any);
      markUnsaved();
  };

  const handleApplyPine = (script: string) => {
      const { studies } = compilePineScript(script);
      window.dispatchEvent(new CustomEvent('apply-pine', { detail: { studies, script } }));
      markUnsaved();
  };

  const LayoutSelector = () => (
    <div className="flex items-center space-x-1 bg-[#1e222d] p-1 rounded-md border border-[#2a2e39]">
       {[1, 2, 4, 6, 8].map((l) => (
         <button
           key={l}
           onClick={() => {
               setLayout(l as LayoutType);
               markUnsaved();
           }}
           className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
             layout === l 
               ? 'bg-blue-600 text-white' 
               : 'text-gray-400 hover:text-white hover:bg-[#2a2e39]'
           }`}
         >
           {l}
         </button>
       ))}
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-white overflow-hidden font-sans">
       {/* Top Navigation Bar */}
       <header className="h-14 flex items-center justify-between px-4 border-b border-[#2a2e39] bg-[#131722] shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded shrink-0 overflow-hidden border border-[#2a2e39] bg-black">
              <img src={appLogo} alt="AkashTrade X Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AkashTrade X
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
             <button 
                onClick={() => setShowPineEditor(!showPineEditor)}
                className={`flex items-center space-x-2 text-xs transition-colors px-3 py-1.5 rounded-md border ${
                   showPineEditor 
                     ? 'bg-blue-600 border-blue-500 text-white' 
                     : 'bg-[#1e222d] border-[#2a2e39] text-gray-400 hover:text-white'
                }`}
             >
                <Code size={14} />
                <span className="font-bold tracking-wide">Pine Editor</span>
             </button>

             <div className="flex items-center space-x-2 mr-4">
               <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Layout</span>
               <LayoutSelector />
             </div>
             
             <MarketsDropdown />
             
             <button className="flex items-center space-x-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#1e222d] px-3 py-1.5 rounded-md border border-[#2a2e39]">
               <Monitor size={14} />
               <span>Workspace</span>
             </button>
             <div 
               className="w-9 h-9 rounded bg-gradient-to-br from-[#121826] to-[#0a0e17] border border-[#d4af37]/30 shadow-[0_0_12px_rgba(212,175,55,0.15)] cursor-pointer flex items-center justify-center select-none hover:border-[#d4af37]/60 hover:shadow-[0_0_16px_rgba(212,175,55,0.25)] transition-all duration-300 relative group overflow-hidden"
               title="AkashTrade X"
             >
               {/* Shine effect */}
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#f3e5ab]/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
               
               <span className="font-sans font-black text-sm tracking-[0.08em] bg-gradient-to-b from-[#f3e5ab] via-[#d4af37] to-[#aa8022] bg-clip-text text-transparent transform scale-y-110">
                 ATX
               </span>
             </div>
          </div>
       </header>

       {/* Main Content Area */}
       <div className="flex flex-1 overflow-hidden relative flex-col items-center">
          
          <main className="w-full flex-1 bg-[#0b0e14] overflow-hidden min-h-0">
            <ChartGrid layout={layout} />
          </main>
          
          {showPineEditor && pineMode !== 'fullscreen' && (
             <Resizable
                size={pineMode === 'maximized' ? { width: '100%', height: '100%' } : pineSize}
                onResizeStop={(e, direction, ref, d) => {
                    savePineSize({ 
                        width: ref.style.width, 
                        height: ref.style.height
                    });
                }}
                minHeight={60}
                minWidth={300}
                enable={pineMode === 'maximized' ? {} : { 
                    top: true, right: true, bottom: false, left: true, 
                    topRight: true, bottomRight: false, bottomLeft: false, topLeft: true 
                }}
                className={`border-t border-[#2a2e39] flex flex-col bg-[#0b0e14] z-40 shadow-2xl ${pineMode === 'maximized' ? 'absolute bottom-0 inset-0 !h-full w-full' : 'relative'}`}
                style={{ position: pineMode === 'maximized' ? 'absolute' : 'relative' }}
                handleStyles={{
                    top: { height: '8px', top: '-4px', cursor: 'row-resize' },
                    left: { width: '8px', left: '-4px', cursor: 'col-resize' },
                    right: { width: '8px', right: '-4px', cursor: 'col-resize' },
                    topLeft: { width: '12px', height: '12px', left: '-6px', top: '-6px', cursor: 'nw-resize' },
                    topRight: { width: '12px', height: '12px', right: '-6px', top: '-6px', cursor: 'ne-resize' },
                }}
             >
                {pineMode !== 'maximized' && (
                    <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-16 h-1 bg-gray-500 rounded-full shrink-0 z-50 pointer-events-none opacity-40 hover:opacity-100 transition-opacity"></div>
                )}
                <PineEditor 
                    onClose={() => setShowPineEditor(false)} 
                    onApply={handleApplyPine} 
                    mode={pineMode}
                    onToggleMaximize={() => setPineMode(m => m === 'maximized' ? 'normal' : 'maximized')}
                    onToggleFullscreen={() => setPineMode('fullscreen')}
                    onToggleMinimize={() => setShowPineEditor(false)}
                />
             </Resizable>
          )}

          {/* Fullscreen Overlay */}
          {showPineEditor && pineMode === 'fullscreen' && (
             <div className="fixed inset-0 z-[9999] bg-[#0b0e14] flex flex-col pt-[1px]">
                 <PineEditor 
                    onClose={() => { setShowPineEditor(false); setPineMode('normal'); }} 
                    onApply={handleApplyPine} 
                    mode={pineMode}
                    onToggleMaximize={() => setPineMode('maximized')}
                    onToggleFullscreen={() => setPineMode('normal')}
                    onToggleMinimize={() => { setShowPineEditor(false); setPineMode('normal'); }}
                />
             </div>
          )}
       </div>

        <div className="absolute bottom-1 right-3 text-[10px] text-gray-500/70 pointer-events-none z-50 font-medium tracking-wider">
            Developed by AkashProg
        </div>
    </div>
  );
}

export default function App() {
  return (
    <LayoutSaveProvider>
      <AppContent />
    </LayoutSaveProvider>
  );
}