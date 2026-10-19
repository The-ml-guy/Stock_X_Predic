import os
from typing import Optional, List, Dict, Any
from pathlib import Path
from pydantic import BaseModel
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import stock_service
import ai_service
import news_service
import orderblock_service
import chronos_service
import industry_service
import backtest_service

app = FastAPI(title="Stock_X Market Intelligence & Forecasting Terminal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# ─── API Routes ───────────────────────────────────────────

@app.get("/api/stocks/search")
def search(q: str = Query(..., min_length=1)):
    return stock_service.search_stocks(q)

@app.get("/api/stocks/{symbol}/history")
def history(symbol: str, period: str = "1y", interval: str = "1d"):
    data = stock_service.get_stock_history(symbol, period, interval)
    if data is None:
        raise HTTPException(404, "Stock data not found")
    return data

@app.get("/api/stocks/{symbol}/quote")
def quote(symbol: str):
    data = stock_service.get_stock_quote(symbol)
    if data is None:
        raise HTTPException(404, "Quote not found")
    return data

@app.get("/api/stocks/{symbol}/indicators")
def indicators(symbol: str, period: str = "1y"):
    data = stock_service.get_indicators(symbol, period)
    if data is None:
        raise HTTPException(404, "Indicator data not found")
    return data

@app.get("/api/stocks/{symbol}/orderblocks")
def get_order_blocks(symbol: str, lookback: int = 150, interval: str = "1d", period: Optional[str] = None):
    if not period:
        period = "5d" if interval in ["1m", "5m"] else ("1mo" if interval in ["15m", "30m"] else ("3mo" if interval in ["1h", "4h"] else "1y"))
    candles = stock_service.get_stock_history(symbol, period=period, interval=interval)
    if not candles:
        raise HTTPException(404, "Candle history not available for Order Block detection")
    return orderblock_service.detect_order_blocks(candles, lookback)

@app.get("/api/stocks/{symbol}/chronos-forecast")
def get_chronos_forecast(symbol: str, horizon: int = 10, interval: str = "1d", period: Optional[str] = None):
    if not period:
        period = "5d" if interval in ["1m", "5m"] else ("1mo" if interval in ["15m", "30m"] else ("3mo" if interval in ["1h", "4h"] else "1y"))
    candles = stock_service.get_stock_history(symbol, period=period, interval=interval)
    if not candles:
        raise HTTPException(404, "Candle history not available for Chronos forecasting")
    return chronos_service.generate_chronos_forecast(candles, symbol, prediction_length=horizon, interval=interval)

@app.get("/api/stocks/{symbol}/analysis")
def analysis(symbol: str, interval: str = "1d"):
    period = "5d" if interval in ["1m", "5m"] else ("1mo" if interval in ["15m", "30m"] else "1y")
    q = stock_service.get_stock_quote(symbol)
    ind = stock_service.get_indicators(symbol, "1y")
    candles = stock_service.get_stock_history(symbol, period=period, interval=interval)
    
    ob_data = orderblock_service.detect_order_blocks(candles, 120) if candles else None
    chronos_data = chronos_service.generate_chronos_forecast(candles, symbol, 10, interval=interval) if candles else None
    
    result = ai_service.analyze_institutional(symbol, q, ind, ob_data, chronos_data)
    return result

@app.get("/api/stocks/{symbol}/backtest")
def run_backtest(
    symbol: str, 
    strategy: str = "ob_retest", 
    interval: str = "1d", 
    period: Optional[str] = None,
    risk_reward: float = 2.0,
    stop_loss: float = 1.2
):
    if not period:
        period = "5d" if interval in ["1m", "5m"] else ("1mo" if interval in ["15m", "30m"] else "1y")
    candles = stock_service.get_stock_history(symbol, period=period, interval=interval)
    if not candles:
        raise HTTPException(404, "Candle history not available for backtesting")
    return backtest_service.run_orderblock_backtest(
        candles, symbol, strategy=strategy, risk_reward_ratio=risk_reward, stop_loss_buffer_pct=stop_loss
    )

@app.get("/api/terminal/master/{symbol}")
def terminal_master(symbol: str, horizon: int = 10, interval: str = "1d", period: Optional[str] = None):
    """Unified ultra-fast master endpoint powering the institutional Orderblock terminal."""
    if not period:
        if interval in ["1m", "5m"]:
            period = "5d"
        elif interval in ["15m", "30m"]:
            period = "1mo"
        elif interval in ["1h", "4h"]:
            period = "3mo"
        else:
            period = "1y"

    candles = stock_service.get_stock_history(symbol, period=period, interval=interval)
    if not candles:
        raise HTTPException(404, "Stock data not found")
        
    q = stock_service.get_stock_quote(symbol)
    ind = stock_service.get_indicators(symbol, "1y")
    ob = orderblock_service.detect_order_blocks(candles, 120)
    chronos = chronos_service.generate_chronos_forecast(candles, symbol, prediction_length=horizon, interval=interval)
    ai_analysis = ai_service.analyze_institutional(symbol, q, ind, ob, chronos)
    
    name_map = {s["symbol"]: s["name"] for s in stock_service.INDIAN_STOCKS}
    name = name_map.get(symbol, symbol.replace(".NS", "").replace(".BO", ""))
    news = news_service.get_stock_news(name, symbol)
    
    return {
        "symbol": symbol,
        "interval": interval,
        "period": period,
        "quote": q,
        "candles": candles,
        "indicators": ind,
        "orderblocks": ob,
        "chronos": chronos,
        "ai": ai_analysis,
        "news": news
    }

@app.get("/api/industry/overview")
def industry_overview():
    return industry_service.get_industry_overview()

@app.get("/api/industry/{sector_id}/news")
def industry_news(sector_id: str, limit: int = 15):
    return industry_service.get_sector_news(sector_id, limit)

@app.get("/api/llm/status")
def llm_status():
    return ai_service.check_local_llm_status()

@app.get("/api/stocks/{symbol}/news")
def news(symbol: str):
    name_map = {s["symbol"]: s["name"] for s in stock_service.INDIAN_STOCKS}
    name = name_map.get(symbol, symbol.replace(".NS", "").replace(".BO", ""))
    return news_service.get_stock_news(name, symbol)

@app.get("/api/stocks/{symbol}/backtest")
def run_backtest(
    symbol: str,
    strategy: str = "ob_retest",
    interval: str = "5m",
    risk_reward: float = 2.0,
    stop_loss: float = 1.2
):
    # Fetch candles according to interval (use 7d for ultra-fast 5m/15m loading)
    period = "7d" if interval in ["5m", "15m"] else ("30d" if interval in ["30m", "1h"] else "1y")
    candles = stock_service.get_stock_history(symbol, period=period, interval=interval)
    if not candles:
        candles = stock_service.get_stock_history(symbol, period="5d" if interval == "5m" else "1mo", interval=interval)
    if not candles or len(candles) < 25:
        raise HTTPException(status_code=400, detail="Insufficient candle data to run backtest simulation.")
    
    return backtest_service.run_vectorbt_backtest(
        candles=candles,
        symbol=symbol,
        strategy=strategy,
        risk_reward_ratio=risk_reward,
        stop_loss_buffer_pct=stop_loss
    )

@app.get("/api/market/overview")
def market_overview():
    return stock_service.get_market_overview()

@app.get("/api/market/movers")
def movers():
    return stock_service.get_gainers_losers()

@app.get("/api/market/sectors")
def sectors():
    return stock_service.get_sector_performance()

class CompareRequest(BaseModel):
    symbols: list[str]
    dates: list[str]

@app.post("/api/stocks/compare")
def compare_stocks(req: CompareRequest):
    if not req.symbols or not req.dates:
        raise HTTPException(400, "Missing symbols or dates")
    if len(req.dates) > 10:
        raise HTTPException(400, "Max 10 dates allowed")
        
    results = stock_service.get_comparison_data(req.symbols, req.dates)
    s_dates = sorted(req.dates)
    start_d = s_dates[0]
    end_d = s_dates[-1]
    
    for r in results:
        valid_points = [p for p in r["dataPoints"] if p["price"] is not None]
        if len(valid_points) >= 2:
            start_p = valid_points[0]["price"]
            end_p = valid_points[-1]["price"]
            r["insight"] = ai_service.analyze_comparison(r["symbol"], start_d, end_d, start_p, end_p)
        else:
            r["insight"] = "Not enough data to generate insight."
            
    return results

# ─── Frontend Serving ─────────────────────────────────────

@app.get("/")
def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

@app.get("/stock")
def serve_stock(symbol: str = ""):
    if symbol:
        return RedirectResponse(f"/?symbol={symbol}")
    return RedirectResponse("/")

@app.get("/terminal")
def serve_terminal():
    return RedirectResponse("/")

@app.get("/compare")
def serve_compare():
    return FileResponse(str(FRONTEND_DIR / "compare.html"))

app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")

if __name__ == "__main__":
    import uvicorn
    print("\n  🚀 Stock_X Market Intelligence & Forecasting Terminal running at http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
