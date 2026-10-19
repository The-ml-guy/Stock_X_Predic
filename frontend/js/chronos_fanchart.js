/**
 * Interactive Chronos Probabilistic Fan Chart Canvas Component
 * Renders multi-quantile predictive distributions (p10, p25, p50, p75, p90)
 */
const ChronosFanChart = {
    render(containerId, chronosData) {
        const container = document.getElementById(containerId);
        if (!container || !chronosData || !chronosData.forecastPoints) return;
        
        const fp = chronosData.forecastPoints;
        const history = chronosData.historyAnchor || [];
        
        const width = container.clientWidth || 600;
        const height = container.clientHeight || 260;
        const padding = { top: 25, right: 65, bottom: 35, left: 55 };
        
        // Find price min and max across history and quantiles
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        
        history.forEach(h => {
            if (h.price < minPrice) minPrice = h.price;
            if (h.price > maxPrice) maxPrice = h.price;
        });
        
        fp.forEach(p => {
            if (p.p10 < minPrice) minPrice = p.p10;
            if (p.p90 > maxPrice) maxPrice = p.p90;
        });
        
        // Add 3% margin
        const priceMargin = (maxPrice - minPrice) * 0.05 || 10;
        minPrice -= priceMargin;
        maxPrice += priceMargin;
        
        const totalPoints = history.length + fp.length;
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        const getX = (index) => padding.left + (index / (totalPoints - 1)) * plotWidth;
        const getY = (price) => padding.top + plotHeight - ((price - minPrice) / (maxPrice - minPrice)) * plotHeight;
        
        const histOffset = history.length - 1;
        const originX = getX(histOffset);
        const originY = getY(chronosData.lastPrice);
        
        // Build SVG paths
        // 1. History line
        let histPath = '';
        history.forEach((h, i) => {
            const x = getX(i);
            const y = getY(h.price);
            histPath += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
        });
        
        // 2. Outer Fan Area (p10 to p90)
        let outerFan = `M ${originX} ${originY}`;
        fp.forEach((p, i) => {
            outerFan += ` L ${getX(histOffset + 1 + i)} ${getY(p.p90)}`;
        });
        for (let i = fp.length - 1; i >= 0; i--) {
            outerFan += ` L ${getX(histOffset + 1 + i)} ${getY(fp[i].p10)}`;
        }
        outerFan += ` Z`;
        
        // 3. Inner Fan Area (p25 to p75)
        let innerFan = `M ${originX} ${originY}`;
        fp.forEach((p, i) => {
            innerFan += ` L ${getX(histOffset + 1 + i)} ${getY(p.p75)}`;
        });
        for (let i = fp.length - 1; i >= 0; i--) {
            innerFan += ` L ${getX(histOffset + 1 + i)} ${getY(fp[i].p25)}`;
        }
        innerFan += ` Z`;
        
        // 4. Median line (p50)
        let medianPath = `M ${originX} ${originY}`;
        fp.forEach((p, i) => {
            medianPath += ` L ${getX(histOffset + 1 + i)} ${getY(p.p50)}`;
        });
        
        const cSign = (chronosData.symbol && (chronosData.symbol.endsWith('-USD') || chronosData.symbol.includes('=F'))) ? '$' : '₹';
        const formatTick = (v) => {
            if (v < 1) return v.toFixed(4);
            if (v < 10) return v.toFixed(2);
            return Math.round(v).toLocaleString();
        };
        
        // Y-axis grid values
        const yTicks = 4;
        let gridLines = '';
        for (let i = 0; i <= yTicks; i++) {
            const val = minPrice + (i / yTicks) * (maxPrice - minPrice);
            const y = getY(val);
            gridLines += `
                <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-dasharray="3,3" />
                <text x="${width - padding.right + 6}" y="${y + 4}" fill="#64748b" font-size="10" font-family="JetBrains Mono, monospace">${cSign}${formatTick(val)}</text>
            `;
        }
        
        // Horizon vertical divider line
        const hzText = chronosData.horizon ? ` [${chronosData.horizon}]` : '';
        const dividerLine = `
            <line x1="${originX}" y1="${padding.top}" x2="${originX}" y2="${height - padding.bottom}" stroke="rgba(0,242,254,0.4)" stroke-dasharray="4,4" />
            <text x="${originX - 6}" y="${padding.top - 6}" fill="#94a3b8" font-size="9" text-anchor="end" font-family="JetBrains Mono">HISTORICAL</text>
            <text x="${originX + 6}" y="${padding.top - 6}" fill="#00f2fe" font-size="9" font-family="JetBrains Mono">CHRONOS FORECAST CONE${hzText} ➔</text>
        `;

        const endX = getX(totalPoints - 1);
        const endP50Y = getY(chronosData.targetMedian);
        const endP90Y = getY(chronosData.bullishTargetP90);
        const endP10Y = getY(chronosData.bearishSupportP10);

        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" class="overflow-visible select-none">
                <defs>
                    <linearGradient id="outerConeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35" />
                        <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.12" />
                    </linearGradient>
                    <linearGradient id="innerConeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.55" />
                        <stop offset="100%" stop-color="#a855f7" stop-opacity="0.3" />
                    </linearGradient>
                </defs>
                
                ${gridLines}
                ${dividerLine}
                
                <!-- Outer 90% corridor -->
                <path d="${outerFan}" fill="url(#outerConeGrad)" />
                <!-- Inner 50% corridor -->
                <path d="${innerFan}" fill="url(#innerConeGrad)" />
                
                <!-- Historical path -->
                <path d="${histPath}" fill="none" stroke="#94a3b8" stroke-width="1.8" />
                
                <!-- Chronos Median trajectory -->
                <path d="${medianPath}" fill="none" stroke="#00f2fe" stroke-width="2.2" stroke-linecap="round" />
                
                <!-- Terminal markers -->
                <circle cx="${endX}" cy="${endP50Y}" r="4" fill="#00f2fe" />
                <circle cx="${endX}" cy="${endP90Y}" r="3" fill="#38bdf8" />
                <circle cx="${endX}" cy="${endP10Y}" r="3" fill="#f43f5e" />
                
                <!-- Endpoint Label Pill -->
                <g transform="translate(${endX - 55}, ${endP50Y - 24})">
                    <rect width="72" height="18" rx="4" fill="#0f172a" stroke="#00f2fe" stroke-width="1" />
                    <text x="36" y="13" fill="#00f2fe" font-size="10" font-weight="bold" text-anchor="middle" font-family="JetBrains Mono">${cSign}${chronosData.targetMedian}</text>
                </g>
            </svg>
        `;
    }
};
