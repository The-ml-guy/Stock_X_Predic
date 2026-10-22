# ⚡ Stock_X — Orderblock & Chronos Institutional Terminal

Institutional Market Intelligence & Time Series Forecasting Terminal for Indian Equities (NSE/BSE), combining **Smart Money Concepts (SMC) Order Blocks**, **Amazon Chronos Probabilistic Forecasting**, and **Local AI Synthesis** (LM Studio / Qwen / Bonsai) across high-conviction tech sectors (**AI & Cloud, Semiconductors, and Solar Energy**).

Inspired by the design and analytical depth of [Orderblock](https://order-block.com/).

---

## 🚀 Quick Start

```powershell
# 1. Activate Python virtual environment
.\.venv\Scripts\Activate.ps1

# 2. Run the institutional terminal
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🎯 Key Architectural Pillars

### 1. 🕯️ Smart Money Concepts (SMC) & Order Blocks
- **Bullish Order Blocks (OB+)**: Algorithmic detection of the last bearish accumulation candle prior to institutional market structure shift (BOS / MSS) upward. Shaded in glowing cyan/emerald.
- **Bearish Order Blocks (OB-)**: Algorithmic detection of the last bullish distribution candle prior to aggressive displacement downward. Shaded in glowing rose.
- **Fair Value Gaps (FVG)**: Identifies 3-candle imbalance liquidity voids.
- **Dealing Range & Equilibrium**: Real-time 50% equilibrium line distinguishing the **Discount (Accumulation) Zone** from the **Premium (Distribution) Zone**.
- **Mitigation Tracking**: Distinguishes unmitigated fresh zones from tested zones.

### 2. 🔮 Amazon Chronos Zero-Shot Probabilistic Forecaster
- **Language Model Architecture for Time Series**: Utilizes quantized zero-shot autoregressive forecasting (Chronos-Bolt / Chronos-T5 methodology).
- **Quantile Fan Chart Projection**:
  - **$p_{50}$ Median Path**: Expected baseline trajectory.
  - **$p_{25} - p_{75}$ Corridor**: 50% interquartile probability density.
  - **$p_{10} - p_{90}$ Corridor**: 80% confidence corridor.
- **Directional Bias & Conviction**: Real-time probabilistic conviction meter (e.g., 78.5% Bullish Conviction) with target upside/downside percentages.
- **Selectable Horizons**: Instant toggle between 5, 10, and 20 trading sessions.

### 3. 🧠 Local AI Model Integration (LM Studio / Ollama)
- **Direct Local Inference**: Connects automatically to your local LM Studio (`http://localhost:1234/v1`) or Ollama (`http://localhost:11434/v1`).
- **Zero VRAM Contention**: Runs high-speed local models (such as `Qwen3-4B` or `bonsai-8b`) on your GPU without heavy forecasting overhead.
- **Institutional Synthesis**: Synthesizes live Order Block levels, Chronos quantile paths, and FinBERT news catalysts into clear executive briefs and trading setups.
- **HUD Latency & Model Ping**: Displays active local model name and ping latency in the top terminal bar.

### 4. 🌐 Indian Industry Intelligence
- **🤖 Artificial Intelligence & Cloud**:
  - `TCS.NS`, `INFY.NS`, `HCLTECH.NS`, `TECHM.NS`, `PERSISTENT.NS`, `LTIM.NS`, `COFORGE.NS`.
  - Tracks India AI Mission compute tenders, enterprise GenAI deployments, and private LLMs.
- **⚡ Semiconductors & Electronics Manufacturing (EMS)**:
  - `DIXON.NS`, `KAYNES.NS`, `CGPOWER.NS`, `TATAELXSI.NS`, `SYRMA.NS`, `ASMTEC.BO`, `MOSCHIP.BO`.
  - Tracks India Semiconductor Mission (ISM 2.0), OSAT/ATMP chip packaging units in Gujarat, and PLI schemes.
- **☀️ Solar Energy & Green Transition**:
  - `TATAPOWER.NS`, `ADANIGREEN.NS`, `SUZLON.NS`, `WAAREEENER.NS`, `PREMIERENE.NS`, `KPIGREEN.NS`, `JSWENERGY.NS`, `IREDA.NS`.
  - Tracks PM Surya Ghar Muft Bijli Yojana, ALMM domestic sourcing rules, and SECI renewable auctions.
- **FinBERT Sentiment Classification**: Real-time RSS news analysis scoring headlines from -1.0 to +1.0 (BULLISH / BEARISH / NEUTRAL).

---

## 🎯 Buy & Sell Indicator & Easy Mode

- **Actionable Buy/Sell Verdict**: Real-time verdict (`STRONG BUY`, `BUY`, `HOLD`, `SELL`, `STRONG SELL`) with dynamic Entry Zone, Take-Profit targets (TP1 & TP2), Invalidation Stop-Loss (SL), and Risk/Reward ratio.
- **On-Chart Signals**: Interactive TradingView chart markers (`BUY ⬆` in green and `SELL ⬇` in red) with a one-click toggle `🎯 BUY/SELL` in the chart toolbar.
- **5-Point Technical Confluence Scorecard**: Live breakdown across RSI (14), MACD Momentum, 50 SMA Trend, SMC Order Block Zone, and Chronos AI Forecast.
- **✨ Easy Mode vs ⚡ Pro Mode Toggle**: Seamless switch between an easy, beginner-friendly view and the full institutional quant terminal.
- **⚡ Popular Stock Chips**: One-tap quick selector for Reliance, TCS, Tata Motors, Dixon, Waaree Energy, Bitcoin, Gold, and Nifty 50.

---

## ☁️ Deployment Guide (Vercel & Cloud)

### 1. Is it ready for Vercel?
- **Frontend**: **Yes!** The frontend is static HTML/CSS/JS and includes [`vercel.json`](file:///g:/AI/Stock_X/vercel.json) ready to deploy directly to Vercel with zero configuration.
- **Backend**: Because the backend uses Python, FastAPI, Pandas, NumPy, Scikit-learn, and machine learning models, it **cannot run inside Vercel's 250MB serverless function limit** or connect to local LM Studio without a cloud service.
- **Recommended Production Architecture**:
  1. **Deploy Frontend to Vercel**: Connect your repo to Vercel. It deploys the `frontend/` folder to Vercel Edge CDN for free.
  2. **Deploy Backend to Render or Railway**: Use the included [`render.yaml`](file:///g:/AI/Stock_X/render.yaml) or [`Dockerfile`](file:///g:/AI/Stock_X/Dockerfile) to deploy the FastAPI backend on [Render.com](https://render.com) or [Railway.app](https://railway.app).
  3. **Connect Frontend to Backend**: In the web UI, click **`⚙️ API`** in the top bar and enter your deployed backend URL (e.g. `https://stock-x-api.onrender.com`), or configure `window.STOCK_X_API_URL`.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, TailwindCSS, TradingView Lightweight Charts, SVG Fan Chart Engine.
- **Backend**: Python 3.10, FastAPI, Uvicorn, Pandas, NumPy, Scikit-Learn, PyTorch CPU, Transformers.
- **Data Engine**: Yahoo Finance (`yfinance`), Feedparser, VADER / FinBERT lexicon calibration.
- **Local AI Node**: LM Studio OpenAI-compatible endpoint (`http://localhost:1234/v1`).

---

## 📊 Live Verification

Terminal running locally at: **`http://127.0.0.1:8000`**

