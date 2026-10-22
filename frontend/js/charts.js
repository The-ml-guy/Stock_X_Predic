/**
 * Institutional TradingView Chart Engine with Order Block and Chronos Overlays
 * Compatible with LightweightCharts v4 & v5
 */
const Charts = {
    chartInstance: null,
    candleSeries: null,
    lineSeries: null,
    volumeSeries: null,
    
    // SMC and Chronos series references
    orderBlockLines: [],
    chronosMedianSeries: null,
    chronosUpperSeries: null,
    chronosLowerSeries: null,
    
    currentCandles: [],
    currentOrderBlocks: null,
    currentChronos: null,
    currentSignals: null,
    
    showOrderBlocks: true,
    showChronos: true,
    showSignals: true,
    timezone: 'UTC', // 'UTC' (London GMT+0) or 'IST' (India UTC+5:30)

    setTimezone(tz) {
        this.timezone = tz;
        if (this.currentCandles && this.currentCandles.length > 0) {
            this.createPriceChart('terminalMainChart', this.currentCandles, this.chartType || 'candlestick');
            if (this.currentOrderBlocks) this.setOrderBlocks(this.currentOrderBlocks);
            if (this.currentChronos) this.setChronosForecast(this.currentChronos);
            if (this.currentSignals) this.setSignals(this.currentSignals);
        }
    },

    adjustTime(t) {
        if (typeof t === 'number' && this.timezone === 'IST') {
            return t + 19800; // +5 hours 30 mins
        }
        return t;
    },

    darkTheme: {
        layout: {
            background: { color: '#0d0f15' },
            textColor: '#94a3b8',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace'
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.02)' }
        },
        crosshair: {
            mode: 0,
            vertLine: { color: 'rgba(0, 242, 254, 0.4)', width: 1, style: 2 },
            horzLine: { color: 'rgba(0, 242, 254, 0.4)', width: 1, style: 2 }
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.06)',
            timeVisible: true,
            secondsVisible: false
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.06)',
            scaleMargins: { top: 0.1, bottom: 0.15 }
        }
    },

    // Helper to safely create series across lightweight-charts v4 and v5
    addHistogramSeries(options) {
        if (this.chartInstance.addHistogramSeries) {
            return this.chartInstance.addHistogramSeries(options);
        }
        return this.chartInstance.addSeries(LightweightCharts.HistogramSeries, options);
    },

    addCandlestickSeries(options) {
        if (this.chartInstance.addCandlestickSeries) {
            return this.chartInstance.addCandlestickSeries(options);
        }
        return this.chartInstance.addSeries(LightweightCharts.CandlestickSeries, options);
    },

    addAreaSeries(options) {
        if (this.chartInstance.addAreaSeries) {
            return this.chartInstance.addAreaSeries(options);
        }
        return this.chartInstance.addSeries(LightweightCharts.AreaSeries, options);
    },

    addLineSeries(options) {
        if (this.chartInstance.addLineSeries) {
            return this.chartInstance.addLineSeries(options);
        }
        return this.chartInstance.addSeries(LightweightCharts.LineSeries, options);
    },

    createPriceChart(containerId, candles, type = 'candlestick') {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        
        this.currentCandles = candles;
        this.orderBlockLines = [];

        const chart = LightweightCharts.createChart(container, {
            ...this.darkTheme,
            width: container.clientWidth || 800,
            height: 440,
            handleScroll: { vertTouchDrag: false },
        });
        this.chartInstance = chart;

        // Volume Series
        try {
            this.volumeSeries = this.addHistogramSeries({
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume',
            });
            chart.priceScale('volume').applyOptions({
                scaleMargins: { top: 0.82, bottom: 0 }
            });

            const volData = candles.map(d => ({
                time: this.adjustTime(d.time),
                value: d.volume,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            }));
            this.volumeSeries.setData(volData);
        } catch (e) {
            console.warn("Volume series setup warning:", e);
        }

        // Price Series
        this.setChartType(candles, type);

        new ResizeObserver(() => {
            if (this.chartInstance && container) {
                this.chartInstance.applyOptions({ width: container.clientWidth });
            }
        }).observe(container);

        chart.timeScale().fitContent();
        return chart;
    },

    setChartType(data, type) {
        if (!this.chartInstance) return;
        
        if (this.candleSeries) {
            try { this.chartInstance.removeSeries(this.candleSeries); } catch (e) {}
            this.candleSeries = null;
        }
        if (this.lineSeries) {
            try { this.chartInstance.removeSeries(this.lineSeries); } catch (e) {}
            this.lineSeries = null;
        }

        if (type === 'candlestick') {
            this.candleSeries = this.addCandlestickSeries({
                upColor: '#10b981',
                downColor: '#f43f5e',
                borderUpColor: '#10b981',
                borderDownColor: '#f43f5e',
                wickUpColor: '#10b98188',
                wickDownColor: '#f43f5e88',
            });
            const cData = data.map(d => ({
                time: this.adjustTime(d.time),
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));
            this.candleSeries.setData(cData);
        } else {
            this.lineSeries = this.addAreaSeries({
                topColor: 'rgba(0, 242, 254, 0.28)',
                bottomColor: 'rgba(0, 242, 254, 0.01)',
                lineColor: '#00f2fe',
                lineWidth: 2,
            });
            this.lineSeries.setData(data.map(d => ({ time: this.adjustTime(d.time), value: d.close })));
        }

        // Re-apply overlays
        this.renderOverlays();
    },

    setOrderBlocks(obData) {
        this.currentOrderBlocks = obData;
        this.renderOrderBlocks();
    },

    setChronosForecast(chronosData) {
        this.currentChronos = chronosData;
        this.renderChronosOverlay();
    },

    setSignals(signalsData) {
        this.currentSignals = signalsData;
        this.renderMarkers();
    },

    renderOverlays() {
        if (this.showOrderBlocks) this.renderOrderBlocks();
        if (this.showChronos) this.renderChronosOverlay();
        this.renderMarkers();
    },

    renderOrderBlocks() {
        if (!this.chartInstance || !this.currentOrderBlocks) return;
        const mainSeries = this.candleSeries || this.lineSeries;
        if (!mainSeries) return;

        // Clear previous lines
        this.orderBlockLines.forEach(l => {
            try { mainSeries.removePriceLine(l); } catch (e) {}
        });
        this.orderBlockLines = [];

        if (this.showOrderBlocks) {
            const unmitBull = this.currentOrderBlocks.unmitigatedBullish || [];
            const unmitBear = this.currentOrderBlocks.unmitigatedBearish || [];
            const sym = this.currentChronos ? this.currentChronos.symbol : (window.Terminal ? Terminal.activeSymbol : '');

            // Draw top 2 Bullish Order Blocks (Demand)
            unmitBull.slice(0, 2).forEach(ob => {
                try {
                    const lineHigh = mainSeries.createPriceLine({
                        price: ob.high,
                        color: 'rgba(0, 242, 254, 0.8)',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: `OB+ DEMAND [${formatCurrency(ob.low, sym)} - ${formatCurrency(ob.high, sym)}]`,
                    });
                    const lineLow = mainSeries.createPriceLine({
                        price: ob.low,
                        color: 'rgba(0, 242, 254, 0.35)',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: false,
                        title: '',
                    });
                    this.orderBlockLines.push(lineHigh, lineLow);
                } catch (e) {}
            });

            // Draw top 2 Bearish Order Blocks (Supply)
            unmitBear.slice(0, 2).forEach(ob => {
                try {
                    const lineHigh = mainSeries.createPriceLine({
                        price: ob.high,
                        color: 'rgba(244, 63, 94, 0.8)',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: `OB- SUPPLY [${formatCurrency(ob.low, sym)} - ${formatCurrency(ob.high, sym)}]`,
                    });
                    const lineLow = mainSeries.createPriceLine({
                        price: ob.low,
                        color: 'rgba(244, 63, 94, 0.35)',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: false,
                        title: '',
                    });
                    this.orderBlockLines.push(lineHigh, lineLow);
                } catch (e) {}
            });
        }

        this.renderMarkers();
    },

    renderMarkers() {
        if (!this.candleSeries) return;
        const markers = [];
        const timesUsed = new Set();

        // 1. Buy & Sell Signals (High Priority)
        if (this.showSignals && this.currentSignals && this.currentSignals.chartMarkers) {
            this.currentSignals.chartMarkers.forEach(m => {
                const adjTime = this.adjustTime(m.time);
                const isBuy = String(m.type).includes('BUY');
                markers.push({
                    time: adjTime,
                    position: m.position || (isBuy ? 'belowBar' : 'aboveBar'),
                    color: m.color || (isBuy ? '#10b981' : '#f43f5e'),
                    shape: m.shape || (isBuy ? 'arrowUp' : 'arrowDown'),
                    text: m.label || (isBuy ? 'BUY' : 'SELL'),
                });
                timesUsed.add(String(adjTime));
            });
        }

        // 2. Order Block Markers (if not already marked by a signal on same candle)
        if (this.showOrderBlocks && this.currentOrderBlocks && this.currentOrderBlocks.orderBlocks) {
            this.currentOrderBlocks.orderBlocks.slice(-6).forEach(ob => {
                const adjTime = this.adjustTime(ob.time);
                if (!timesUsed.has(String(adjTime))) {
                    if (ob.type === 'BULLISH' && !ob.mitigated) {
                        markers.push({
                            time: adjTime,
                            position: 'belowBar',
                            color: '#00f2fe',
                            shape: 'arrowUp',
                            text: 'OB+',
                        });
                        timesUsed.add(String(adjTime));
                    } else if (ob.type === 'BEARISH' && !ob.mitigated) {
                        markers.push({
                            time: adjTime,
                            position: 'aboveBar',
                            color: '#f43f5e',
                            shape: 'arrowDown',
                            text: 'OB-',
                        });
                        timesUsed.add(String(adjTime));
                    }
                }
            });
        }

        try {
            markers.sort((a, b) => (a.time > b.time ? 1 : (a.time < b.time ? -1 : 0)));
            this.candleSeries.setMarkers(markers);
        } catch (e) {
            console.warn("Marker rendering notice:", e);
        }
    },

    renderChronosOverlay() {
        if (!this.chartInstance) return;
        
        if (this.chronosMedianSeries) {
            try { this.chartInstance.removeSeries(this.chronosMedianSeries); } catch (e) {}
            this.chronosMedianSeries = null;
        }
        if (this.chronosUpperSeries) {
            try { this.chartInstance.removeSeries(this.chronosUpperSeries); } catch (e) {}
            this.chronosUpperSeries = null;
        }
        if (this.chronosLowerSeries) {
            try { this.chartInstance.removeSeries(this.chronosLowerSeries); } catch (e) {}
            this.chronosLowerSeries = null;
        }

        if (!this.showChronos || !this.currentChronos || !this.currentChronos.forecastPoints) return;
        const fp = this.currentChronos.forecastPoints;
        if (!fp || fp.length === 0) return;

        const lastCandle = this.currentCandles[this.currentCandles.length - 1];
        const bridgePoint = lastCandle ? { time: this.adjustTime(lastCandle.time), value: lastCandle.close } : null;

        try {
            const cSym = this.currentChronos.symbol || '';
            this.chronosMedianSeries = this.addLineSeries({
                color: '#a855f7',
                lineWidth: 2,
                lineStyle: 0,
                lastValueVisible: true,
                title: `CHRONOS P50 (${formatCurrency(this.currentChronos.targetMedian, cSym)})`,
            });
            const medianData = [];
            if (bridgePoint) medianData.push(bridgePoint);
            fp.forEach(p => medianData.push({ time: this.adjustTime(p.time), value: p.p50 }));
            this.chronosMedianSeries.setData(medianData);

            // Upper Boundary (p90)
            this.chronosUpperSeries = this.addLineSeries({
                color: 'rgba(0, 242, 254, 0.7)',
                lineWidth: 1,
                lineStyle: 2,
                lastValueVisible: false,
                title: 'P90 BOUND',
            });
            const upperData = [];
            if (bridgePoint) upperData.push(bridgePoint);
            fp.forEach(p => upperData.push({ time: this.adjustTime(p.time), value: p.p90 }));
            this.chronosUpperSeries.setData(upperData);

            // Lower Boundary (p10)
            this.chronosLowerSeries = this.addLineSeries({
                color: 'rgba(244, 63, 94, 0.7)',
                lineWidth: 1,
                lineStyle: 2,
                lastValueVisible: false,
                title: 'P10 BOUND',
            });
            const lowerData = [];
            if (bridgePoint) lowerData.push(bridgePoint);
            fp.forEach(p => lowerData.push({ time: this.adjustTime(p.time), value: p.p10 }));
            this.chronosLowerSeries.setData(lowerData);

            this.chartInstance.timeScale().fitContent();
        } catch (e) {
            console.warn("Chronos overlay warning:", e);
        }
    },

    toggleOrderBlocks(visible) {
        this.showOrderBlocks = visible;
        this.renderOrderBlocks();
    },

    toggleChronos(visible) {
        this.showChronos = visible;
        this.renderChronosOverlay();
    },

    toggleSignals(visible) {
        this.showSignals = visible;
        this.renderMarkers();
    }
};
