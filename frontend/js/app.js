document.addEventListener('DOMContentLoaded', () => {
    loadMarketOverview();
    loadMovers();
    loadSectors();
    loadPopularStocks();
    setupSearch();
    // Auto-refresh every 2 minutes
    setInterval(() => { loadMarketOverview(); loadMovers(); }, 120000);
});

async function loadMarketOverview() {
    const data = await API.marketOverview();
    const el = document.getElementById('marketOverview');
    if (!data || !data.length) {
        el.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-8">Market data loading...</div>';
        return;
    }
    const icons = { 'NIFTY 50': '🏛️', 'SENSEX': '📊', 'Bank NIFTY': '🏦' };
    const gradients = [
        'from-indigo-500/10 to-purple-500/10 border-indigo-500/20',
        'from-cyan-500/10 to-blue-500/10 border-cyan-500/20',
        'from-amber-500/10 to-orange-500/10 border-amber-500/20',
    ];
    el.innerHTML = data.map((idx, i) => `
        <div class="glass-card p-5 bg-gradient-to-br ${gradients[i] || gradients[0]} fade-in">
            <div class="flex items-center justify-between mb-3">
                <span class="text-2xl">${icons[idx.name] || '📈'}</span>
                <span class="text-xs px-2 py-1 rounded-full ${changeBg(idx.change)}">${formatPercent(idx.changePercent)}</span>
            </div>
            <div class="text-sm text-slate-400 mb-1">${idx.name}</div>
            <div class="text-2xl font-bold font-mono tracking-tight">${Number(idx.price).toLocaleString('en-IN', {maximumFractionDigits: 2})}</div>
            <div class="text-sm font-mono mt-1 ${changeColor(idx.change)}">${idx.change >= 0 ? '+' : ''}${idx.change.toFixed(2)}</div>
        </div>
    `).join('');
}

async function loadMovers() {
    const data = await API.movers();
    if (!data) return;
    renderTable('gainersTable', data.gainers);
    renderTable('losersTable', data.losers);
}

function renderTable(id, stocks) {
    const el = document.getElementById(id);
    if (!stocks || !stocks.length) { el.innerHTML = '<p class="text-sm text-slate-500">No data</p>'; return; }
    el.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Stock</th><th class="hide-mobile">Sector</th><th class="text-right">Price</th><th class="text-right">Change</th></tr></thead>
            <tbody>${stocks.map(s => `
                <tr onclick="navigateToStock('${s.symbol}')">
                    <td>
                        <div class="font-semibold text-sm">${s.name}</div>
                        <div class="text-xs text-slate-500 font-mono">${s.symbol.replace('.NS','')}</div>
                    </td>
                    <td class="text-xs text-slate-500 hide-mobile">${s.sector}</td>
                    <td class="text-right font-mono text-sm">${formatCurrency(s.price)}</td>
                    <td class="text-right">
                        <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold font-mono ${changeBg(s.changePercent)}">
                            ${formatPercent(s.changePercent)}
                        </span>
                    </td>
                </tr>
            `).join('')}</tbody>
        </table>`;
}

async function loadSectors() {
    const data = await API.sectors();
    const el = document.getElementById('sectorGrid');
    if (!data || !data.length) { el.innerHTML = '<p class="text-sm text-slate-500 col-span-4">Loading sectors...</p>'; return; }
    const maxPerf = Math.max(...data.map(s => Math.abs(s.performance)), 1);
    el.innerHTML = data.map(s => {
        const width = Math.min(Math.abs(s.performance) / maxPerf * 100, 100);
        const color = s.performance >= 0 ? '#22c55e' : '#ef4444';
        return `
        <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition cursor-default">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-slate-300">${s.sector}</span>
                <span class="text-xs font-mono font-semibold ${changeColor(s.performance)}">${formatPercent(s.performance)}</span>
            </div>
            <div class="sector-bar">
                <div class="sector-bar-fill" style="width:${width}%; background:${color}"></div>
            </div>
            <div class="text-[10px] text-slate-600 mt-1">${s.stockCount} stocks</div>
        </div>`;
    }).join('');
}

function loadPopularStocks() {
    const popular = [
        { symbol: 'RELIANCE.NS', name: 'Reliance', icon: '⛽' },
        { symbol: 'TCS.NS', name: 'TCS', icon: '💻' },
        { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', icon: '🏦' },
        { symbol: 'INFY.NS', name: 'Infosys', icon: '🖥️' },
        { symbol: 'SBIN.NS', name: 'SBI', icon: '🏛️' },
        { symbol: 'ITC.NS', name: 'ITC', icon: '🍃' },
        { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', icon: '🚗' },
        { symbol: 'BHARTIARTL.NS', name: 'Airtel', icon: '📡' },
        { symbol: 'TITAN.NS', name: 'Titan', icon: '⌚' },
        { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', icon: '💊' },
    ];
    const el = document.getElementById('popularStocks');
    el.innerHTML = popular.map(s => `
        <div onclick="navigateToStock('${s.symbol}')"
            class="glass-card p-4 cursor-pointer group text-center">
            <div class="text-2xl mb-2">${s.icon}</div>
            <div class="text-sm font-semibold text-slate-300 group-hover:text-indigo-400 transition">${s.name}</div>
            <div class="text-[10px] text-slate-600 font-mono">${s.symbol.replace('.NS','')}</div>
        </div>
    `).join('');
}

// ─── Search ───
let searchTimeout;
function setupSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const q = e.target.value.trim();
        if (q.length < 2) { results.classList.add('hidden'); return; }
        searchTimeout = setTimeout(async () => {
            const data = await API.search(q);
            if (!data || !data.length) { results.innerHTML = '<div class="p-3 text-sm text-slate-500">No results</div>'; results.classList.remove('hidden'); return; }
            results.innerHTML = data.map(s => `
                <div class="search-item" onclick="navigateToStock('${s.symbol}')">
                    <div>
                        <div class="text-sm font-medium text-slate-200">${s.name}</div>
                        <div class="text-xs text-slate-500 font-mono">${s.symbol}</div>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-slate-400">${s.sector}</span>
                </div>
            `).join('');
            results.classList.remove('hidden');
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('searchBox').contains(e.target)) results.classList.add('hidden');
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') results.classList.add('hidden');
    });
}
