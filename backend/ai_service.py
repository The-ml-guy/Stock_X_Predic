"""
AI Analysis Engine supporting Local LLM (LM Studio / Ollama / Qwen3-4B / DeepSeek)
with fallback to Gemini API and Institutional Rule-Based Synthesis.
"""

import os
import json
import time
import httpx
from typing import Dict, Any, Optional

# Default Local LLM Endpoints
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://localhost:1234/v1")
LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "qwen-4b")

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

_gemini_model = None

def _get_gemini_model():
    global _gemini_model
    if _gemini_model:
        return _gemini_model
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or not GENAI_AVAILABLE:
        return None
    genai.configure(api_key=api_key)
    _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
    return _gemini_model

def check_local_llm_status(base_url: str = None) -> Dict[str, Any]:
    """Pings the local LM Studio / Ollama server to check connectivity and model list."""
    url = (base_url or LOCAL_LLM_URL).rstrip("/")
    start_t = time.time()
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{url}/models")
            latency_ms = round((time.time() - start_t) * 1000, 1)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id") for m in data.get("data", [])]
                active_model = models[0] if models else "Local LLM"
                return {
                    "online": True,
                    "endpoint": url,
                    "latencyMs": latency_ms,
                    "models": models,
                    "activeModel": active_model,
                    "message": f"Connected to {active_model} ({latency_ms}ms)"
                }
    except Exception as e:
        pass

    # Try Ollama default port if LM Studio failed
    if url != "http://localhost:11434/v1" and not base_url:
        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.get("http://localhost:11434/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "online": True,
                        "endpoint": "http://localhost:11434/v1",
                        "latencyMs": round((time.time() - start_t) * 1000, 1),
                        "models": models,
                        "activeModel": models[0] if models else "Ollama Model",
                        "message": "Connected to Ollama API"
                    }
        except Exception:
            pass

    return {
        "online": False,
        "endpoint": url,
        "latencyMs": 0,
        "models": [],
        "activeModel": "None (Offline)",
        "message": "Local LLM offline. Start LM Studio server on port 1234 or Ollama."
    }

def analyze_institutional(
    symbol: str,
    quote: Dict[str, Any],
    indicators: Dict[str, Any],
    orderblocks: Optional[Dict[str, Any]] = None,
    chronos: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Synthesizes Order Block price action, Chronos time-series projections,
    and technical momentum using Local LLM (or Gemini / Institutional engine).
    """
    # 1. Try Local LLM (e.g. Qwen3-4B in LM Studio)
    ob_struct = orderblocks.get("structure", {}) if orderblocks else {}
    setup_grade = ob_struct.get("setupGrade", "B Setup (Moderate)")
    confluence_score = ob_struct.get("confluenceScore", 50)

    llm_status = check_local_llm_status()
    if llm_status["online"]:
        try:
            result = _call_local_llm(llm_status["endpoint"], symbol, quote, indicators, orderblocks, chronos)
            if result:
                result["source"] = f"Local LLM ({llm_status['activeModel']})"
                result.setdefault("setupGrade", setup_grade)
                result.setdefault("confluenceScore", confluence_score)
                return result
        except Exception as e:
            pass

    # 2. Try Gemini API if key is present
    gemini = _get_gemini_model()
    if gemini:
        try:
            result = _call_gemini(gemini, symbol, quote, indicators, orderblocks, chronos)
            if result:
                result["source"] = "Gemini AI Engine"
                result.setdefault("setupGrade", setup_grade)
                result.setdefault("confluenceScore", confluence_score)
                return result
        except Exception as e:
            pass

    # 3. Fallback: High-precision institutional quantitative synthesis
    result = _rule_based_institutional(symbol, quote, indicators, orderblocks, chronos)
    result["source"] = "Institutional SMC & Chronos Synthesis Engine"
    result.setdefault("setupGrade", setup_grade)
    result.setdefault("confluenceScore", confluence_score)
    return result

def _call_local_llm(endpoint: str, symbol: str, quote: dict, indicators: dict, orderblocks: dict, chronos: dict) -> Optional[dict]:
    """Calls local LM Studio / Ollama OpenAI-compatible endpoint."""
    ob_summary = orderblocks.get("summary", "N/A") if orderblocks else "N/A"
    chronos_summary = chronos.get("summary", "N/A") if chronos else "N/A"
    chronos_dir = chronos.get("direction", "NEUTRAL") if chronos else "NEUTRAL"
    chronos_target = chronos.get("targetMedian", "N/A") if chronos else "N/A"
    
    prompt = f"""You are an elite quantitative analyst and Smart Money Concepts trader specializing in Indian Equities (NSE/BSE).
Analyze this asset combining Institutional Order Blocks and the Chronos Zero-Shot Time Series forecast.

TICKER: {symbol}
NAME: {quote.get('name', symbol)}
CURRENT PRICE: ₹{quote.get('price', 0)}
CHANGE: {quote.get('changePercent', 0)}%
RSI(14): {indicators.get('latestRSI', 'N/A')}
MACD: {indicators.get('latestMACD', 'N/A')}
ORDER BLOCK CONTEXT: {ob_summary}
CHRONOS PROBABILISTIC FORECAST: Direction {chronos_dir}, Target ₹{chronos_target}. {chronos_summary}

Respond ONLY with valid JSON matching this schema:
{{
  "signal": "STRONG_BUY" or "BUY" or "HOLD" or "SELL" or "STRONG_SELL",
  "confidence": 0-98,
  "trend": "BULLISH" or "BEARISH" or "NEUTRAL",
  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
  "orderBlockThesis": "1-2 sentences on how price will interact with key institutional supply/demand zones",
  "chronosForecastInsight": "1-2 sentences explaining Chronos probability cone and median trajectory",
  "shortTermOutlook": "Expected movement over next 5-10 trading sessions",
  "keyFactors": [
    {{"type": "bullish" or "bearish", "text": "Key catalyst 1"}},
    {{"type": "bullish" or "bearish", "text": "Key catalyst 2"}},
    {{"type": "bullish" or "bearish", "text": "Key catalyst 3"}}
  ],
  "institutionalSummary": "Executive summary synthesizing order flow, Chronos horizon, and trade bias"
}}"""

    payload = {
        "messages": [
            {"role": "system", "content": "You are a institutional quantitative trading intelligence assistant. Always output clean JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 600
    }
    
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(f"{endpoint}/chat/completions", json=payload)
        if resp.status_code == 200:
            res_data = resp.json()
            content = res_data["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(content)
    return None

def _call_gemini(model, symbol: str, quote: dict, indicators: dict, orderblocks: dict, chronos: dict) -> Optional[dict]:
    prompt = f"""You are an elite quantitative analyst specializing in Indian Equities (NSE/BSE).
TICKER: {symbol}
CURRENT PRICE: ₹{quote.get('price', 0)}
RSI: {indicators.get('latestRSI', 'N/A')}
ORDER BLOCK: {orderblocks.get('summary', '') if orderblocks else ''}
CHRONOS FORECAST: {chronos.get('summary', '') if chronos else ''}

Respond ONLY with valid JSON in this schema:
{{
  "signal": "BUY" or "HOLD" or "SELL",
  "confidence": 75,
  "trend": "BULLISH" or "BEARISH" or "NEUTRAL",
  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
  "orderBlockThesis": "Thesis on order blocks",
  "chronosForecastInsight": "Thesis on Chronos trajectory",
  "shortTermOutlook": "Outlook",
  "keyFactors": [
    {{"type": "bullish", "text": "Factor 1"}},
    {{"type": "bearish", "text": "Factor 2"}}
  ],
  "institutionalSummary": "Executive summary"
}}"""
    response = model.generate_content(prompt)
    txt = response.text.strip()
    if txt.startswith("```"):
        txt = txt.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(txt)

def _rule_based_institutional(symbol: str, quote: dict, indicators: dict, orderblocks: dict, chronos: dict) -> dict:
    """Deterministic institutional rule-based synthesis combining SMC Order Blocks and Chronos."""
    factors = []
    score = 50
    
    price = quote.get("price", 0)
    rsi = indicators.get("latestRSI")
    macd = indicators.get("latestMACD")
    signal_macd = indicators.get("latestSignal")
    
    # Chronos contribution
    c_dir = chronos.get("direction", "NEUTRAL") if chronos else "NEUTRAL"
    c_conv = chronos.get("conviction", 50) if chronos else 50
    c_ret = chronos.get("expectedReturnPct", 0) if chronos else 0
    c_target = chronos.get("targetMedian", price) if chronos else price
    c_regime = chronos.get("regime", "RANGE_CONSOLIDATION") if chronos else "RANGE_CONSOLIDATION"
    c_reliability = chronos.get("forecastReliability", "MODERATE") if chronos else "MODERATE"
    
    if "BULLISH" in c_dir and c_regime != "HIGH_VOLATILITY_CHOP":
        score += 15 if c_reliability == "HIGH" else 10
        factors.append({"type": "bullish", "text": f"Chronos projects +{c_ret}% upside toward ₹{c_target:.2f} ({c_conv}% conviction, {c_regime})"})
    elif "BEARISH" in c_dir and c_regime != "HIGH_VOLATILITY_CHOP":
        score -= 15 if c_reliability == "HIGH" else 10
        factors.append({"type": "bearish", "text": f"Chronos projects {c_ret}% contraction toward ₹{c_target:.2f} ({c_conv}% conviction, {c_regime})"})
    elif c_regime == "HIGH_VOLATILITY_CHOP":
        factors.append({"type": "neutral", "text": f"Elevated market volatility chop detected; directional conviction dampened."})
    else:
        factors.append({"type": "neutral", "text": f"Chronos projects balanced consolidation around ₹{c_target:.2f}"})

    # Order Block & Confluence contribution
    ob_grade = "B Setup (Moderate)"
    ob_confluence = 50
    zone = "EQUILIBRIUM"

    if orderblocks:
        struct = orderblocks.get("structure", {})
        zone = struct.get("zone", "EQUILIBRIUM")
        ob_grade = struct.get("setupGrade", "B Setup")
        ob_confluence = struct.get("confluenceScore", 50)
        unmit_bull = orderblocks.get("unmitigatedBullish", [])
        unmit_bear = orderblocks.get("unmitigatedBearish", [])
        
        if zone == "DISCOUNT":
            score += 15
            factors.append({"type": "bullish", "text": f"Price in Institutional Discount zone (EQ ₹{struct.get('equilibrium', 0):.2f})"})
        else:
            score -= 15
            factors.append({"type": "bearish", "text": f"Price in Institutional Premium zone (EQ ₹{struct.get('equilibrium', 0):.2f})"})
            
        if unmit_bull:
            top_ob = unmit_bull[0]
            factors.append({
                "type": "bullish", 
                "text": f"Bullish OB+ resting at ₹{top_ob['low']} — ₹{top_ob['high']} ({top_ob.get('qualityGrade', 'Solid')}, Confluence: {top_ob.get('confluenceScore', 50)}/100)"
            })
            if top_ob.get("confluenceScore", 50) >= 80:
                score += 15
            
        if unmit_bear:
            top_bear = unmit_bear[0]
            factors.append({
                "type": "bearish", 
                "text": f"Bearish OB- active at ₹{top_bear['low']} — ₹{top_bear['high']} ({top_bear.get('qualityGrade', 'Solid')}, Confluence: {top_bear.get('confluenceScore', 50)}/100)"
            })
            if top_bear.get("confluenceScore", 50) >= 80:
                score -= 15

    # Technical momentum
    if rsi is not None:
        if rsi < 35:
            score += 10
            factors.append({"type": "bullish", "text": f"RSI at {rsi:.1f} indicates oversold accumulation"})
        elif rsi > 70:
            score -= 10
            factors.append({"type": "bearish", "text": f"RSI at {rsi:.1f} reflects overbought momentum"})

    # Determine Signal & Risk Level based on Confluence
    if score >= 70 and ob_confluence >= 65 and c_regime != "HIGH_VOLATILITY_CHOP":
        signal = "BUY"
        trend = "BULLISH"
        risk = "LOW" if ob_confluence >= 80 else "MEDIUM"
    elif score <= 30 and ob_confluence >= 65 and c_regime != "HIGH_VOLATILITY_CHOP":
        signal = "SELL"
        trend = "BEARISH"
        risk = "LOW" if ob_confluence >= 80 else "MEDIUM"
    else:
        signal = "HOLD / CAUTION"
        trend = "NEUTRAL"
        risk = "HIGH" if (c_regime == "HIGH_VOLATILITY_CHOP" or ob_confluence < 50) else "MEDIUM"
        
    return {
        "signal": signal,
        "confidence": min(95, max(35, score)),
        "trend": trend,
        "riskLevel": risk,
        "setupGrade": ob_grade,
        "confluenceScore": ob_confluence,
        "orderBlockThesis": f"Price is operating in {zone} zone with setup quality: {ob_grade}.",
        "chronosForecastInsight": f"Chronos indicates {c_dir.lower()} bias ({c_conv}% conviction) under {c_regime} (Reliability: {c_reliability}).",
        "shortTermOutlook": f"Watch key unmitigated OB zones. Ensure wick rejection confirmation before taking trades.",
        "keyFactors": factors[:4],
        "institutionalSummary": (
            f"Overall posture: {trend} (Signal: {signal}). Setup Grade: {ob_grade} (Confluence: {ob_confluence}/100). "
            f"{'High probability setup confirmed by SMC confluence.' if ob_confluence >= 75 and risk == 'LOW' else 'Market conditions suggest waiting for rejection confirmation rather than anticipating breaks.'}"
        )
    }

# Backwards compatibility
def analyze_stock(symbol, quote, indicators):
    return analyze_institutional(symbol, quote, indicators)

def analyze_comparison(symbol, start_d, end_d, start_p, end_p):
    pct = round(((end_p - start_p) / start_p) * 100, 2)
    direction = "gained" if pct >= 0 else "declined"
    return f"{symbol} {direction} {abs(pct)}% from ₹{start_p:.2f} ({start_d}) to ₹{end_p:.2f} ({end_d})."
