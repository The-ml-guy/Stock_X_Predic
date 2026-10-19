/**
 * VectorBT Quantitative Backtest Engine Controller & Visualizer
 * Visualizes vectorized backtest metrics, interactive equity curve, and trade records.
 */

const Backtest = {
    currentResult: null,
    activeStrategy: 'ob_retest',
    riskReward: 2.0,
    stopLoss: 1.2,

    init() {
        const btnRun = document.getElementById('btnRunBacktest');
        if (btnRun) {
            btnRun.addEventListener('click', () => this.executeBacktest());
        }

        const stratSelect = document.getElementById('backtestStrategySelect');
        if (stratSelect) {
            stratSelect.addEventListener('change', (e) => {
                this.activeStrategy = e.target.value;
            });
        }

        const rrSelect = document.getElementById('backtestRRSelect');
        if (rrSelect) {
            rrSelect.addEventListener('change', (e) => {
                this.riskReward = parseFloat(e.target.value);
            });
        }
    },

    async executeBacktest() {
        const sym = Terminal ? Terminal.activeSymbol : 'BTC-USD';
        const interval = Terminal ? Terminal.activeInterval : '1d';
        
        const loader = document.getElementById('backtestLoader');
        if (loader) loader.classList.remove('hidden');

        const btnRun = document.getElementById('btnRunBacktest');
        if (btnRun) {
            btnRun.disabled = true;
            btnRun.innerHTML = `<span>⏳</span> COMPUTING NUMBA JIT...`;
            btnRun.classList.add('opacity-75');
        }

        try {
            const res = await API.backtest(sym, this.activeStrategy, interval, this.riskReward, this.stopLoss);
            if (!res || res.status === 'error') {
                console.error("Backtest failed:", res);
                return;
            }
            this.currentResult = res;
            this.lastSymbol = sym;
            this.lastInterval = interval;
            this.renderResults(res);
        } catch (err) {
            console.error("Backtest execution error:", err);
        } finally {
            if (loader) loader.classList.add('hidden');
            if (btnRun) {
                btnRun.disabled = false;
                btnRun.innerHTML = `<span>▶</span> RUN VECTORBT SIMULATION`;
                btnRun.classList.remove('opacity-75');
            }
        }
    },

    renderResults(res) {
        // 1. KPI Scorecards
        const winRateEl = document.getElementById('vbtWinRate');
        const returnEl = document.getElementById('vbtTotalReturn');
        const benchEl = document.getElementById('vbtBenchmark');
        const pfEl = document.getElementById('vbtProfitFactor');
        const ddEl = document.getElementById('vbtMaxDrawdown');
        const tradesEl = document.getElementById('vbtTradesCount');
        const summaryEl = document.getElementById('vbtSummary');
        const ratingPill = document.getElementById('vbtRatingPill');

        if (winRateEl) {
            winRateEl.textContent = `${res.winRatePct}%`;
            winRateEl.className = res.winRatePct >= 50 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
        }

        if (returnEl) {
            const retSign = res.totalReturnPct > 0 ? '+' : '';
            returnEl.textContent = `${retSign}${res.totalReturnPct}%`;
            returnEl.className = res.totalReturnPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
        }

        if (benchEl) {
            const bSign = res.benchmarkReturnPct > 0 ? '+' : '';
            benchEl.textContent = `Buy & Hold: ${bSign}${res.benchmarkReturnPct}% (Alpha: ${res.alphaPct > 0 ? '+' : ''}${res.alphaPct}%)`;
        }

        if (pfEl) {
            pfEl.textContent = res.profitFactor >= 99 ? '∞' : res.profitFactor.toFixed(2);
            pfEl.className = res.profitFactor >= 1.5 ? 'text-cyan-400 font-bold' : 'text-slate-300 font-bold';
        }

        if (ddEl) {
            ddEl.textContent = `-${res.maxDrawdownPct}%`;
        }

        if (tradesEl) {
            tradesEl.textContent = `${res.totalTrades} (${res.winningTrades}W / ${res.losingTrades}L)`;
        }

        if (ratingPill) {
            ratingPill.textContent = res.performanceRating;
            ratingPill.className = res.performanceRating === 'EXCELLENT' ? 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                   res.performanceRating === 'SOLID' ? 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                                   'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
        }

        if (summaryEl) {
            summaryEl.textContent = res.summary;
        }

        // 2. Render Equity Curve SVG
        if (res.equityCurve && res.equityCurve.length > 0) {
            this.renderEquityCurve('backtestEquityCurveSvg', res.equityCurve);
        }

        // 3. Render Recent Closed Trades Log Table
        const tbody = document.getElementById('backtestTradesTbody');
        if (tbody) {
            if (!res.trades || res.trades.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="py-3 text-center text-slate-500">No closed trades recorded in backtest window.</td></tr>';
            } else {
                const sym = res.symbol || '';
                const cSign = (sym.endsWith('-USD') || sym.includes('=F')) ? '$' : '₹';
                tbody.innerHTML = res.trades.slice(-8).reverse().map(t => {
                    const ePrice = t.entryPrice != null ? Number(t.entryPrice).toLocaleString() : '--';
                    const xPrice = t.exitPrice != null ? Number(t.exitPrice).toLocaleString() : '--';
                    const ret = t.returnPct != null ? Number(t.returnPct) : 0;
                    const status = t.status || (ret >= 0 ? 'WIN' : 'LOSS');
                    return `
                    <tr class="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td class="py-1.5 px-2 text-slate-300">${typeof t.entryTime === 'number' ? new Date(t.entryTime * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : (t.entryTime || '--')}</td>
                        <td class="py-1.5 px-2 text-slate-300">${typeof t.exitTime === 'number' ? new Date(t.exitTime * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : (t.exitTime || '--')}</td>
                        <td class="py-1.5 px-2 text-slate-200">${cSign}${ePrice} ➔ ${cSign}${xPrice}</td>
                        <td class="py-1.5 px-2 font-bold ${ret >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${ret >= 0 ? '+' : ''}${ret}%</td>
                        <td class="py-1.5 px-2">
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${status === 'WIN' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}">
                                ${status}
                            </span>
                        </td>
                    </tr>
                `;}).join('');
            }
        }
    },

    renderEquityCurve(containerId, curve) {
        const container = document.getElementById(containerId);
        if (!container || !curve || curve.length === 0) return;

        const width = container.clientWidth || (container.parentElement ? container.parentElement.clientWidth : 0) || 600;
        const height = container.clientHeight || 180;
        const padding = { top: 20, right: 55, bottom: 25, left: 45 };

        let minVal = Infinity;
        let maxVal = -Infinity;

        curve.forEach(pt => {
            const sRet = Number(pt.strategyReturn) || 0;
            const bRet = Number(pt.benchmarkReturn) || 0;
            if (sRet < minVal) minVal = sRet;
            if (sRet > maxVal) maxVal = sRet;
            if (bRet < minVal) minVal = bRet;
            if (bRet > maxVal) maxVal = bRet;
        });

        if (minVal === Infinity || maxVal === -Infinity || isNaN(minVal) || isNaN(maxVal)) {
            minVal = -5;
            maxVal = 5;
        }

        // Add 5% padding
        const margin = Math.max(2, (maxVal - minVal) * 0.1);
        minVal -= margin;
        maxVal += margin;

        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const total = Math.max(2, curve.length);

        const getX = (i) => padding.left + (i / (total - 1)) * plotWidth;
        const getY = (v) => padding.top + plotHeight - ((v - minVal) / (maxVal - minVal + 1e-6)) * plotHeight;

        // Path for Strategy Return
        let stratPath = '';
        let benchPath = '';

        curve.forEach((pt, i) => {
            const x = getX(i);
            const yStrat = getY(pt.strategyReturn);
            const yBench = getY(pt.benchmarkReturn);

            stratPath += (i === 0 ? `M ${x} ${yStrat}` : ` L ${x} ${yStrat}`);
            benchPath += (i === 0 ? `M ${x} ${yBench}` : ` L ${x} ${yBench}`);
        });

        // Zero baseline
        const zeroY = getY(0);

        // Y-axis grid
        let gridLines = '';
        for (let i = 0; i <= 3; i++) {
            const val = minVal + (i / 3) * (maxVal - minVal);
            const y = getY(val);
            gridLines += `
                <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
                <text x="${width - padding.right + 6}" y="${y + 4}" fill="#64748b" font-size="9" font-family="JetBrains Mono">${val >= 0 ? '+' : ''}${val.toFixed(1)}%</text>
            `;
        }

        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" class="overflow-visible select-none">
                ${gridLines}
                
                <!-- Zero Break-Even Line -->
                <line x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2,2" />
                
                <!-- Benchmark Buy & Hold Line (Purple/Slate) -->
                <path d="${benchPath}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4" />
                
                <!-- VectorBT Strategy Cumulative Equity Curve (Cyan) -->
                <path d="${stratPath}" fill="none" stroke="#00f2fe" stroke-width="2.2" stroke-linecap="round" />
                
                <!-- Legend in top corner -->
                <circle cx="${padding.left + 10}" cy="${padding.top + 6}" r="3.5" fill="#00f2fe" />
                <text x="${padding.left + 20}" y="${padding.top + 9}" fill="#00f2fe" font-size="10" font-family="JetBrains Mono" font-weight="bold">VectorBT Strategy</text>
                
                <circle cx="${padding.left + 170}" cy="${padding.top + 6}" r="3.5" fill="#64748b" />
                <text x="${padding.left + 180}" y="${padding.top + 9}" fill="#94a3b8" font-size="10" font-family="JetBrains Mono">Buy & Hold Benchmark</text>
            </svg>
        `;
    }
};

window.Backtest = Backtest;
