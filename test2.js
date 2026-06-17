fetch('http://localhost:3000/api/history?symbol=XAUUSD=X&interval=1d&limit=10').then(r=>r.text()).then(r=>console.log(r)).catch(console.error);
