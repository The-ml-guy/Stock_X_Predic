/**
 * Institutional Terminal Controller for Stock_X (Orderblock Style)
 */

const Terminal = {
    activeSymbol: 'RELIANCE.NS',
    activeSector: 'all',
    activeInterval: '1d',
    chronosHorizon: 10,
    chartType: 'candlestick',
    showOrderBlocks: true,
    showChronos: true,
    showSignals: true,
    viewMode: localStorage.getItem('stock_x_mode') || 'easy',
    
    currentData: null,
    industryOverview: null,
    allStocks: [],
    
    async init() {
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        if (params.get('symbol')) {
            this.activeSymbol = params.get('symbol');
        }
        if (params.get('sector')) {
            this.activeSector = params.get('sector');
        }
        if (params.get('interval')) {
            this.activeInterval = params.get('interval');
        } else if (this.activeSymbol.endsWith('-USD')) {
            this.activeInterval = '5m';
        }

        this.initViewMode();
        this.initApiSettings();
        this.setupEventHandlers();
        this.updateHorizonButtonLabels();
        if (window.Backtest) {
            Backtest.init();
        }
        
        // Parallel initial fetches
        await Promise.all([
            this.checkLocalLLM(),
            this.fetchIndustryOverview(),
            this.loadTerminalData(this.activeSymbol, this.chronosHorizon, this.activeInterval)
        ]);
        
        // Auto-refresh LLM status every 15s
        setInterval(() => this.checkLocalLLM(), 15000);
    },

    setupEventHandlers() {
        // Search Input
        const searchInput = document.getElementById('terminalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterWatchlist(e.target.value));
        }

        // Timeframe Interval toggles (5m, 15m, 1h, 1d)
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeInterval = btn.dataset.interval;
                this.updateHorizonButtonLabels();
                this.loadTerminalData(this.activeSymbol, this.chronosHorizon, this.activeInterval);
            });
        });

        // Horizon toggles
        document.querySelectorAll('.chronos-hz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chronos-hz-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chronosHorizon = parseInt(btn.dataset.hz, 10);
                this.loadTerminalData(this.activeSymbol, this.chronosHorizon, this.activeInterval);
            });
        });

        // Timezone toggles (GMT / UTC vs IST)
        document.querySelectorAll('.tz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tz-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tz = btn.dataset.tz;
                Charts.setTimezone(tz);
            });
        });

        // Chart type toggles
        const btnCandle = document.getElementById('btnCandle');
        const btnLine = document.getElementById('btnLine');
        if (btnCandle && btnLine) {
            btnCandle.addEventListener('click', () => {
                btnCandle.classList.add('active');
                btnLine.classList.remove('active');
                this.chartType = 'candlestick';
                Charts.setChartType(this.currentData.candles, 'candlestick');
            });
            btnLine.addEventListener('click', () => {
                btnLine.classList.add('active');
                btnCandle.classList.remove('active');
                this.chartType = 'line';
                Charts.setChartType(this.currentData.candles, 'line');
            });
        }

        // Overlay toggles
        const toggleOB = document.getElementById('toggleOB');
        if (toggleOB) {
            toggleOB.addEventListener('click', () => {
                this.showOrderBlocks = !this.showOrderBlocks;
                toggleOB.classList.toggle('active', this.showOrderBlocks);
                Charts.toggleOrderBlocks(this.showOrderBlocks);
            });
        }

        const toggleChronos = document.getElementById('toggleChronos');
        if (toggleChronos) {
            toggleChronos.addEventListener('click', () => {
                this.showChronos = !this.showChronos;
                toggleChronos.classList.toggle('active', this.showChronos);
                Charts.toggleChronos(this.showChronos);
            });
        }

        // Buy/Sell Indicator Signals toggle
        const toggleSignals = document.getElementById('toggleSignals');
        if (toggleSignals) {
            toggleSignals.addEventListener('click', () => {
                this.showSignals = !this.showSignals;
                toggleSignals.classList.toggle('active', this.showSignals);
                if (this.showSignals) {
                    toggleSignals.classList.add('text-emerald-300', 'border-emerald-500/40', 'bg-emerald-500/10');
                } else {
                    toggleSignals.classList.remove('text-emerald-300', 'border-emerald-500/40', 'bg-emerald-500/10');
                }
                Charts.toggleSignals(this.showSignals);
            });
        }

        // View Mode toggles (Easy Mode vs Pro SMC Terminal)
        const btnModeEasy = document.getElementById('btnModeEasy');
        const btnModePro = document.getElementById('btnModePro');
        if (btnModeEasy && btnModePro) {
            btnModeEasy.addEventListener('click', () => this.applyViewMode('easy'));
            btnModePro.addEventListener('click', () => this.applyViewMode('pro'));
        }

        // Quick Popular Stock Chips
        document.querySelectorAll('.quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const sym = chip.dataset.sym;
                if (!sym || sym === this.activeSymbol) return;
                document.querySelectorAll('.quick-chip').forEach(c => {
                    c.classList.remove('active', 'border-cyan-500/40', 'text-cyan-300', 'font-bold');
                    c.classList.add('text-slate-300');
                });
                chip.classList.add('active', 'border-cyan-500/40', 'text-cyan-300', 'font-bold');
                chip.classList.remove('text-slate-300');
                this.activeSymbol = sym;
                if (sym.endsWith('-USD')) {
                    this.activeInterval = '5m';
                    document.querySelectorAll('.tf-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.interval === '5m');
                        if (b.dataset.interval === '5m') b.classList.add('text-cyan-400', 'font-bold', 'bg-cyan-500/15');
                        else b.classList.remove('text-cyan-400', 'font-bold', 'bg-cyan-500/15');
                    });
                }
                this.loadTerminalData(this.activeSymbol, this.chronosHorizon, this.activeInterval);
            });
        });

        // API Configuration Modal Handlers (for Vercel & Cloud deployment)
        const btnApi = document.getElementById('btnApiSettings');
        const modalApi = document.getElementById('apiSettingsModal');
        const closeApi = document.getElementById('btnCloseApiModal');
        const saveApi = document.getElementById('btnSaveApi');
        const resetApi = document.getElementById('btnResetApi');
        const inputApi = document.getElementById('apiBaseInput');
        const displayApi = document.getElementById('currentApiDisplay');

        if (btnApi && modalApi) {
            btnApi.addEventListener('click', () => {
                if (inputApi) inputApi.value = API.base || '';
                if (displayApi) displayApi.textContent = API.base ? API.base : "Local Relative ('')";
                modalApi.classList.remove('hidden');
            });
        }
        if (closeApi && modalApi) {
            closeApi.addEventListener('click', () => modalApi.classList.add('hidden'));
        }
        if (resetApi) {
            resetApi.addEventListener('click', () => {
                API.setBase('');
                this.initApiSettings();
                if (modalApi) modalApi.classList.add('hidden');
                this.loadTerminalData(this.activeSymbol, this.chronosHorizon, this.activeInterval);
            });
        }
        if (saveApi && inputApi) {
            saveApi.addEventListener('click', () => {
                API.setBase(inputApi.value);
                this.initApiSettings();
                if (modalApi) modalApi.classList.add('hidden');
                this.loadTerminalData(this.activeSymbol, this.chronosHorizon, this.activeInterval);
            });
        }

        // Sector filter tabs
        document.querySelectorAll('.sector-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sector-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeSector = btn.dataset.sector;
                this.renderWatchlist();
                if (this.activeSector !== 'all' && this.activeSector !== 'nifty') {
                    this.loadIndustryNews(this.activeSector);
                }
            });
        });

        // Multi-Engine Intelligence Hub Tab Switcher (Chronos vs VectorBT)
        document.querySelectorAll('.hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchHubTab(btn.dataset.tab);
            });
        });

        // Jump to VectorBT Backtest shortcuts
        const btnJump = document.getElementById('btnJumpBacktest');
        if (btnJump) btnJump.addEventListener('click', () => this.switchHubTab('backtest', true));

        const badgeJump = document.getElementById('topVectorBTBadge');
        if (badgeJump) badgeJump.addEventListener('click', () => this.switchHubTab('backtest', true));
    },

    switchHubTab(tabName, scrollIntoView = false) {
        const tabChronos = document.getElementById('tabContentChronos');
        const tabBacktest = document.getElementById('tabContentBacktest');
        const activeTag = document.getElementById('hubActiveTag');

        // Update Tab buttons visual states
        document.querySelectorAll('.hub-tab-btn').forEach(b => {
            const isTarget = (b.dataset.tab === tabName);
            b.classList.toggle('active', isTarget);
            if (isTarget) {
                b.classList.remove('text-slate-400');
                b.classList.add('text-cyan-400', 'font-bold');
            } else {
                b.classList.remove('text-cyan-400', 'font-bold');
                b.classList.add('text-slate-400');
            }
        });

        if (tabName === 'chronos') {
            if (tabChronos) {
                tabChronos.classList.remove('hidden');
                tabChronos.style.display = 'block';
            }
            if (tabBacktest) {
                tabBacktest.classList.add('hidden');
                tabBacktest.style.display = 'none';
            }
            if (activeTag) {
                activeTag.textContent = 'ZERO-SHOT T5 PROJECTION';
                activeTag.className = 'text-[10px] font-mono text-purple-400 font-bold hidden sm:inline';
            }
        } else if (tabName === 'backtest') {
            if (tabChronos) {
                tabChronos.classList.add('hidden');
                tabChronos.style.display = 'none';
            }
            if (tabBacktest) {
                tabBacktest.classList.remove('hidden');
                tabBacktest.style.display = 'block';
            }
            if (activeTag) {
                activeTag.textContent = '⚡ VECTORBT NUMBA JIT (ACTIVE)';
                activeTag.className = 'text-[10px] font-mono text-cyan-400 font-bold hidden sm:inline';
            }

            if (window.Backtest) {
                if (!Backtest.currentResult || Backtest.lastSymbol !== this.activeSymbol || Backtest.lastInterval !== this.activeInterval) {
                    Backtest.executeBacktest();
                } else if (Backtest.currentResult) {
                    setTimeout(() => Backtest.renderResults(Backtest.currentResult), 50);
                }
            }
        }

        if (scrollIntoView) {
            const hubEl = document.getElementById('hubTabButtons') || tabBacktest;
            if (hubEl) {
                hubEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },

    async checkLocalLLM() {
        const status = await API.llmStatus();
        const badge = document.getElementById('llmStatusBadge');
        if (!badge) return;
        
        if (status && status.online) {
            badge.innerHTML = `
                <span class="pulse-dot online"></span>
                <span class="text-xs font-mono text-emerald-400">LOCAL AI: ${status.activeModel} (${status.latencyMs}ms)</span>
            `;
            badge.className = "flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20";
        } else {
            badge.innerHTML = `
                <span class="pulse-dot offline"></span>
                <span class="text-xs font-mono text-slate-400">LOCAL AI: OFFLINE (LM STUDIO PORT 1234)</span>
            `;
            badge.className = "flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/60 border border-white/5";
        }
    },

    async fetchIndustryOverview() {
        this.industryOverview = await API.industryOverview();
        this.renderWatchlist();
    },

    updateHorizonButtonLabels() {
        const hzBtn5 = document.getElementById('hzBtn5');
        const hzBtn10 = document.getElementById('hzBtn10');
        const hzBtn20 = document.getElementById('hzBtn20');
        if (!hzBtn5 || !hzBtn10 || !hzBtn20) return;
        
        if (this.activeInterval === '5m') {
            hzBtn5.textContent = '25m';
            hzBtn10.textContent = '50m';
            hzBtn20.textContent = '100m';
        } else if (this.activeInterval === '15m') {
            hzBtn5.textContent = '1.2h';
            hzBtn10.textContent = '2.5h';
            hzBtn20.textContent = '5h';
        } else if (this.activeInterval === '1h') {
            hzBtn5.textContent = '5h';
            hzBtn10.textContent = '10h';
            hzBtn20.textContent = '20h';
        } else {
            hzBtn5.textContent = '5D';
            hzBtn10.textContent = '10D';
            hzBtn20.textContent = '20D';
        }
    },

    async loadTerminalData(symbol, horizon = 10, interval = null) {
        this.activeSymbol = symbol;
        if (interval) {
            this.activeInterval = interval;
        } else {
            // Auto-switch to 5m for crypto if currently on daily
            if (symbol.endsWith('-USD') && this.activeInterval === '1d') {
                this.activeInterval = '5m';
            } else if ((symbol.endsWith('.NS') || symbol.endsWith('.BO')) && (this.activeInterval === '5m' || this.activeInterval === '15m')) {
                this.activeInterval = '1d';
            }
        }

        // Highlight active interval button
        document.querySelectorAll('.tf-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.interval === this.activeInterval);
        });
        this.updateHorizonButtonLabels();

        const badge = document.getElementById('hudIntervalBadge');
        if (badge) {
            badge.textContent = this.activeInterval.toUpperCase();
        }

        const loader = document.getElementById('chartLoader');
        if (loader) loader.classList.remove('hidden');

        try {
            const data = await API.terminalMaster(symbol, horizon, this.activeInterval);
            if (!data) {
                console.error("Failed to load terminal master data for", symbol);
                return;
            }
            this.currentData = data;
            
            // 1. Render HUD & quote
            this.renderHUD(data.quote, data.orderblocks, data.chronos);
            
            // 2. Render Chart with Candlesticks, SMC Order Blocks, Chronos, and Buy/Sell Signals
            if (data.candles && data.candles.length > 0) {
                Charts.createPriceChart('terminalMainChart', data.candles, this.chartType);
                if (data.orderblocks) Charts.setOrderBlocks(data.orderblocks);
                if (data.chronos) Charts.setChronosForecast(data.chronos);
                if (data.signals) Charts.setSignals(data.signals);
            }
            
            // 3. Render Actionable Buy/Sell Signal Card & 5-Point Indicator Scorecard
            if (data.signals) {
                this.renderSignals(data.signals, data.quote);
            }

            // Update Quick Stock Chips active status
            document.querySelectorAll('.quick-chip').forEach(chip => {
                const isActive = (chip.dataset.sym === symbol);
                chip.classList.toggle('active', isActive);
                chip.classList.toggle('border-cyan-500/40', isActive);
                chip.classList.toggle('text-cyan-300', isActive);
                chip.classList.toggle('font-bold', isActive);
                if (!isActive) chip.classList.add('text-slate-300');
            });

            // 4. Render Chronos Fan Chart Canvas
            if (data.chronos) {
                ChronosFanChart.render('chronosFanChartSvg', data.chronos);
                this.renderChronosMetrics(data.chronos);
            }
            
            // 5. Render Smart Money Radar (Order Blocks & Fair Value Gaps)
            if (data.orderblocks) {
                this.renderSMCRadar(data.orderblocks);
            }
            
            // 6. Render Local AI Institutional Desk
            if (data.ai) {
                this.renderAIDesk(data.ai);
            }

            // 7. Load relevant industry or stock news
            this.loadSectorOrStockNews(symbol);

            // 8. Auto-refresh VectorBT Backtest if Backtest Tab is currently active
            const tabBacktest = document.getElementById('tabContentBacktest');
            if (tabBacktest && !tabBacktest.classList.contains('hidden') && window.Backtest) {
                Backtest.executeBacktest();
            }

        } catch (err) {
            console.error("Terminal load error:", err);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },

    initViewMode() {
        this.applyViewMode(this.viewMode || 'easy');
    },

    applyViewMode(mode) {
        this.viewMode = mode;
        localStorage.setItem('stock_x_mode', mode);

        const btnEasy = document.getElementById('btnModeEasy');
        const btnPro = document.getElementById('btnModePro');

        if (btnEasy && btnPro) {
            if (mode === 'easy') {
                btnEasy.className = 'px-2.5 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20';
                btnPro.className = 'px-2.5 py-1 rounded text-xs font-mono text-slate-400 hover:text-white transition flex items-center gap-1.5';
                document.body.classList.add('easy-mode');
            } else {
                btnPro.className = 'px-2.5 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20';
                btnEasy.className = 'px-2.5 py-1 rounded text-xs font-mono text-slate-400 hover:text-white transition flex items-center gap-1.5';
                document.body.classList.remove('easy-mode');
            }
        }
    },

    initApiSettings() {
        const labelApi = document.getElementById('apiStatusLabel');
        const displayApi = document.getElementById('currentApiDisplay');
        if (API.base) {
            if (labelApi) labelApi.textContent = 'API (CLOUD)';
            if (displayApi) displayApi.textContent = API.base;
        } else {
            if (labelApi) labelApi.textContent = 'API';
            if (displayApi) displayApi.textContent = "Local Relative ('')";
        }
    },

    renderSignals(signals, quote) {
        if (!signals) return;

        const badgeEl = document.getElementById('signalMainBadge');
        const badgeText = document.getElementById('signalMainBadgeText');
        const titleEl = document.getElementById('signalVerdictTitle');
        const confEl = document.getElementById('signalConfidenceText');
        const descEl = document.getElementById('signalHumanDescription');
        const entryEl = document.getElementById('signalEntryPrice');
        const tp1El = document.getElementById('signalTarget1');
        const tp1PctEl = document.getElementById('signalTarget1Pct');
        const slEl = document.getElementById('signalStopLoss');
        const slPctEl = document.getElementById('signalStopLossPct');
        const rrEl = document.getElementById('signalRRRatio');
        const stripEl = document.getElementById('signalIndicatorsStrip');
        const cardEl = document.getElementById('buySellSignalCard');

        const sym = this.activeSymbol;
        const curPrice = (quote && quote.price) ? quote.price : signals.entryPrice;

        // Visual Badge styling
        const sig = signals.currentSignal || 'HOLD / NEUTRAL';
        if (badgeText) badgeText.textContent = sig;

        if (badgeEl && cardEl) {
            if (sig.includes('BUY')) {
                badgeEl.className = 'px-3.5 py-1.5 rounded-lg text-sm font-mono font-black tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 flex items-center gap-2';
                cardEl.style.borderColor = 'rgba(16, 185, 129, 0.35)';
            } else if (sig.includes('SELL')) {
                badgeEl.className = 'px-3.5 py-1.5 rounded-lg text-sm font-mono font-black tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-lg shadow-rose-500/20 flex items-center gap-2';
                cardEl.style.borderColor = 'rgba(244, 63, 94, 0.35)';
            } else {
                badgeEl.className = 'px-3.5 py-1.5 rounded-lg text-sm font-mono font-black tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/20 flex items-center gap-2';
                cardEl.style.borderColor = 'rgba(245, 158, 11, 0.35)';
            }
        }

        if (titleEl) titleEl.textContent = signals.verdictTitle;
        if (confEl) confEl.textContent = `${signals.confidence}% Confluence Score · Horizon: ${this.activeInterval.toUpperCase()}`;
        if (descEl) descEl.textContent = signals.verdictDescription;

        if (entryEl) entryEl.textContent = signals.entryZone || formatCurrency(curPrice, sym);
        if (tp1El) tp1El.textContent = formatCurrency(signals.target1, sym);
        if (tp1PctEl && curPrice) {
            const pct1 = ((signals.target1 - curPrice) / curPrice) * 100;
            tp1PctEl.textContent = `(${pct1 >= 0 ? '+' : ''}${pct1.toFixed(1)}%)`;
        }

        if (slEl) slEl.textContent = formatCurrency(signals.stopLoss, sym);
        if (slPctEl && curPrice) {
            const slPct = ((signals.stopLoss - curPrice) / curPrice) * 100;
            slPctEl.textContent = `(${slPct.toFixed(1)}%)`;
        }

        if (rrEl) rrEl.textContent = signals.riskRewardRatio || '1:2.4';

        // Render 5-Point Indicator Breakdown Strip
        if (stripEl && signals.indicatorsBreakdown) {
            stripEl.innerHTML = signals.indicatorsBreakdown.map(ind => {
                const isBull = ind.isBullish;
                const isBear = ind.isBearish;
                const borderClass = isBull ? 'border-emerald-500/25 bg-emerald-500/5' : 
                                   isBear ? 'border-rose-500/25 bg-rose-500/5' : 'border-white/5 bg-white/[0.02]';
                const tagClass = isBull ? 'text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded' : 
                                 isBear ? 'text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded' : 'text-slate-400 bg-white/5 px-1 py-0.2 rounded';
                const valClass = isBull ? 'text-emerald-300 font-bold' : isBear ? 'text-rose-300 font-bold' : 'text-slate-200';

                return `
                    <div class="p-2 rounded ${borderClass} border">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-slate-500 uppercase font-semibold truncate mr-1">${ind.name}</span>
                            <span class="text-[9px] font-bold ${tagClass} shrink-0">${ind.badge}</span>
                        </div>
                        <div class="text-xs ${valClass} truncate mb-0.5">${ind.value}</div>
                        <div class="text-[10px] text-slate-400 leading-tight line-clamp-2" title="${ind.status}">${ind.status}</div>
                    </div>
                `;
            }).join('');
        }
    },

    renderHUD(quote, ob, chronos) {
        if (!quote) return;
        
        document.getElementById('hudSymbol').textContent = quote.symbol;
        document.getElementById('hudName').textContent = quote.name;
        document.getElementById('hudPrice').textContent = formatCurrency(quote.price, quote.symbol);
        
        const changeEl = document.getElementById('hudChange');
        if (changeEl) {
            changeEl.textContent = formatPercent(quote.changePercent);
            changeEl.className = `text-xs font-mono font-bold px-2 py-0.5 rounded ${changeBg(quote.changePercent)}`;
        }

        const highEl = document.getElementById('hudHigh');
        const lowEl = document.getElementById('hudLow');
        if (highEl) highEl.textContent = formatCurrency(quote.dayHigh, quote.symbol);
        if (lowEl) lowEl.textContent = formatCurrency(quote.dayLow, quote.symbol);

        // SMC Zone Badge
        const zoneBadge = document.getElementById('hudZoneBadge');
        if (zoneBadge && ob && ob.structure) {
            const z = ob.structure.zone;
            if (z === 'DISCOUNT') {
                zoneBadge.textContent = 'DISCOUNT (ACCUMULATION)';
                zoneBadge.className = 'badge-ob-bull px-2 py-0.5 rounded text-[11px] font-mono font-bold';
            } else {
                zoneBadge.textContent = 'PREMIUM (DISTRIBUTION)';
                zoneBadge.className = 'badge-ob-bear px-2 py-0.5 rounded text-[11px] font-mono font-bold';
            }
        }
    },

    renderChronosMetrics(chronos) {
        const dirEl = document.getElementById('chronosDirection');
        const convEl = document.getElementById('chronosConviction');
        const targetEl = document.getElementById('chronosTarget');
        const retEl = document.getElementById('chronosReturn');
        const corridorEl = document.getElementById('chronosCorridor');
        const summaryEl = document.getElementById('chronosSummary');

        if (dirEl) {
            dirEl.textContent = chronos.direction;
            dirEl.className = chronos.direction.includes('BULLISH') ? 'text-emerald-400 font-bold' : 
                             chronos.direction.includes('BEARISH') ? 'text-rose-400 font-bold' : 'text-slate-300 font-bold';
        }
        if (convEl) convEl.textContent = `${chronos.conviction}%`;
        if (targetEl) targetEl.textContent = formatCurrency(chronos.targetMedian, this.activeSymbol);
        if (retEl) {
            retEl.textContent = formatPercent(chronos.expectedReturnPct);
            retEl.className = changeColor(chronos.expectedReturnPct);
        }
        if (corridorEl) {
            corridorEl.textContent = `${formatCurrency(chronos.bearishSupportP10, this.activeSymbol)} — ${formatCurrency(chronos.bullishTargetP90, this.activeSymbol)}`;
        }
        if (summaryEl) {
            summaryEl.textContent = chronos.summary;
        }
    },

    renderSMCRadar(ob) {
        const container = document.getElementById('smcRadarContent');
        if (!container) return;

        const unmitBull = ob.unmitigatedBullish || [];
        const unmitBear = ob.unmitigatedBearish || [];
        const fvgs = ob.fairValueGaps || [];
        const struct = ob.structure || {};

        let bullHtml = unmitBull.length === 0 ? '<p class="text-xs text-slate-500">No active unmitigated bullish OBs.</p>' :
            unmitBull.map(b => `
                <div class="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/15 text-xs font-mono">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span class="text-emerald-300 font-bold">OB+ DEMAND</span>
                    </div>
                    <span class="text-slate-200">${formatCurrency(b.low, this.activeSymbol)} - ${formatCurrency(b.high, this.activeSymbol)}</span>
                    <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">STR ${b.strength}%</span>
                </div>
            `).join('');

        let bearHtml = unmitBear.length === 0 ? '<p class="text-xs text-slate-500">No active unmitigated bearish OBs.</p>' :
            unmitBear.map(b => `
                <div class="flex items-center justify-between p-2 rounded bg-rose-500/5 border border-rose-500/15 text-xs font-mono">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span class="text-rose-300 font-bold">OB- SUPPLY</span>
                    </div>
                    <span class="text-slate-200">${formatCurrency(b.low, this.activeSymbol)} - ${formatCurrency(b.high, this.activeSymbol)}</span>
                    <span class="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">STR ${b.strength}%</span>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="space-y-3">
                <div class="grid grid-cols-2 gap-2 text-xs font-mono bg-white/[0.02] p-2 rounded border border-white/5">
                    <div>
                        <span class="text-slate-500 block text-[10px]">EQUILIBRIUM (50%)</span>
                        <span class="text-cyan-400 font-bold">${formatCurrency(struct.equilibrium, this.activeSymbol)}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block text-[10px]">DEALING RANGE</span>
                        <span class="text-slate-300">${formatCurrency(struct.rangeLow, this.activeSymbol)} - ${formatCurrency(struct.rangeHigh, this.activeSymbol)}</span>
                    </div>
                </div>

                <div>
                    <h5 class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span>🟢</span> Fresh Demand Order Blocks (${unmitBull.length})
                    </h5>
                    <div class="space-y-1.5">${bullHtml}</div>
                </div>

                <div>
                    <h5 class="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span>🔴</span> Supply Order Blocks (${unmitBear.length})
                    </h5>
                    <div class="space-y-1.5">${bearHtml}</div>
                </div>
            </div>
        `;
    },

    renderAIDesk(ai) {
        const signalEl = document.getElementById('aiSignalBadge');
        const confEl = document.getElementById('aiConfidence');
        const srcEl = document.getElementById('aiSourceTag');
        const thesisEl = document.getElementById('aiOrderBlockThesis');
        const chronosInsightEl = document.getElementById('aiChronosInsight');
        const factorsEl = document.getElementById('aiKeyFactors');
        const summaryEl = document.getElementById('aiInstitutionalSummary');

        if (signalEl) {
            signalEl.textContent = ai.signal;
            if (ai.signal.includes('BUY')) {
                signalEl.className = 'px-3 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10';
            } else if (ai.signal.includes('SELL')) {
                signalEl.className = 'px-3 py-1 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10';
            } else {
                signalEl.className = 'px-3 py-1 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
            }
        }

        if (confEl) confEl.textContent = `Confidence: ${ai.confidence}%`;
        if (srcEl) srcEl.textContent = ai.source || 'Local AI Engine';
        if (thesisEl) thesisEl.textContent = ai.orderBlockThesis || 'N/A';
        if (chronosInsightEl) chronosInsightEl.textContent = ai.chronosForecastInsight || 'N/A';
        if (summaryEl) summaryEl.textContent = ai.institutionalSummary || '';

        if (factorsEl && ai.keyFactors) {
            factorsEl.innerHTML = ai.keyFactors.map(f => `
                <div class="flex items-start gap-2 p-2 rounded bg-white/[0.02] border border-white/5 text-xs">
                    <span class="mt-0.5 text-xs">${f.type === 'bullish' ? '🟢' : f.type === 'bearish' ? '🔴' : '⚪'}</span>
                    <span class="text-slate-300 leading-relaxed">${f.text}</span>
                </div>
            `).join('');
        }
    },

    renderWatchlist() {
        const container = document.getElementById('watchlistContainer');
        if (!container) return;

        // Local sector stock mappings for filters not in industryOverview
        const localSectors = {
            nifty50: [
                { symbol: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy" },
                { symbol: "TCS.NS", name: "Tata Consultancy", sector: "IT" },
                { symbol: "HDFCBANK.NS", name: "HDFC Bank", sector: "Banking" },
                { symbol: "INFY.NS", name: "Infosys", sector: "IT" },
                { symbol: "ICICIBANK.NS", name: "ICICI Bank", sector: "Banking" },
                { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "FMCG" },
                { symbol: "SBIN.NS", name: "State Bank of India", sector: "Banking" },
                { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", sector: "Telecom" },
                { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG" },
                { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", sector: "Banking" },
                { symbol: "LT.NS", name: "Larsen & Toubro", sector: "Infrastructure" },
                { symbol: "AXISBANK.NS", name: "Axis Bank", sector: "Banking" },
                { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "Finance" },
                { symbol: "MARUTI.NS", name: "Maruti Suzuki", sector: "Auto" },
                { symbol: "TATAMOTORS.NS", name: "Tata Motors", sector: "Auto" },
                { symbol: "HCLTECH.NS", name: "HCL Technologies", sector: "IT" },
                { symbol: "SUNPHARMA.NS", name: "Sun Pharma", sector: "Pharma" },
                { symbol: "TITAN.NS", name: "Titan Company", sector: "Consumer" },
                { symbol: "ASIANPAINT.NS", name: "Asian Paints", sector: "Consumer" },
                { symbol: "TATASTEEL.NS", name: "Tata Steel", sector: "Metals" },
            ],
            banking: [
                { symbol: "HDFCBANK.NS", name: "HDFC Bank", sector: "Banking" },
                { symbol: "ICICIBANK.NS", name: "ICICI Bank", sector: "Banking" },
                { symbol: "SBIN.NS", name: "State Bank of India", sector: "Banking" },
                { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", sector: "Banking" },
                { symbol: "AXISBANK.NS", name: "Axis Bank", sector: "Banking" },
                { symbol: "INDUSINDBK.NS", name: "IndusInd Bank", sector: "Banking" },
                { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "Finance" },
                { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv", sector: "Finance" },
                { symbol: "SBILIFE.NS", name: "SBI Life Insurance", sector: "Insurance" },
                { symbol: "HDFCLIFE.NS", name: "HDFC Life Insurance", sector: "Insurance" },
            ],
            fmcg: [
                { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "FMCG" },
                { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG" },
                { symbol: "NESTLEIND.NS", name: "Nestle India", sector: "FMCG" },
                { symbol: "BRITANNIA.NS", name: "Britannia Industries", sector: "FMCG" },
                { symbol: "TATACONSUM.NS", name: "Tata Consumer Products", sector: "FMCG" },
                { symbol: "TITAN.NS", name: "Titan Company", sector: "Consumer" },
                { symbol: "ASIANPAINT.NS", name: "Asian Paints", sector: "Consumer" },
            ],
            auto: [
                { symbol: "MARUTI.NS", name: "Maruti Suzuki", sector: "Auto" },
                { symbol: "TATAMOTORS.NS", name: "Tata Motors", sector: "Auto" },
                { symbol: "M&M.NS", name: "Mahindra & Mahindra", sector: "Auto" },
                { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto", sector: "Auto" },
                { symbol: "EICHERMOT.NS", name: "Eicher Motors", sector: "Auto" },
                { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp", sector: "Auto" },
            ],
            pharma: [
                { symbol: "SUNPHARMA.NS", name: "Sun Pharma", sector: "Pharma" },
                { symbol: "DRREDDY.NS", name: "Dr Reddy's Labs", sector: "Pharma" },
                { symbol: "CIPLA.NS", name: "Cipla Ltd", sector: "Pharma" },
                { symbol: "DIVISLAB.NS", name: "Divi's Laboratories", sector: "Pharma" },
                { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals", sector: "Healthcare" },
            ],
            metals: [
                { symbol: "TATASTEEL.NS", name: "Tata Steel", sector: "Metals" },
                { symbol: "JSWSTEEL.NS", name: "JSW Steel", sector: "Metals" },
                { symbol: "HINDALCO.NS", name: "Hindalco Industries", sector: "Metals" },
                { symbol: "COALINDIA.NS", name: "Coal India", sector: "Mining" },
                { symbol: "ADANIENT.NS", name: "Adani Enterprises", sector: "Diversified" },
            ],
        };

        let stocksToRender = [];
        if (this.industryOverview && this.activeSector !== 'all' && this.industryOverview[this.activeSector]) {
            stocksToRender = this.industryOverview[this.activeSector].stocks;
        } else if (localSectors[this.activeSector]) {
            stocksToRender = localSectors[this.activeSector];
        } else {
            // Master cross-asset watchlist — 24 stocks spanning ALL industries
            stocksToRender = [
                // Crypto & Digital Assets
                { symbol: "BTC-USD", name: "Bitcoin", sector: "Crypto" },
                { symbol: "ETH-USD", name: "Ethereum", sector: "Crypto" },
                { symbol: "SOL-USD", name: "Solana", sector: "Crypto" },
                // Commodities & Macro
                { symbol: "GC=F", name: "Gold Bullion (XAU)", sector: "Commodities" },
                { symbol: "SI=F", name: "Silver (XAG)", sector: "Commodities" },
                // Energy
                { symbol: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy" },
                { symbol: "ONGC.NS", name: "Oil & Natural Gas Corp", sector: "Energy" },
                // Banking
                { symbol: "HDFCBANK.NS", name: "HDFC Bank", sector: "Banking" },
                { symbol: "ICICIBANK.NS", name: "ICICI Bank", sector: "Banking" },
                // IT & AI
                { symbol: "TCS.NS", name: "Tata Consultancy", sector: "AI & IT" },
                { symbol: "INFY.NS", name: "Infosys", sector: "AI & IT" },
                // FMCG
                { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "FMCG" },
                { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG" },
                // Auto
                { symbol: "MARUTI.NS", name: "Maruti Suzuki", sector: "Auto" },
                { symbol: "TATAMOTORS.NS", name: "Tata Motors", sector: "Auto" },
                // Pharma & Healthcare
                { symbol: "SUNPHARMA.NS", name: "Sun Pharma", sector: "Pharma" },
                { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals", sector: "Healthcare" },
                // Semiconductors & EMS
                { symbol: "DIXON.NS", name: "Dixon Technologies", sector: "Semiconductors & EMS" },
                { symbol: "KAYNES.NS", name: "Kaynes Technology", sector: "Semiconductors & EMS" },
                // Solar & Clean Energy
                { symbol: "TATAPOWER.NS", name: "Tata Power", sector: "Solar & Clean Energy" },
                { symbol: "ADANIGREEN.NS", name: "Adani Green Energy", sector: "Solar & Clean Energy" },
                // Finance & Insurance
                { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "Finance" },
                // Infrastructure
                { symbol: "LT.NS", name: "Larsen & Toubro", sector: "Infrastructure" },
                // Metals
                { symbol: "TATASTEEL.NS", name: "Tata Steel", sector: "Metals" },
            ];
        }

        this.allStocks = stocksToRender;
        container.innerHTML = stocksToRender.map(s => {
            const isActive = s.symbol === this.activeSymbol;
            return `
                <div class="ticker-card p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                    isActive ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                }" data-symbol="${s.symbol}">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold font-mono text-slate-100">${s.symbol.replace('.NS','')}</span>
                            ${s.sector ? `<span class="text-[9px] text-slate-500 px-1 py-0.2 rounded bg-white/5">${s.sector}</span>` : ''}
                        </div>
                        <div class="text-[11px] text-slate-400 truncate max-w-[150px]">${s.name}</div>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-mono text-cyan-400">➔</span>
                    </div>
                </div>
            `;
        }).join('');

        // Attach clicks
        container.querySelectorAll('.ticker-card').forEach(card => {
            card.addEventListener('click', () => {
                const sym = card.dataset.symbol;
                this.loadTerminalData(sym, this.chronosHorizon);
                this.renderWatchlist();
            });
        });
    },

    filterWatchlist(query) {
        const q = query.toLowerCase().trim();
        const cards = document.querySelectorAll('#watchlistContainer .ticker-card');
        cards.forEach(card => {
            const sym = card.dataset.symbol.toLowerCase();
            const text = card.textContent.toLowerCase();
            if (sym.includes(q) || text.includes(q)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    },

    async loadSectorOrStockNews(symbol) {
        const newsContainer = document.getElementById('terminalNewsContent');
        if (!newsContainer) return;
        
        // Map stock to its best-matching news sector
        let sector = 'ai_cloud'; // default
        const semiStocks = ['DIXON.NS', 'KAYNES.NS', 'CGPOWER.NS', 'TATAELXSI.NS', 'SYRMA.NS', 'ASMTEC.BO', 'MOSCHIP.BO'];
        const solarStocks = ['TATAPOWER.NS', 'ADANIGREEN.NS', 'SUZLON.NS', 'WAAREEENER.NS', 'PREMIERENE.NS', 'KPIGREEN.NS', 'JSWENERGY.NS', 'IREDA.NS', 'BORORENEW.NS'];
        const cryptoStocks = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD', 'BCH-USD', 'NEAR-USD', 'DOT-USD', 'TRX-USD', 'LTC-USD', 'INJ-USD', 'RENDER-USD', 'FET-USD', 'XLM-USD', 'ATOM-USD', 'SHIB-USD'];
        const commodityStocks = ['GC=F', 'SI=F', 'CL=F'];
        
        if (semiStocks.includes(symbol)) {
            sector = 'semiconductors';
        } else if (solarStocks.includes(symbol)) {
            sector = 'solar_green';
        } else if (cryptoStocks.includes(symbol) || symbol.endsWith('-USD')) {
            sector = 'crypto_top20';
        } else if (commodityStocks.includes(symbol) || symbol.includes('=F')) {
            sector = 'commodities_macro';
        }
        
        await this.loadIndustryNews(sector);
    },

    async loadIndustryNews(sectorId, btnEl = null) {
        const newsContainer = document.getElementById('terminalNewsContent');
        if (!newsContainer) return;

        if (btnEl) {
            document.querySelectorAll('#newsFilterBtns button').forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');
        }

        const articles = await API.industryNews(sectorId, 10);
        if (!articles || articles.length === 0) {
            newsContainer.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No recent articles for this sector.</div>';
            return;
        }

        newsContainer.innerHTML = articles.map(a => {
            const isBull = a.sentiment === 'BULLISH';
            const isBear = a.sentiment === 'BEARISH';
            const sentClass = isBull ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                              isBear ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

            return `
                <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${sentClass}">
                            FinBERT: ${a.sentiment} (${a.sentimentScore > 0 ? '+' : ''}${a.sentimentScore})
                        </span>
                        <span class="text-[10px] text-slate-500 font-mono">${a.source}</span>
                    </div>
                    <a href="${a.url}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-slate-200 hover:text-cyan-400 transition block leading-snug">
                        ${a.title}
                    </a>
                    <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        ${a.summary}
                    </p>
                </div>
            `;
        }).join('');
    }
};

window.Terminal = Terminal;

document.addEventListener('DOMContentLoaded', () => {
    Terminal.init();
});
