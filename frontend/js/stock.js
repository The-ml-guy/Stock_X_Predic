let currentSymbol = '';
let currentChartType = 'candlestick';
let currentHistoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentSymbol = params.get('symbol');
    if (!currentSymbol) { window.location.href = '/'; return; }

    document.title = `${currentSymbol.replace('.NS','').replace('.BO','')} — Stock_X`;
    loadAll();
    setupControls();
    setupSearch();
});

async function loadAll() {
    loadQuote();
    loadChart('1mo', '1d');
    loadIndicators();
    loadAnalysis();
    loadNews();
}

async function loadQuote() {
    const q = await API.quote(currentSymbol);
    const el = document.getElementById('stockHeader');
    if (!q) { el.innerHTML = '<h1 class="text-2xl font-bold text-red-400">Failed to load stock data</h1>'; return; }
    el.innerHTML = `
        <div class="fade-in">
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl sm:text-3xl font-bold text-white">${q.name}</h1>
                <span class="text-sm font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded">${q.symbol}</span>
                ${q.sector ? `<span class="text-xs text-slate-500">${q.sector}</span>` : ''}
            </div>
            <div class="flex items-baseline gap-3 flex-wrap">
                <span class="text-3xl font-bold font-mono">${formatCurrency(q.price)}</span>
                <span class="text-lg font-semibold font-mono ${changeColor(q.change)}">${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}</span>
                <span class="px-2 py-0.5 rounded-lg text-sm font-semibold ${changeBg(q.changePercent)}">
                    ${formatPercent(q.changePercent)}
                </span>
            </div>
        </div>`;
    document.title = `${q.name} ${formatCurrency(q.price)} — Stock_X`;
}

async function loadChart(period, interval) {
    document.getElementById('priceChart').innerHTML = '<div class="flex items-center justify-center h-full"><div class="spinner"></div></div>';
    const data = await API.history(currentSymbol, period, interval);
    if (!data || !data.length) {
        document.getElementById('priceChart').innerHTML = '<div class="flex items-center justify-center h-full text-slate-500">No chart data available</div>';
        return;
    }
    currentHistoryData = data;
    Charts.createPriceChart('priceChart', data, currentChartType);
}

async function loadIndicators() {
    const data = await API.indicators(currentSymbol, '1y');
    if (!data) return;
    Charts.createRSIChart('rsiChart', data.dates, data.rsi);
    Charts.createMACDChart('macdChart', data.dates, data.macd, data.macdSignal, data.macdHistogram);
}

async function loadAnalysis() {
    const el = document.getElementById('aiInsights');
    const data = await API.analysis(currentSymbol);
    if (!data) { el.innerHTML = '<p class="text-slate-500">Analysis unavailable</p>'; return; }

    const signalClass = data.signal === 'BUY' ? 'badge-buy' : data.signal === 'SELL' ? 'badge-sell' : 'badge-hold';
    const trendIcon = data.trend === 'BULLISH' ? '📈' : data.trend === 'BEARISH' ? '📉' : '➡️';

    el.innerHTML = `
        <div class="fade-in space-y-4">
            <!-- Signal & Confidence -->
            <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-3">
                    <span class="px-4 py-2 rounded-xl text-lg font-bold ${signalClass}">${data.signal}</span>
                    <div>
                        <div class="text-xs text-slate-500">Confidence</div>
                        <div class="text-xl font-bold font-mono">${data.confidence}%</div>
                    </div>
                </div>
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span>${trendIcon}</span>
                    <span class="text-sm font-semibold">${data.trend}</span>
                </div>
                <div class="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span class="text-xs text-slate-500">Risk:</span>
                    <span class="text-sm font-semibold ml-1 ${data.riskLevel === 'HIGH' ? 'text-red-400' : data.riskLevel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}">${data.riskLevel}</span>
                </div>
            </div>

            <!-- Confidence Bar -->
            <div class="w-full bg-white/[0.05] rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-1000 ${data.signal === 'BUY' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : data.signal === 'SELL' ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}" style="width: ${data.confidence}%"></div>
            </div>

            <!-- Summary -->
            <p class="text-sm text-slate-300 leading-relaxed">${data.summary || ''}</p>

            <!-- Key Factors -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${(data.keyFactors || []).map(f => `
                    <div class="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <span class="mt-0.5">${f.type === 'bullish' ? '🟢' : '🔴'}</span>
                        <span class="text-sm text-slate-300">${f.text}</span>
                    </div>
                `).join('')}
            </div>

            <!-- Outlooks -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div class="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div class="text-xs text-slate-500 mb-1">📅 Short-Term Outlook</div>
                    <p class="text-sm text-slate-300">${data.shortTermOutlook || '—'}</p>
                </div>
                <div class="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div class="text-xs text-slate-500 mb-1">🔭 Long-Term Outlook</div>
                    <p class="text-sm text-slate-300">${data.longTermOutlook || '—'}</p>
                </div>
            </div>
        </div>`;
}

async function loadNews() {
    const el = document.getElementById('newsFeed');
    const data = await API.news(currentSymbol);
    if (!data || !data.length) { el.innerHTML = '<p class="text-slate-500">No news available</p>'; return; }

    el.innerHTML = `<div class="space-y-3 stagger">${data.map(n => {
        const sentClass = n.sentiment === 'Positive' ? 'sentiment-positive' : n.sentiment === 'Negative' ? 'sentiment-negative' : 'sentiment-neutral';
        const sentIcon = n.sentiment === 'Positive' ? '🟢' : n.sentiment === 'Negative' ? '🔴' : '⚪';
        return `
        <a href="${n.url}" target="_blank" rel="noopener" class="block p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition group">
            <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition line-clamp-1">${n.title}</h4>
                    <p class="text-xs text-slate-400 mt-1 line-clamp-2">${n.description || ''}</p>
                    <div class="flex items-center gap-3 mt-2">
                        <span class="text-[10px] text-slate-600">${n.source}</span>
                    </div>
                </div>
                <span class="shrink-0 text-xs px-2 py-1 rounded-full ${sentClass}">${sentIcon} ${n.sentiment}</span>
            </div>
        </a>`;
    }).join('')}</div>`;
}

function renderStats(q) {
    const el = document.getElementById('keyStats');
    if (!q) return;
    const stats = [
        ['Open', formatCurrency(q.open)],
        ['Day High', formatCurrency(q.dayHigh)],
        ['Day Low', formatCurrency(q.dayLow)],
        ['Prev Close', formatCurrency(q.previousClose)],
        ['Volume', q.volume ? q.volume.toLocaleString('en-IN') : '—'],
        ['Market Cap', formatLargeNumber(q.marketCap)],
        ['P/E Ratio', q.pe || '—'],
        ['P/B Ratio', q.pb || '—'],
        ['52W High', formatCurrency(q.week52High)],
        ['52W Low', formatCurrency(q.week52Low)],
        ['Div Yield', q.dividendYield ? q.dividendYield + '%' : '—'],
    ];
    el.innerHTML = `<div class="space-y-2.5 fade-in">${stats.map(([k, v]) =>
        `<div class="flex justify-between items-center py-1 border-b border-white/[0.03] last:border-0">
            <span class="text-xs text-slate-500">${k}</span>
            <span class="text-sm font-mono font-medium text-slate-200">${v}</span>
        </div>`
    ).join('')}</div>`;
}

// Load stats alongside quote
const origLoadQuote = loadQuote;
loadQuote = async function() {
    const q = await API.quote(currentSymbol);
    const el = document.getElementById('stockHeader');
    if (!q) { el.innerHTML = '<h1 class="text-2xl font-bold text-red-400">Failed to load</h1>'; return; }
    el.innerHTML = `
        <div class="fade-in">
            <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl sm:text-3xl font-bold text-white">${q.name}</h1>
                <span class="text-sm font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded">${q.symbol}</span>
            </div>
            <div class="flex items-baseline gap-3 flex-wrap">
                <span class="text-3xl font-bold font-mono">${formatCurrency(q.price)}</span>
                <span class="text-lg font-semibold font-mono ${changeColor(q.change)}">${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}</span>
                <span class="px-2 py-0.5 rounded-lg text-sm font-semibold ${changeBg(q.changePercent)}">${formatPercent(q.changePercent)}</span>
            </div>
        </div>`;
    renderStats(q);
};

function setupControls() {
    // Timeframe buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadChart(btn.dataset.period, btn.dataset.interval);
        });
    });
    // Chart type toggle
    document.getElementById('btnCandle').addEventListener('click', () => {
        currentChartType = 'candlestick';
        document.getElementById('btnCandle').classList.add('active');
        document.getElementById('btnLine').classList.remove('active');
        if (currentHistoryData.length) Charts.createPriceChart('priceChart', currentHistoryData, 'candlestick');
    });
    document.getElementById('btnLine').addEventListener('click', () => {
        currentChartType = 'line';
        document.getElementById('btnLine').classList.add('active');
        document.getElementById('btnCandle').classList.remove('active');
        if (currentHistoryData.length) Charts.createPriceChart('priceChart', currentHistoryData, 'line');
    });
}

// Reuse search from app.js
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
}
