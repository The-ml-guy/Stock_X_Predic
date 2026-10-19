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


def get_stock_history(symbol: str, period: str = "1y", interval: str = "1d"):
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

    cache_key = f"history_{symbol}_{period}_{interval}"
    cached = _cache_get(cache_key, ttl=300)
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
        decimals = 4 if any(c in symbol for c in ["-USD", "=F"]) and df["Close"].iloc[-1] < 1 else 2
        
        records = []
        for idx, row in df.iterrows():
            t_val = int(idx.timestamp()) if is_intraday else idx.strftime("%Y-%m-%d")
            records.append({
                "time": t_val,
                "open": round(float(row["Open"]), decimals),
                "high": round(float(row["High"]), decimals),
                "low": round(float(row["Low"]), decimals),
                "close": round(float(row["Close"]), decimals),
                "volume": int(row["Volume"]),
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
