// Apply the saved colour theme before the page paints (loaded synchronously in <head>).
try { const t = localStorage.getItem('si-theme'); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); } catch (e) { /* storage unavailable */ }
