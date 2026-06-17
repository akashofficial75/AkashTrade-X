const express = require('express');
const fetch = require('node-fetch');
// just copy the logic from server.ts and trace where it fails
async function test() {
   const symbol = 'XAUUSD=X';
   const interval = '1d';
   const yahooIntervalMap = {
     '1m': '1m', '3m': '2m', '5m': '5m', '15m': '15m', '30m': '30m',
     '1h': '60m', '4h': '60m', '1d': '1d', '1w': '1wk', '1M': '1mo'
   };
   const yInterval = yahooIntervalMap[interval] || '1d';
   let range = '2y';
   const yahooSymbolMap = {
     'XAUUSD=X': 'GC=F',
     'XAGUSD=X': 'SI=F',
   };
   const ySymbol = yahooSymbolMap[symbol] || symbol;

   const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?interval=${yInterval}&range=${range}`;
   console.log(url);
   const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
   const yData = await response.json();
   console.log(yData?.chart?.result?.length);
   if (yData.chart?.result?.length > 0) {
      console.log('Got data');
   } else {
      console.log('Error', JSON.stringify(yData));
   }
}
test();
