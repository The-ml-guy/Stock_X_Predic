/**
 * API client for Stock_X Institutional Terminal
 */
const API = {
    base: window.STOCK_X_API_URL || localStorage.getItem('stock_x_api') || '',
    
    setBase(url) {
        this.base = (url || '').trim().replace(/\/$/, '');
        if (this.base) {
            localStorage.setItem('stock_x_api', this.base);
        } else {
            localStorage.removeItem('stock_x_api');
        }
    },

    async get(path) {
        try {
            const url = this.base ? `${this.base}${path}` : path;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`API Error [${path}]:`, e);
            return null;
        }
    },
    
    // Core stock APIs
    search: (q) => API.get(`/api/stocks/search?q=${encodeURIComponent(q)}`),
    quote: (sym) => API.get(`/api/stocks/${encodeURIComponent(sym)}/quote`),
    history: (sym, period='1y', interval='1d') => API.get(`/api/stocks/${encodeURIComponent(sym)}/history?period=${period}&interval=${interval}`),
    indicators: (sym, period='1y') => API.get(`/api/stocks/${encodeURIComponent(sym)}/indicators?period=${period}`),
    signals: (sym, interval='1d') => API.get(`/api/stocks/${encodeURIComponent(sym)}/signals?interval=${interval}`),
    
    // Smart Money Concepts & Order Blocks
    orderblocks: (sym, lookback=120, interval='1d') => API.get(`/api/stocks/${encodeURIComponent(sym)}/orderblocks?lookback=${lookback}&interval=${interval}`),
    
    // Amazon Chronos Zero-Shot Probabilistic Forecaster
    chronosForecast: (sym, horizon=10, interval='1d') => API.get(`/api/stocks/${encodeURIComponent(sym)}/chronos-forecast?horizon=${horizon}&interval=${interval}`),
    
    // Unified Terminal Master Endpoint
    terminalMaster: (sym, horizon=10, interval='1d') => API.get(`/api/terminal/master/${encodeURIComponent(sym)}?horizon=${horizon}&interval=${interval}`),
    
    // Walk-Forward Quantitative ML Engine
    mlForecast: (sym, interval='15m', horizon=3, threshold=0.0030) => API.get(`/api/stocks/${encodeURIComponent(sym)}/ml-forecast?interval=${interval}&horizon=${horizon}&threshold=${threshold}`),
    
    // VectorBT Quantitative Backtesting Engine
    backtest: (sym, strategy='ob_retest', interval='1d', rr=2.0, sl=1.2) => API.get(`/api/stocks/${encodeURIComponent(sym)}/backtest?strategy=${strategy}&interval=${interval}&risk_reward=${rr}&stop_loss=${sl}`),
    
    // Industry Intelligence (AI, Chips, Solar)
    industryOverview: () => API.get('/api/industry/overview'),
    industryNews: (sectorId, limit=15) => API.get(`/api/industry/${encodeURIComponent(sectorId)}/news?limit=${limit}`),
    
    // Local AI Model Status & Analysis
    llmStatus: () => API.get('/api/llm/status'),
    analysis: (sym) => API.get(`/api/stocks/${encodeURIComponent(sym)}/analysis`),
    
    // Market Macro
    marketOverview: () => API.get('/api/market/overview'),
    movers: () => API.get('/api/market/movers'),
    sectors: () => API.get('/api/market/sectors'),
    news: (sym) => API.get(`/api/stocks/${encodeURIComponent(sym)}/news`),
    
    async compare(symbols, dates) {
        try {
            const res = await fetch(this.base + '/api/stocks/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbols, dates })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`API Error [/api/stocks/compare]:`, e);
            return null;
        }
    }
};

function formatCurrency(n, sym = '') {
    if (n == null || isNaN(n)) return '—';
    const s = String(sym || '');
    const isUSD = s.endsWith('-USD') || s.includes('=F') || s.startsWith('^') || s.includes('XAU') || s.includes('XAG');
    const sign = isUSD ? '$' : '₹';
    const locale = isUSD ? 'en-US' : 'en-IN';
    const decimals = Number(n) < 1 && Number(n) > 0 ? 4 : 2;
    return sign + Number(n).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatLargeNumber(n) {
    if (!n) return '—';
    if (n >= 1e12) return '₹' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '₹' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L';
    return '₹' + n.toLocaleString('en-IN');
}

function formatPercent(n) {
    if (n == null || isNaN(n)) return '—';
    const sign = n >= 0 ? '+' : '';
    return sign + Number(n).toFixed(2) + '%';
}

function changeColor(n) {
    if (n > 0) return 'text-emerald-400';
    if (n < 0) return 'text-rose-400';
    return 'text-slate-400';
}

function changeBg(n) {
    if (n > 0) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (n < 0) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

function navigateToStock(symbol) {
    window.location.href = `/?symbol=${encodeURIComponent(symbol)}`;
}
