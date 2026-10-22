import yfinance as yf
import pandas as pd
import numpy as np
from ta.trend import SMAIndicator, EMAIndicator, MACD as MACDIndicator
from ta.momentum import RSIIndicator
from datetime import datetime, timedelta
import time, json, traceback

INDIAN_STOCKS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "sector": "IT"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "sector": "Banking"},
    {"symbol": "INFY.NS", "name": "Infosys", "sector": "IT"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "sector": "Banking"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever", "sector": "FMCG"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Banking"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel", "sector": "Telecom"},
    {"symbol": "ITC.NS", "name": "ITC Ltd", "sector": "FMCG"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "sector": "Banking"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro", "sector": "Infrastructure"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank", "sector": "Banking"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance", "sector": "Finance"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki", "sector": "Auto"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors", "sector": "Auto"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies", "sector": "IT"},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharma", "sector": "Pharma"},
    {"symbol": "WIPRO.NS", "name": "Wipro", "sector": "IT"},
    {"symbol": "TITAN.NS", "name": "Titan Company", "sector": "Consumer"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints", "sector": "Consumer"},
    {"symbol": "TATASTEEL.NS", "name": "Tata Steel", "sector": "Metals"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv", "sector": "Finance"},
    {"symbol": "NESTLEIND.NS", "name": "Nestle India", "sector": "FMCG"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement", "sector": "Cement"},
    {"symbol": "TECHM.NS", "name": "Tech Mahindra", "sector": "IT"},
    {"symbol": "ADANIENT.NS", "name": "Adani Enterprises", "sector": "Diversified"},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corp", "sector": "Power"},
    {"symbol": "NTPC.NS", "name": "NTPC Ltd", "sector": "Power"},
    {"symbol": "ONGC.NS", "name": "Oil & Natural Gas Corp", "sector": "Energy"},
    {"symbol": "JSWSTEEL.NS", "name": "JSW Steel", "sector": "Metals"},
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra", "sector": "Auto"},
    {"symbol": "COALINDIA.NS", "name": "Coal India", "sector": "Mining"},
    {"symbol": "DRREDDY.NS", "name": "Dr Reddy's Labs", "sector": "Pharma"},
    {"symbol": "CIPLA.NS", "name": "Cipla Ltd", "sector": "Pharma"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals", "sector": "Healthcare"},
    {"symbol": "EICHERMOT.NS", "name": "Eicher Motors", "sector": "Auto"},
    {"symbol": "DIVISLAB.NS", "name": "Divi's Laboratories", "sector": "Pharma"},
    {"symbol": "BPCL.NS", "name": "Bharat Petroleum", "sector": "Energy"},
    {"symbol": "GRASIM.NS", "name": "Grasim Industries", "sector": "Cement"},
    {"symbol": "TATACONSUM.NS", "name": "Tata Consumer Products", "sector": "FMCG"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp", "sector": "Auto"},
    {"symbol": "ADANIPORTS.NS", "name": "Adani Ports", "sector": "Infrastructure"},
    {"symbol": "BRITANNIA.NS", "name": "Britannia Industries", "sector": "FMCG"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto", "sector": "Auto"},
    {"symbol": "INDUSINDBK.NS", "name": "IndusInd Bank", "sector": "Banking"},
    {"symbol": "HINDALCO.NS", "name": "Hindalco Industries", "sector": "Metals"},
    {"symbol": "SBILIFE.NS", "name": "SBI Life Insurance", "sector": "Insurance"},
    {"symbol": "HDFCLIFE.NS", "name": "HDFC Life Insurance", "sector": "Insurance"},
    # AI & Cloud Ecosystem
    {"symbol": "PERSISTENT.NS", "name": "Persistent Systems", "sector": "AI & IT"},
    {"symbol": "LTIM.NS", "name": "LTIMindtree", "sector": "AI & IT"},
    {"symbol": "COFORGE.NS", "name": "Coforge", "sector": "AI & IT"},
    {"symbol": "CYIENT.NS", "name": "Cyient", "sector": "AI & IT"},
    # Semiconductors & Electronics Manufacturing
    {"symbol": "DIXON.NS", "name": "Dixon Technologies", "sector": "Semiconductors & EMS"},
    {"symbol": "KAYNES.NS", "name": "Kaynes Technology", "sector": "Semiconductors & EMS"},
    {"symbol": "CGPOWER.NS", "name": "CG Power & Industrial", "sector": "Semiconductors & EMS"},
    {"symbol": "TATAELXSI.NS", "name": "Tata Elxsi", "sector": "Semiconductors & EMS"},
    {"symbol": "SYRMA.NS", "name": "Syrma SGS Technology", "sector": "Semiconductors & EMS"},
    {"symbol": "ASMTEC.BO", "name": "ASM Technologies", "sector": "Semiconductors & EMS"},
    {"symbol": "MOSCHIP.BO", "name": "MosChip Technologies", "sector": "Semiconductors & EMS"},
    # Solar & Green Energy Transition
    {"symbol": "TATAPOWER.NS", "name": "Tata Power", "sector": "Solar & Clean Energy"},
    {"symbol": "ADANIGREEN.NS", "name": "Adani Green Energy", "sector": "Solar & Clean Energy"},
    {"symbol": "SUZLON.NS", "name": "Suzlon Energy", "sector": "Solar & Clean Energy"},
    {"symbol": "WAAREEENER.NS", "name": "Waaree Energies", "sector": "Solar & Clean Energy"},
    {"symbol": "PREMIERENE.NS", "name": "Premier Energies", "sector": "Solar & Clean Energy"},
    {"symbol": "KPIGREEN.NS", "name": "KPI Green Energy", "sector": "Solar & Clean Energy"},
    {"symbol": "JSWENERGY.NS", "name": "JSW Energy", "sector": "Solar & Clean Energy"},
    {"symbol": "IREDA.NS", "name": "IREDA", "sector": "Solar & Clean Energy"},
    {"symbol": "BORORENEW.NS", "name": "Borosil Renewables", "sector": "Solar & Clean Energy"},
    # Top Cryptocurrencies (Delta Exchange / USD)
    {"symbol": "BTC-USD", "name": "Bitcoin", "sector": "Crypto"},
    {"symbol": "ETH-USD", "name": "Ethereum", "sector": "Crypto"},
    {"symbol": "SOL-USD", "name": "Solana", "sector": "Crypto"},
    {"symbol": "BNB-USD", "name": "BNB Chain", "sector": "Crypto"},
    {"symbol": "XRP-USD", "name": "XRP (Ripple)", "sector": "Crypto"},
    {"symbol": "DOGE-USD", "name": "Dogecoin", "sector": "Crypto"},
    {"symbol": "ADA-USD", "name": "Cardano", "sector": "Crypto"},
    {"symbol": "AVAX-USD", "name": "Avalanche", "sector": "Crypto"},
    {"symbol": "LINK-USD", "name": "Chainlink", "sector": "Crypto"},
    {"symbol": "BCH-USD", "name": "Bitcoin Cash", "sector": "Crypto"},
    {"symbol": "NEAR-USD", "name": "NEAR Protocol", "sector": "Crypto"},
    {"symbol": "DOT-USD", "name": "Polkadot", "sector": "Crypto"},
    {"symbol": "TRX-USD", "name": "TRON", "sector": "Crypto"},
    {"symbol": "LTC-USD", "name": "Litecoin", "sector": "Crypto"},
    {"symbol": "INJ-USD", "name": "Injective", "sector": "Crypto"},
    {"symbol": "RENDER-USD", "name": "Render Token", "sector": "Crypto & AI"},
    {"symbol": "FET-USD", "name": "ASI Alliance (FET)", "sector": "Crypto & AI"},
    {"symbol": "XLM-USD", "name": "Stellar Lumens", "sector": "Crypto"},
    {"symbol": "ATOM-USD", "name": "Cosmos Hub", "sector": "Crypto"},
    {"symbol": "SHIB-USD", "name": "Shiba Inu", "sector": "Crypto"},
    # Commodities & Macro Assets
    {"symbol": "GC=F", "name": "Gold Bullion (XAU/USD)", "sector": "Commodities"},
    {"symbol": "SI=F", "name": "Silver (XAG/USD)", "sector": "Commodities"},
    {"symbol": "CL=F", "name": "Crude Oil (WTI)", "sector": "Commodities"},
]

INDICES = [
    {"symbol": "^NSEI", "name": "NIFTY 50"},
    {"symbol": "^BSESN", "name": "SENSEX"},
    {"symbol": "^NSEBANK", "name": "Bank NIFTY"},
]

# Simple in-memory cache
_cache = {}

def _cache_get(key, ttl=300):
    if key in _cache:
        val, ts = _cache[key]
        if time.time() - ts < ttl:
            return val
    return None

def _cache_set(key, val):
    _cache[key] = (val, time.time())


def search_stocks(query: str):
    q = query.lower()
    results = []
    for s in INDIAN_STOCKS:
        if q in s["symbol"].lower() or q in s["name"].lower() or q in s["sector"].lower():
            results.append(s)
    return results[:10]


INTERVAL_SECONDS_MAP = {
    "1m": 60,
    "2m": 120,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}

def get_stock_history(symbol: str, period: str = "1y", interval: str = "1d", only_completed: bool = False):
    # Clamp period based on interval limitations in yfinance
    if interval in ["5m", "1m", "2m"]:
        if period in ["1y", "2y", "5y", "max", "6mo", "3mo"]:
            period = "5d"
    elif interval in ["15m", "30m"]:
        if period in ["1y", "2y", "5y", "max", "6mo"]:
            period = "1mo"
    elif interval in ["1h", "4h"]:
        if period in ["1y", "2y", "5y", "max"]:
            period = "3mo"

    cache_key = f"history_{symbol}_{period}_{interval}_{only_completed}"
    cached = _cache_get(cache_key, ttl=180 if interval in ["1m", "5m"] else 300)
    if cached:
        return cached
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return None
        df = df.dropna(subset=["Open", "High", "Low", "Close"])
        if df.empty:
            return None
        
        is_intraday = interval in ["1m", "2m", "5m", "15m", "30m", "1h", "4h"]
        step_seconds = INTERVAL_SECONDS_MAP.get(interval, 86400)
        current_ts = time.time()
        
        decimals = 4 if any(c in symbol for c in ["-USD", "=F"]) and df["Close"].iloc[-1] < 1 else 2
        
        records = []
        n_rows = len(df)
        for i, (idx, row) in enumerate(df.iterrows()):
            t_val = int(idx.timestamp()) if is_intraday else idx.strftime("%Y-%m-%d")
            
            # Determine candle completion:
            # An intraday candle starting at t_val is completed only after t_val + step_seconds <= current_ts
            # For daily candles, check if the date is strictly prior to today's date in local market time
            if is_intraday:
                candle_start_ts = int(idx.timestamp())
                candle_end_ts = candle_start_ts + step_seconds
                is_completed = (candle_end_ts <= current_ts) or (i < n_rows - 1)
            else:
                candle_date = idx.strftime("%Y-%m-%d")
                today_date = datetime.now().strftime("%Y-%m-%d")
                # If market has closed today (> 15:30 IST), today's NSE candle is completed
                is_completed = (candle_date < today_date) or (i < n_rows - 1)

            if only_completed and not is_completed:
                continue

            records.append({
                "time": t_val,
                "open": round(float(row["Open"]), decimals),
                "high": round(float(row["High"]), decimals),
                "low": round(float(row["Low"]), decimals),
                "close": round(float(row["Close"]), decimals),
                "volume": int(row["Volume"]),
                "is_completed": is_completed,
            })
        _cache_set(cache_key, records)
        return records
    except Exception as e:
        traceback.print_exc()
        return None


def get_stock_quote(symbol: str):
    cache_key = f"quote_{symbol}"
    cached = _cache_get(cache_key, ttl=60)
    if cached:
        return cached
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        fast = ticker.fast_info
        name_lookup = {s["symbol"]: s["name"] for s in INDIAN_STOCKS}
        quote = {
            "symbol": symbol,
            "name": name_lookup.get(symbol, info.get("shortName", symbol)),
            "price": round(float(fast.get("lastPrice", info.get("currentPrice", 0))), 2),
            "previousClose": round(float(info.get("previousClose", info.get("regularMarketPreviousClose", 0))), 2),
            "open": round(float(info.get("open", info.get("regularMarketOpen", 0))), 2),
            "dayHigh": round(float(info.get("dayHigh", info.get("regularMarketDayHigh", 0))), 2),
            "dayLow": round(float(info.get("dayLow", info.get("regularMarketDayLow", 0))), 2),
            "volume": int(info.get("volume", info.get("regularMarketVolume", 0))),
            "marketCap": info.get("marketCap", 0),
            "pe": round(float(info.get("trailingPE", 0)), 2) if info.get("trailingPE") else None,
            "pb": round(float(info.get("priceToBook", 0)), 2) if info.get("priceToBook") else None,
            "week52High": round(float(info.get("fiftyTwoWeekHigh", 0)), 2),
            "week52Low": round(float(info.get("fiftyTwoWeekLow", 0)), 2),
            "dividendYield": round(float(info.get("dividendYield", 0)) * 100, 2) if info.get("dividendYield") else None,
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
        }
        quote["change"] = round(quote["price"] - quote["previousClose"], 2)
        quote["changePercent"] = round((quote["change"] / quote["previousClose"]) * 100, 2) if quote["previousClose"] else 0
        _cache_set(cache_key, quote)
        return quote
    except Exception as e:
        traceback.print_exc()
        return None


def get_indicators(symbol: str, period: str = "1y"):
    cache_key = f"indicators_{symbol}_{period}"
    cached = _cache_get(cache_key, ttl=600)
    if cached:
        return cached
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval="1d")
        if df.empty or len(df) < 30:
            return None
        close = df["Close"]
        df.index = df.index.tz_localize(None) if df.index.tz else df.index
        dates = [d.strftime("%Y-%m-%d") for d in df.index]

        rsi_series = RSIIndicator(close, window=14).rsi()
        macd_ind = MACDIndicator(close)
        macd_line = macd_ind.macd()
        macd_signal = macd_ind.macd_signal()
        macd_hist = macd_ind.macd_diff()
        sma20 = SMAIndicator(close, window=20).sma_indicator()
        sma50 = SMAIndicator(close, window=50).sma_indicator()
        sma200 = SMAIndicator(close, window=200).sma_indicator() if len(df) >= 200 else pd.Series([None]*len(df))

        def to_list(s):
            return [round(float(v), 2) if pd.notna(v) else None for v in s]

        result = {
            "dates": dates,
            "rsi": to_list(rsi_series),
            "macd": to_list(macd_line),
            "macdSignal": to_list(macd_signal),
            "macdHistogram": to_list(macd_hist),
            "sma20": to_list(sma20),
            "sma50": to_list(sma50),
            "sma200": to_list(sma200),
            "latestRSI": round(float(rsi_series.iloc[-1]), 2) if pd.notna(rsi_series.iloc[-1]) else None,
            "latestMACD": round(float(macd_line.iloc[-1]), 2) if pd.notna(macd_line.iloc[-1]) else None,
            "latestSignal": round(float(macd_signal.iloc[-1]), 2) if pd.notna(macd_signal.iloc[-1]) else None,
        }
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        traceback.print_exc()
        return None


def get_market_overview():
    cached = _cache_get("market_overview", ttl=120)
    if cached:
        return cached
    results = []
    for idx in INDICES:
        try:
            ticker = yf.Ticker(idx["symbol"])
            hist = ticker.history(period="2d")
            if len(hist) >= 2:
                prev = float(hist["Close"].iloc[-2])
                curr = float(hist["Close"].iloc[-1])
            elif len(hist) == 1:
                curr = float(hist["Close"].iloc[-1])
                prev = curr
            else:
                continue
            change = curr - prev
            results.append({
                "symbol": idx["symbol"],
                "name": idx["name"],
                "price": round(curr, 2),
                "change": round(change, 2),
                "changePercent": round((change / prev) * 100, 2) if prev else 0,
            })
        except:
            pass
    _cache_set("market_overview", results)
    return results


def get_gainers_losers():
    cached = _cache_get("gainers_losers", ttl=300)
    if cached:
        return cached
    movers = []
    # Use a subset for speed
    subset = INDIAN_STOCKS[:25]
    for s in subset:
        try:
            ticker = yf.Ticker(s["symbol"])
            hist = ticker.history(period="2d")
            if len(hist) < 2:
                continue
            prev = float(hist["Close"].iloc[-2])
            curr = float(hist["Close"].iloc[-1])
            change = curr - prev
            pct = (change / prev) * 100 if prev else 0
            movers.append({
                "symbol": s["symbol"],
                "name": s["name"],
                "sector": s["sector"],
                "price": round(curr, 2),
                "change": round(change, 2),
                "changePercent": round(pct, 2),
            })
        except:
            pass
    movers.sort(key=lambda x: x["changePercent"], reverse=True)
    result = {"gainers": movers[:5], "losers": movers[-5:][::-1]}
    if not movers:
        result = {"gainers": [], "losers": []}
    _cache_set("gainers_losers", result)
    return result


def get_sector_performance():
    cached = _cache_get("sectors", ttl=600)
    if cached:
        return cached
    sector_data = {}
    subset = INDIAN_STOCKS[:30]
    for s in subset:
        try:
            ticker = yf.Ticker(s["symbol"])
            hist = ticker.history(period="5d")
            if len(hist) < 2:
                continue
            prev = float(hist["Close"].iloc[0])
            curr = float(hist["Close"].iloc[-1])
            pct = ((curr - prev) / prev) * 100 if prev else 0
            sec = s["sector"]
            if sec not in sector_data:
                sector_data[sec] = {"performances": [], "count": 0}
            sector_data[sec]["performances"].append(pct)
            sector_data[sec]["count"] += 1
        except:
            pass
    result = []
    for sec, data in sector_data.items():
        avg = sum(data["performances"]) / len(data["performances"]) if data["performances"] else 0
        result.append({
            "sector": sec,
            "performance": round(avg, 2),
            "stockCount": data["count"],
        })
    result.sort(key=lambda x: x["performance"], reverse=True)
    _cache_set("sectors", result)
    return result


def get_comparison_data(symbols: list, dates: list):
    cache_key = f"compare_{'_'.join(symbols)}_{'_'.join(dates)}"
    cached = _cache_get(cache_key, ttl=3600)
    if cached:
        return cached

    if not symbols or not dates:
        return []

    try:
        s_dates = sorted(dates)
        min_date = s_dates[0]
        # Add 7 days padding to end date for weekends/holidays
        end_date_obj = datetime.strptime(s_dates[-1], "%Y-%m-%d") + timedelta(days=7)
        max_date_str = end_date_obj.strftime("%Y-%m-%d")
        
        results = []
        nifty_symbols = [s["symbol"] for s in INDIAN_STOCKS]
        
        for sym in symbols:
            try:
                ticker = yf.Ticker(sym)
                hist = ticker.history(start=min_date, end=max_date_str)
                if hist.empty:
                    continue
                    
                hist.index = hist.index.tz_localize(None) if hist.index.tz else hist.index
                
                info = {}
                for s in INDIAN_STOCKS:
                    if s["symbol"] == sym:
                        info = s
                        break
                
                sym_data = {
                    "symbol": sym,
                    "name": info.get("name", sym.replace(".NS", "")),
                    "isNifty50": sym in nifty_symbols,
                    "dataPoints": []
                }
                
                for d in s_dates:
                    target_date = pd.to_datetime(d)
                    past_data = hist[hist.index <= target_date]
                    if not past_data.empty:
                        closest_date = past_data.index[-1]
                        price = float(past_data["Close"].iloc[-1])
                        sym_data["dataPoints"].append({
                            "reqDate": d,
                            "actualDate": closest_date.strftime("%Y-%m-%d"),
                            "price": round(price, 2)
                        })
                    else:
                        # Fallback if target date is just before min_date slightly
                        future_data = hist[hist.index >= target_date]
                        if not future_data.empty:
                            closest_date = future_data.index[0]
                            price = float(future_data["Close"].iloc[0])
                            sym_data["dataPoints"].append({
                                "reqDate": d,
                                "actualDate": closest_date.strftime("%Y-%m-%d"),
                                "price": round(price, 2)
                            })
                        else:
                            sym_data["dataPoints"].append({
                                "reqDate": d,
                                "actualDate": None,
                                "price": None
                            })
                        
                valid_prices = [p["price"] for p in sym_data["dataPoints"] if p["price"] is not None]
                if len(valid_prices) >= 2:
                    first = valid_prices[0]
                    last = valid_prices[-1]
                    sym_data["changePercent"] = round(((last - first) / first) * 100, 2)
                else:
                    sym_data["changePercent"] = 0
                    
                results.append(sym_data)
            except Exception as e:
                traceback.print_exc()
                pass

        _cache_set(cache_key, results)
        return results
    except Exception as e:
        traceback.print_exc()
        return []


def calculate_buy_sell_signals(symbol: str, candles: list, indicators: dict = None, orderblocks: dict = None, chronos: dict = None, quote: dict = None) -> dict:
    """
    Computes algorithmic Buy & Sell signals combining:
    1. Smart Money Concepts (OB+ Demand / OB- Supply zones)
    2. Momentum & Oscillators (RSI 14 oversold/overbought recovery)
    3. Trend & Moving Averages (MACD crossover & SMA alignment)
    4. Chronos AI directional probabilistic path
    Returns actionable trade setup (entry, TP1, TP2, SL, R:R), historical chart markers, and 5-point indicator confluence.
    """
    if not candles or len(candles) < 10:
        return {
            "symbol": symbol,
            "action": "HOLD",
            "currentSignal": "HOLD / NEUTRAL",
            "confidence": 50,
            "verdictTitle": "Waiting for Sufficient Data",
            "verdictDescription": "Insufficient historical candles to calculate high-probability Buy/Sell signals.",
            "entryPrice": quote.get("price", 0) if quote else 0,
            "entryZone": "—",
            "stopLoss": 0,
            "target1": 0,
            "target2": 0,
            "riskRewardRatio": "—",
            "indicatorsBreakdown": [],
            "chartMarkers": []
        }

    closes = [float(c["close"]) for c in candles]
    highs = [float(c["high"]) for c in candles]
    lows = [float(c["low"]) for c in candles]
    current_price = closes[-1] if closes else (quote.get("price", 0) if quote else 0)

    # 1. Historical Signals for Chart Plotting
    chart_markers = []
    n = len(candles)
    min_spacing = 4  # minimum candle bars between consecutive signals
    last_signal_idx = -min_spacing

    # Calculate rolling RSI if not provided
    rsi_list = indicators.get("rsi") if (indicators and indicators.get("rsi")) else None
    if not rsi_list or len(rsi_list) < n:
        try:
            s_close = pd.Series(closes)
            rsi_calc = RSIIndicator(s_close, window=14).rsi().fillna(50).tolist()
            rsi_list = [round(float(v), 2) for v in rsi_calc]
        except Exception:
            rsi_list = [50] * n

    # Scan recent candles (up to last 100) for high-probability signals
    scan_start = max(15, n - 90)
    for i in range(scan_start, n):
        if i - last_signal_idx < min_spacing:
            continue

        c_time = candles[i]["time"]
        c_open = float(candles[i]["open"])
        c_high = float(candles[i]["high"])
        c_low = float(candles[i]["low"])
        c_close = float(candles[i]["close"])
        c_range = max(0.0001, c_high - c_low)
        lower_wick = min(c_open, c_close) - c_low
        upper_wick = c_high - max(c_open, c_close)
        
        curr_rsi = rsi_list[i] if i < len(rsi_list) else 50
        prev_rsi = rsi_list[i - 1] if i - 1 < len(rsi_list) else 50

        # Check OB confluence
        in_bull_ob = False
        in_bear_ob = False
        if orderblocks:
            for ob in orderblocks.get("unmitigatedBullish", []):
                if ob["low"] * 0.998 <= c_low <= ob["high"] * 1.002:
                    in_bull_ob = True
                    break
            for ob in orderblocks.get("unmitigatedBearish", []):
                if ob["low"] * 0.998 <= c_high <= ob["high"] * 1.002:
                    in_bear_ob = True
                    break

        # Bullish Signals:
        # Rebound from demand zone OR RSI turning up from oversold (<36) OR Strong Hammer Wick
        is_bull_rejection = (lower_wick / c_range > 0.40) and (c_close >= c_open)
        rsi_oversold_bounce = (prev_rsi <= 36 and curr_rsi > prev_rsi)
        is_bullish_engulf = (i > 0 and c_close > float(candles[i-1]["open"]) and float(candles[i-1]["close"]) < float(candles[i-1]["open"]) and (c_close - c_open) > (float(candles[i-1]["open"]) - float(candles[i-1]["close"])))

        if (in_bull_ob and is_bull_rejection) or (rsi_oversold_bounce and is_bull_rejection) or (in_bull_ob and is_bullish_engulf):
            chart_markers.append({
                "time": c_time,
                "type": "STRONG_BUY" if (in_bull_ob and rsi_oversold_bounce) else "BUY",
                "label": "STRONG BUY" if (in_bull_ob and rsi_oversold_bounce) else "BUY",
                "price": c_low,
                "position": "belowBar",
                "color": "#10b981",
                "shape": "arrowUp",
                "reason": "OB+ Demand Rejection" if in_bull_ob else "RSI Oversold Rebound"
            })
            last_signal_idx = i
            continue

        # Bearish Signals:
        # Rejection from supply zone OR RSI turning down from overbought (>66) OR Shooting star wick
        is_bear_rejection = (upper_wick / c_range > 0.40) and (c_close <= c_open)
        rsi_overbought_fall = (prev_rsi >= 66 and curr_rsi < prev_rsi)
        is_bearish_engulf = (i > 0 and c_close < float(candles[i-1]["open"]) and float(candles[i-1]["close"]) > float(candles[i-1]["open"]) and (c_open - c_close) > (float(candles[i-1]["close"]) - float(candles[i-1]["open"])))

        if (in_bear_ob and is_bear_rejection) or (rsi_overbought_fall and is_bear_rejection) or (in_bear_ob and is_bearish_engulf):
            chart_markers.append({
                "time": c_time,
                "type": "STRONG_SELL" if (in_bear_ob and rsi_overbought_fall) else "SELL",
                "label": "STRONG SELL" if (in_bear_ob and rsi_overbought_fall) else "SELL",
                "price": c_high,
                "position": "aboveBar",
                "color": "#f43f5e",
                "shape": "arrowDown",
                "reason": "OB- Supply Rejection" if in_bear_ob else "Overbought Exhaustion"
            })
            last_signal_idx = i

    # If markers are too sparse, add technical momentum cross markers
    if len(chart_markers) < 3 and n >= 30:
        for i in range(max(20, n - 60), n):
            if i - last_signal_idx < min_spacing:
                continue
            curr_rsi = rsi_list[i] if i < len(rsi_list) else 50
            prev_rsi = rsi_list[i-1] if i-1 < len(rsi_list) else 50
            if prev_rsi <= 35 and curr_rsi > 36:
                chart_markers.append({
                    "time": candles[i]["time"],
                    "type": "BUY",
                    "label": "BUY",
                    "price": float(candles[i]["low"]),
                    "position": "belowBar",
                    "color": "#10b981",
                    "shape": "arrowUp",
                    "reason": f"RSI Momentum Cross ({curr_rsi})"
                })
                last_signal_idx = i
            elif prev_rsi >= 68 and curr_rsi < 67:
                chart_markers.append({
                    "time": candles[i]["time"],
                    "type": "SELL",
                    "label": "SELL",
                    "price": float(candles[i]["high"]),
                    "position": "aboveBar",
                    "color": "#f43f5e",
                    "shape": "arrowDown",
                    "reason": f"RSI Overbought Drop ({curr_rsi})"
                })
                last_signal_idx = i

    # Sort markers chronologically
    chart_markers.sort(key=lambda m: str(m["time"]))

    # 2. Compute Active Current Signal & Detailed Setup
    latest_rsi = rsi_list[-1] if rsi_list else 50
    score = 50  # 0 to 100 scale

    # RSI Impact
    if latest_rsi < 35:
        score += 20
        rsi_badge = "BULLISH (OVERSOLD)"
        rsi_desc = f"RSI at {latest_rsi:.1f} indicates deep accumulation zone with oversold bounce potential."
    elif latest_rsi < 48:
        score += 8
        rsi_badge = "BULLISH BIAS"
        rsi_desc = f"RSI at {latest_rsi:.1f} is recovering from discount levels."
    elif latest_rsi > 70:
        score -= 20
        rsi_badge = "BEARISH (OVERBOUGHT)"
        rsi_desc = f"RSI at {latest_rsi:.1f} reflects extreme overbought momentum, elevated risk of pullback."
    elif latest_rsi > 58:
        score -= 5
        rsi_badge = "NEUTRAL / CAUTION"
        rsi_desc = f"RSI at {latest_rsi:.1f} shows expansion towards upper bounds."
    else:
        rsi_badge = "NEUTRAL"
        rsi_desc = f"RSI at {latest_rsi:.1f} is balanced in the mid-range."

    # MACD Impact
    macd_val = indicators.get("latestMACD") if indicators else None
    macd_sig = indicators.get("latestSignal") if indicators else None
    if macd_val is not None and macd_sig is not None:
        if macd_val > macd_sig:
            score += 15
            macd_badge = "BULLISH CROSS"
            macd_desc = f"MACD ({macd_val:.2f}) is trending above signal line ({macd_sig:.2f})."
        else:
            score -= 15
            macd_badge = "BEARISH CROSS"
            macd_desc = f"MACD ({macd_val:.2f}) is trailing below signal line ({macd_sig:.2f})."
    else:
        macd_badge = "NEUTRAL"
        macd_desc = "MACD momentum is flat or consolidating."

    # Trend / Moving Average Impact
    sma50 = indicators.get("sma50") if indicators else None
    latest_sma50 = sma50[-1] if (sma50 and sma50[-1] is not None) else None
    if latest_sma50 is not None:
        if current_price >= latest_sma50:
            score += 10
            trend_badge = "UPTREND"
            trend_desc = f"Price (₹{current_price:,.2f}) holds above the 50-period SMA (₹{latest_sma50:,.2f})."
        else:
            score -= 10
            trend_badge = "DOWNTREND"
            trend_desc = f"Price (₹{current_price:,.2f}) trades below the 50-period SMA (₹{latest_sma50:,.2f})."
    else:
        trend_badge = "NEUTRAL"
        trend_desc = "Trend baseline is consolidating."

    # SMC Order Block Confluence
    near_bull_ob = False
    near_bear_ob = False
    ob_badge = "NEUTRAL EQUILIBRIUM"
    ob_desc = "Price is currently trading in the middle of dealing range."
    if orderblocks:
        zone = orderblocks.get("zone", "EQUILIBRIUM")
        bull_obs = orderblocks.get("unmitigatedBullish", [])
        bear_obs = orderblocks.get("unmitigatedBearish", [])
        if bull_obs and abs(current_price - bull_obs[0]["high"]) / current_price < 0.03:
            score += 20
            near_bull_ob = True
            ob_badge = "BULLISH DEMAND (OB+)"
            ob_desc = f"Institutional accumulation resting between ₹{bull_obs[0]['low']:,.2f} - ₹{bull_obs[0]['high']:,.2f}."
        elif bear_obs and abs(current_price - bear_obs[0]["low"]) / current_price < 0.03:
            score -= 20
            near_bear_ob = True
            ob_badge = "BEARISH SUPPLY (OB-)"
            ob_desc = f"Institutional supply barrier active between ₹{bear_obs[0]['low']:,.2f} - ₹{bear_obs[0]['high']:,.2f}."
        elif "DISCOUNT" in zone:
            score += 10
            ob_badge = "DISCOUNT ZONE"
            ob_desc = "Trading below 50% equilibrium in favorable accumulation territory."
        elif "PREMIUM" in zone:
            score -= 10
            ob_badge = "PREMIUM ZONE"
            ob_desc = "Trading above 50% equilibrium in distribution territory."

    # Chronos AI Forecasting Impact
    c_conv = 50
    if chronos and chronos.get("direction"):
        c_dir = chronos.get("direction", "NEUTRAL").upper()
        c_conv = chronos.get("directionalConviction", 50)
        c_return = chronos.get("expectedReturnPct", 0)
        if "BULLISH" in c_dir:
            score += int(15 * (c_conv / 100.0))
            ai_badge = f"BULLISH (+{c_return}%)"
            ai_desc = f"Chronos zero-shot engine projects {c_conv:.1f}% probability of upward trajectory."
        elif "BEARISH" in c_dir:
            score -= int(15 * (c_conv / 100.0))
            ai_badge = f"BEARISH ({c_return}%)"
            ai_desc = f"Chronos zero-shot engine projects {c_conv:.1f}% probability of downward path."
        else:
            ai_badge = "NEUTRAL CHOP"
            ai_desc = "Chronos projections show balanced sideways distribution."
    else:
        ai_badge = "ANALYZING"
        ai_desc = "Probabilistic forecasting calibrating with volatility regime."

    # Final Classification
    score = max(10, min(95, score))
    if score >= 75:
        action = "BUY"
        current_signal = "STRONG BUY"
        signal_color = "#10b981"
        verdict_title = "🟢 STRONG BUY — High-Confluence Institutional Accumulation"
        verdict_desc = f"High confluence detected: Institutional buyers defending key demand while momentum indicators align for continuation. Favorable risk/reward to accumulate."
    elif score >= 60:
        action = "BUY"
        current_signal = "BUY"
        signal_color = "#10b981"
        verdict_title = "🟢 BUY SIGNAL — Positive Trend & Momentum Bias"
        verdict_desc = f"Bullish structure intact with RSI and trend indicators pointing upward. Look for pullbacks into support for high-quality entries."
    elif score <= 28:
        action = "SELL"
        current_signal = "STRONG SELL"
        signal_color = "#f43f5e"
        verdict_title = "🔴 STRONG SELL — Supply Barrier & Bearish Momentum"
        verdict_desc = f"Heavy institutional distribution detected near resistance. Elevated risk of breakdown; protect capital or tighten trailing stop losses."
    elif score <= 42:
        action = "SELL"
        current_signal = "SELL"
        signal_color = "#f43f5e"
        verdict_title = "🔴 SELL SIGNAL — Overbought / Resistance Rejection"
        verdict_desc = f"Price is reacting to supply overhang or fading momentum. Wait for clearer accumulation structure before initiating long positions."
    else:
        action = "HOLD"
        current_signal = "HOLD / NEUTRAL"
        signal_color = "#f59e0b"
        verdict_title = "🟡 HOLD / WAIT — Range Equilibrium Consolidation"
        verdict_desc = f"Price is balanced inside the dealing range without decisive institutional displacement. Best practice is to wait for a breakout or sweep of key liquidity levels."

    # Compute Tactical Trade Setup Levels
    is_usd = any(c in symbol for c in ["-USD", "=F"])
    currency_symbol = "$" if is_usd else "₹"
    decimals = 4 if is_usd and current_price < 1 else 2

    # Entry Zone: current price +/- 0.4%
    entry_low = round(current_price * 0.995, decimals)
    entry_high = round(current_price * 1.004, decimals)
    entry_zone_str = f"{currency_symbol}{entry_low:,.{decimals}f} – {currency_symbol}{entry_high:,.{decimals}f}"

    if action == "BUY":
        # Stop loss below nearest OB low or 1.8% below price
        sl = round(current_price * 0.982, decimals)
        if orderblocks and orderblocks.get("unmitigatedBullish"):
            nearest_ob_low = float(orderblocks["unmitigatedBullish"][0]["low"])
            if nearest_ob_low < current_price:
                sl = round(nearest_ob_low * 0.995, decimals)
        tp1 = round(current_price + (current_price - sl) * 1.8, decimals)
        tp2 = round(current_price + (current_price - sl) * 3.0, decimals)
        rr_str = "1:2.4"
    elif action == "SELL":
        sl = round(current_price * 1.018, decimals)
        if orderblocks and orderblocks.get("unmitigatedBearish"):
            nearest_ob_high = float(orderblocks["unmitigatedBearish"][0]["high"])
            if nearest_ob_high > current_price:
                sl = round(nearest_ob_high * 1.005, decimals)
        tp1 = round(current_price - (sl - current_price) * 1.8, decimals)
        tp2 = round(current_price - (sl - current_price) * 3.0, decimals)
        rr_str = "1:2.2"
    else:
        sl = round(current_price * 0.985, decimals)
        tp1 = round(current_price * 1.025, decimals)
        tp2 = round(current_price * 1.045, decimals)
        rr_str = "1:1.7"

    indicators_breakdown = [
        {"name": "RSI (14)", "value": f"{latest_rsi:.1f}", "status": rsi_desc, "badge": rsi_badge, "isBullish": "BULLISH" in rsi_badge, "isBearish": "BEARISH" in rsi_badge},
        {"name": "MACD Trend", "value": f"{macd_val:.2f}" if macd_val is not None else "0.00", "status": macd_desc, "badge": macd_badge, "isBullish": "BULLISH" in macd_badge, "isBearish": "BEARISH" in macd_badge},
        {"name": "50 SMA Baseline", "value": f"{currency_symbol}{latest_sma50:,.{decimals}f}" if latest_sma50 else "—", "status": trend_desc, "badge": trend_badge, "isBullish": "UPTREND" in trend_badge, "isBearish": "DOWNTREND" in trend_badge},
        {"name": "SMC Order Block", "value": ob_badge, "status": ob_desc, "badge": ob_badge, "isBullish": "BULLISH" in ob_badge or "DISCOUNT" in ob_badge, "isBearish": "BEARISH" in ob_badge or "PREMIUM" in ob_badge},
        {"name": "Chronos AI Forecast", "value": f"{c_conv:.0f}% Conviction", "status": ai_desc, "badge": ai_badge, "isBullish": "BULLISH" in ai_badge, "isBearish": "BEARISH" in ai_badge},
    ]

    return {
        "symbol": symbol,
        "action": action,
        "currentSignal": current_signal,
        "confidence": score,
        "signalColor": signal_color,
        "verdictTitle": verdict_title,
        "verdictDescription": verdict_desc,
        "entryPrice": current_price,
        "entryZone": entry_zone_str,
        "stopLoss": sl,
        "target1": tp1,
        "target2": tp2,
        "riskRewardRatio": rr_str,
        "indicatorsBreakdown": indicators_breakdown,
        "chartMarkers": chart_markers
    }

