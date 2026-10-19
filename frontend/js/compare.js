let selectedSymbols = new Set();
let selectedDates = new Set();

const searchInput = document.getElementById('compareSearchInput');
const searchResults = document.getElementById('compareSearchResults');
const symbolsContainer = document.getElementById('selectedStocks');
const dateSelect = document.getElementById('dateSelect');
const addDateBtn = document.getElementById('addDateBtn');
const datesContainer = document.getElementById('selectedDates');
const runBtn = document.getElementById('runCompareBtn');
const resultsArea = document.getElementById('compareResults');

let searchTimeout;

// Stocks Selection
searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const results = await API.search(q);
        if (results && results.length > 0) {
            searchResults.innerHTML = results.map(r => `
                <div class="search-item" data-sym="${r.symbol}" data-name="${r.name}">
                    <div class="font-medium text-slate-200">${r.symbol}</div>
                    <div class="text-xs text-slate-500">${r.name} · ${r.sector}</div>
                </div>
            `).join('');
            searchResults.classList.remove('hidden');
        } else {
            searchResults.innerHTML = `<div class="p-4 text-sm text-slate-500 text-center">No stocks found</div>`;
            searchResults.classList.remove('hidden');
        }
    }, 300);
});

searchResults.addEventListener('click', (e) => {
    const item = e.target.closest('.search-item');
    if (!item) return;
    const sym = item.dataset.sym;
    const name = item.dataset.name;
    
    if (selectedSymbols.size >= 10) {
        alert("Maximum 10 stocks allowed for comparison.");
        return;
    }
    
    if (!selectedSymbols.has(sym)) {
        selectedSymbols.add(sym);
        renderSymbol(sym, name);
    }
    
    searchInput.value = '';
    searchResults.classList.add('hidden');
    updateRunBtnContext();
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#compareSearchBox')) {
        searchResults.classList.add('hidden');
    }
});

function renderSymbol(sym, name) {
    const badge = document.createElement('div');
    badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm';
    badge.innerHTML = `
        <span class="font-medium">${sym}</span>
        <button class="text-indigo-400 hover:text-indigo-200 focus:outline-none" onclick="removeSymbol('${sym}', this)">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    symbolsContainer.appendChild(badge);
    updateRunBtnContext();
}

window.removeSymbol = (sym, btn) => {
    selectedSymbols.delete(sym);
    btn.parentElement.remove();
    updateRunBtnContext();
};

// Dates Selection
addDateBtn.addEventListener('click', () => {
    const d = dateSelect.value;
    if (!d) return;
    
    if (selectedDates.size >= 10) {
        alert("Maximum 10 dates allowed.");
        return;
    }

    const year = parseInt(d.split('-')[0]);
    if (year < 2019 || year > 2026) {
        alert("Please select a date between 2019 and 2026.");
        return;
    }

    if (!selectedDates.has(d)) {
        selectedDates.add(d);
        renderDate(d);
    }
    dateSelect.value = '';
    updateRunBtnContext();
});

function renderDate(d) {
    const badge = document.createElement('div');
    badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm';
    badge.innerHTML = `
        <span class="font-medium">${new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <button class="text-emerald-400 hover:text-emerald-200 focus:outline-none" onclick="removeDate('${d}', this)">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    datesContainer.appendChild(badge);
}

window.removeDate = (d, btn) => {
    selectedDates.delete(d);
    btn.parentElement.remove();
    updateRunBtnContext();
};

function updateRunBtnContext() {
    runBtn.disabled = selectedSymbols.size === 0 || selectedDates.size === 0;
}

updateRunBtnContext();

// Run Comparison
runBtn.addEventListener('click', async () => {
    const syms = Array.from(selectedSymbols);
    const dts = Array.from(selectedDates).sort();
    
    runBtn.disabled = true;
    runBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline lg:block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...`;
    
    resultsArea.classList.remove('hidden');
    resultsArea.innerHTML = `<div class="glass-card p-8 flex justify-center"><div class="skeleton h-32 w-full max-w-lg rounded-xl"></div></div>`;
    
    const data = await API.compare(syms, dts);
    
    runBtn.disabled = false;
    runBtn.innerHTML = `Generate Comparison`;
    
    if (!data || data.length === 0) {
        resultsArea.innerHTML = `<div class="glass-card p-8 text-center text-slate-400">Failed to fetch comparison data. Try adjusting dates or removing unsupported stocks.</div>`;
        return;
    }
    
    renderResults(data, dts);
});

function renderResults(data, datesList) {
    let html = `
        <div class="flex justify-end pr-2">
            <button id="exportExcelBtn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Export to Excel
            </button>
        </div>
    `;
    
    data.forEach(stock => {
        const bgCls = changeBg(stock.changePercent);
        
        let rowHtml = `<div class="glass-card p-5 relative overflow-hidden group hover:border-white/[0.08] transition duration-300">`;
        
        // Header
        rowHtml += `
            <div class="flex items-start justify-between mb-6">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <h2 class="text-xl font-bold text-white">${stock.name}</h2>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-white/5 text-slate-400 border border-white/10 uppercase">${stock.symbol.replace('.NS', '')}</span>
                        ${stock.isNifty50 ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">NIFTY 50</span>` : ''}
                    </div>
                </div>
                <div class="text-right flex flex-col items-end">
                    <div class="px-3 py-1.5 rounded-lg ${bgCls} font-mono font-medium flex items-center justify-center gap-1 shrink-0">
                        ${stock.changePercent > 0 ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>` : ''}
                        ${stock.changePercent < 0 ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>` : ''}
                        <span>${formatPercent(stock.changePercent)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Data points timeline
        rowHtml += `<div class="grid grid-cols-2 sm:grid-cols-${Math.min(datesList.length, 5)} gap-4 mb-6">`;
        
        let firstPrice = null;
        stock.dataPoints.forEach(dp => {
            if (dp.price !== null && firstPrice === null) firstPrice = dp.price;
            
            const dtObj = new Date(dp.reqDate);
            const dtStr = dtObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            
            let pctHtml = '';
            if (dp.price !== null && firstPrice !== null && dp.price !== firstPrice) {
                const diffPct = ((dp.price - firstPrice) / firstPrice) * 100;
                const pColor = diffPct >= 0 ? 'text-emerald-400' : 'text-red-400';
                pctHtml = `<div class="text-[11px] font-bold ${pColor} mt-0.5">${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%</div>`;
            } else if (dp.price !== null && firstPrice !== null && dp.price === firstPrice && stock.dataPoints.indexOf(dp) !== 0) {
                 pctHtml = `<div class="text-[11px] font-bold text-slate-500 mt-0.5">0.00%</div>`;
            }
            
            rowHtml += `
                <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div class="text-xs text-slate-500 mb-1">${dtStr}</div>
                    <div class="font-mono text-slate-200">${dp.price !== null ? formatCurrency(dp.price) : '<span class="text-slate-600">No Data</span>'}</div>
                    ${pctHtml}
                    ${dp.actualDate && dp.actualDate !== dp.reqDate ? `<div class="text-[10px] text-slate-600 mt-1" title="Actual trading day">(from ${dp.actualDate})</div>` : ''}
                </div>
            `;
        });
        rowHtml += `</div>`;
        
        // Insight
        rowHtml += `
            <div class="p-4 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 flex gap-3 items-start">
                <div class="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span class="text-xs">✨</span>
                </div>
                <div class="text-sm text-indigo-100/80 leading-relaxed font-medium">
                    ${stock.insight || 'Insight not available.'}
                </div>
            </div>
        `;
        
        rowHtml += `</div>`;
        html += rowHtml;
    });
    
    resultsArea.innerHTML = html;
    
    document.getElementById('exportExcelBtn').addEventListener('click', () => exportToCSV(data, datesList));
}

function exportToCSV(data, datesList) {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    const header = ["Symbol", "Name", "NIFTY 50", "Overall Change %", "AI Insight"];
    datesList.forEach(d => {
        header.push(`Price on ${d}`);
        header.push(`Change % on ${d}`);
    });
    csvContent += header.join(",") + "\\n";
    
    // Rows
    data.forEach(stock => {
        const row = [
            stock.symbol,
            `"${stock.name.replace(/"/g, '""')}"`,
            stock.isNifty50 ? "Yes" : "No",
            stock.changePercent + "%",
            `"${(stock.insight || '').replace(/"/g, '""')}"`
        ];
        
        let firstPrice = null;
        stock.dataPoints.forEach(dp => {
            if (dp.price !== null && firstPrice === null) firstPrice = dp.price;
            
            row.push(dp.price !== null ? dp.price : "N/A");
            
            if (dp.price !== null && firstPrice !== null && dp.price !== firstPrice) {
                row.push(((dp.price - firstPrice)/firstPrice * 100).toFixed(2) + "%");
            } else if (dp.price !== null && firstPrice !== null && dp.price === firstPrice) {
                row.push("0.00%");
            } else {
                row.push("N/A");
            }
        });
        csvContent += row.join(",") + "\\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_comparison_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

