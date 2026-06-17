const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
    <div id="chart"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
    <script type="text/javascript">
      window.widgetInstance = new TradingView.widget({
        "autosize": true,
        "symbol": "NASDAQ:AAPL",
        "container_id": "chart",
        "enabled_features": ["header_undo_redo", "items_favoriting"]
      });
      console.log("Widget Created");
    </script>
    </body>
    </html>
  `);
  
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
