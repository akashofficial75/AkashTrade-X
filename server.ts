import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Data endpoints proxying to avoid CORS issues for clients
  app.get("/api/history", async (req, res) => {
    try {
      const { symbol, interval, limit } = req.query as { symbol: string, interval: string, limit: string };
      
      let mappedSymbol = symbol.toUpperCase();
      let useFuturesAPI = false;
      if (mappedSymbol === 'XAUUSD=X' || mappedSymbol === 'XAUUSD') {
        mappedSymbol = 'XAUUSDT';
        useFuturesAPI = true;
      } else if (mappedSymbol === 'XAGUSD=X' || mappedSymbol === 'XAGUSD') {
        mappedSymbol = 'XAGUSDT';
        useFuturesAPI = true;
      }
      const isCrypto = mappedSymbol.endsWith('USDT') && !mappedSymbol.includes('=');
      
      if (isCrypto) {
        let bInterval = interval;
        if (interval === '3m') bInterval = '3m'; 
        if (interval === '1M') bInterval = '1M';
        
        let url;
        if (useFuturesAPI) {
           url = `https://fapi.binance.com/fapi/v1/klines?symbol=${mappedSymbol}&interval=${bInterval}&limit=${limit || 1000}`;
        } else {
           url = `https://api.binance.com/api/v3/klines?symbol=${mappedSymbol}&interval=${bInterval}&limit=${limit || 1000}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const mappedData = data.map((d: any) => ({
            time: d[0] / 1000, 
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5]),
          }));
          res.json(mappedData);
        } else {
          res.status(400).json({ error: "Invalid data format from Binance" });
        }
      } else {
        // Yahoo Finance fallback
        const yahooIntervalMap: Record<string, string> = {
          '1m': '1m', '3m': '2m', '5m': '5m', '15m': '15m', '30m': '30m',
          '1h': '60m', '4h': '60m', '1d': '1d', '1w': '1wk', '1M': '1mo'
        };
        const yInterval = yahooIntervalMap[interval] || '1d';
        
        let range = '1y';
        if (['1m', '3m', '5m'].includes(interval)) range = '5d';
        if (['15m', '30m', '1h', '4h'].includes(interval)) range = '1mo';
        if (interval === '1d') range = '2y';
        if (['1w', '1M'].includes(interval)) range = '10y';

        const yahooSymbolMap: Record<string, string> = {
          'XAUUSD=X': 'GC=F',
          'XAGUSD=X': 'SI=F',
        };
        const ySymbol = yahooSymbolMap[symbol] || symbol;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?interval=${yInterval}&range=${range}`;

        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const yData = await response.json();
        
        console.log(`[SYS] req.query.symbol="${symbol}", mapped="${ySymbol}", url="${url}", yData.error=${JSON.stringify(yData.error)}`);

        if (yData.chart?.result?.length > 0) {
          const result = yData.chart.result[0];
          const timestamps = result.timestamp || [];
          const quote = result.indicators.quote[0];
          
          let mappedData = [];
           for (let i = 0; i < timestamps.length; i++) {
               if (quote.close[i] !== null && quote.close[i] !== undefined) {
                   mappedData.push({
                       time: timestamps[i],
                       open: quote.open[i],
                       high: quote.high[i],
                       low: quote.low[i],
                       close: quote.close[i],
                       volume: quote.volume[i] || 0
                   });
               }
           }
           res.json(mappedData);
        } else {
           res.status(400).json({ error: "Invalid data format from Yahoo" });
        }
      }
    } catch (error) {
      console.error("Error fetching historic data:", error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Watchlist ticker data
  app.get("/api/ticker24hr", async (req, res) => {
    try {
      const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching ticker data:", error);
      res.status(500).json({ error: "Failed to fetch ticker data" });
    }
  });

  // Yahoo Quotes
  app.get("/api/quotes", async (req, res) => {
    try {
      const { symbols } = req.query as { symbols: string };
      const yahooSymbolMap: Record<string, string> = {
          'XAUUSD=X': 'GC=F',
          'XAGUSD=X': 'SI=F',
      };
      
      const mappedSymbols = symbols.split(',').map(s => yahooSymbolMap[s] || s).join(',');

      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${mappedSymbols}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await response.json();
      
      const reverseMap: Record<string, string> = {
          'GC=F': 'XAUUSD=X',
          'SI=F': 'XAGUSD=X',
      };
      if (data.quoteResponse?.result) {
         const quotes = data.quoteResponse.result.map((q: any) => ({
             symbol: reverseMap[q.symbol] || q.symbol,
             lastPrice: q.regularMarketPrice,
             priceChangePercent: q.regularMarketChangePercent,
             volume: q.regularMarketVolume
         }));
         res.json(quotes);
      } else {
         res.json([]);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
