import React, { useState, useEffect, useRef } from 'react';
import { Star, ChevronDown, List as ListIcon } from 'lucide-react';
import { useLayoutSave } from '../contexts/LayoutSaveContext';

export const ALL_MARKETS = [
  // Crypto
  { symbol: "BTCUSD", name: "Bitcoin / USD", type: "Crypto" },
  { symbol: "BTCUSDT", name: "Bitcoin / USDT", type: "Crypto" },
  { symbol: "ETHUSDT", name: "Ethereum / USDT", type: "Crypto" },
  { symbol: "SOLUSDT", name: "Solana / USDT", type: "Crypto" },
  { symbol: "BNBUSDT", name: "Binance Coin / USDT", type: "Crypto" },
  { symbol: "XRPUSDT", name: "Ripple / USDT", type: "Crypto" },
  { symbol: "ADAUSDT", name: "Cardano / USDT", type: "Crypto" },
  
  // Forex
  { symbol: "EURUSD", name: "EUR/USD", type: "Forex" },
  { symbol: "GBPUSD", name: "GBP/USD", type: "Forex" },
  { symbol: "USDJPY", name: "USD/JPY", type: "Forex" },
  { symbol: "AUDUSD", name: "AUD/USD", type: "Forex" },

  // Commodities
  { symbol: "XAUUSD", name: "Gold", type: "Commodity" },
  { symbol: "XAGUSD", name: "Silver", type: "Commodity" },
  { symbol: "CL=F", name: "Crude Oil", type: "Commodity" },
  { symbol: "NG=F", name: "Natural Gas", type: "Commodity" },

  // Stocks & Indices
  { symbol: "AAPL", name: "Apple", type: "Stock" },
  { symbol: "MSFT", name: "Microsoft", type: "Stock" },
  { symbol: "TSLA", name: "Tesla", type: "Stock" },
  { symbol: "NVDA", name: "Nvidia", type: "Stock" },
  { symbol: "^GSPC", name: "S&P 500", type: "Index" },
  { symbol: "^IXIC", name: "NASDAQ", type: "Index" },
];

export const MarketsDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const { markUnsaved, currentLayoutName } = useLayoutSave();

    useEffect(() => {
        try {
            const saved = localStorage.getItem(`favorite_markets_${currentLayoutName}`);
            if (saved) {
                setFavorites(JSON.parse(saved));
            } else {
                setFavorites([]); // Clear when switching to layout without favorites
            }
        } catch(e) {}
    }, [currentLayoutName]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle explicit save request
    useEffect(() => {
        const handleSave = (e: Event) => {
            const customEvent = e as CustomEvent<{ layoutName: string }>;
            const name = customEvent.detail.layoutName;
            localStorage.setItem(`favorite_markets_${name}`, JSON.stringify(favorites));
        };
        window.addEventListener('app-request-save', handleSave);
        return () => window.removeEventListener('app-request-save', handleSave);
    }, [favorites]);

    const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
        e.stopPropagation();
        setFavorites(prev => {
            const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
            markUnsaved();
            return next;
        });
    };

    const handleSelect = (symbol: string) => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('open-chart', { detail: { symbol } }));
    };

    const favMarkets = ALL_MARKETS.filter(m => favorites.includes(m.symbol));
    const otherMarkets = ALL_MARKETS.filter(m => !favorites.includes(m.symbol));

    return (
        <div ref={containerRef} className="relative z-50">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 text-xs text-gray-300 hover:text-white transition-colors bg-[#1e222d] hover:bg-[#2a2e39] px-3 py-1.5 rounded-md border border-[#2a2e39]"
            >
                <ListIcon size={14} />
                <span className="font-bold tracking-wide">Markets</span>
                <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-64 max-h-[80vh] overflow-y-auto bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl outline-none custom-scrollbar right-0 sm:right-auto sm:left-0">
                    
                    {favMarkets.length > 0 && (
                        <div className="py-2">
                            <div className="px-3 pb-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Favorites</div>
                            {favMarkets.map(market => (
                                <div 
                                    key={`fav-${market.symbol}`}
                                    onClick={() => handleSelect(market.symbol)}
                                    className="flex items-center px-3 py-2 hover:bg-[#2a2e39] cursor-pointer group"
                                >
                                    <div 
                                        className="mr-3 cursor-pointer"
                                        onClick={(e) => toggleFavorite(e, market.symbol)}
                                    >
                                        <Star size={14} className="fill-yellow-500 text-yellow-500 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-gray-200">{market.symbol}</div>
                                        <div className="text-[10px] text-gray-500">{market.name}</div>
                                    </div>
                                </div>
                            ))}
                            <div className="mx-3 mt-2 h-px bg-[#2a2e39]"></div>
                        </div>
                    )}

                    <div className="py-2">
                        <div className="px-3 pb-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">All Markets</div>
                        {otherMarkets.map(market => (
                            <div 
                                key={`all-${market.symbol}`}
                                onClick={() => handleSelect(market.symbol)}
                                className="flex items-center px-3 py-2 hover:bg-[#2a2e39] cursor-pointer group"
                            >
                                <div 
                                    className="mr-3 cursor-pointer opacity-50 group-hover:opacity-100"
                                    onClick={(e) => toggleFavorite(e, market.symbol)}
                                >
                                    <Star size={14} className="text-gray-500 hover:text-yellow-500 transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{market.symbol}</div>
                                    <div className="text-[10px] text-gray-500">{market.name}</div>
                                </div>
                                <div className="text-[9px] px-1.5 py-0.5 rounded bg-[#131722] text-gray-500 font-medium">
                                    {market.type}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1e222d;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #363a45;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #4b4f5a;
                }
            `}</style>
        </div>
    );
};
