"""
Smart Money Concepts (SMC) & Institutional Order Block Engine for Indian Markets.
Detects Institutional Order Blocks (OB+ / OB-), Fair Value Gaps (FVG),
Market Structure Shifts (MSS / BOS), and Liquidity Pools.
"""

from typing import List, Dict, Any, Optional
import numpy as np

def detect_order_blocks(candles: List[Dict[str, Any]], lookback: int = 150) -> Dict[str, Any]:
    """
    Analyzes OHLCV candles to detect institutional order blocks, FVGs, and structure.
    
    candles: list of dicts with keys ['time', 'open', 'high', 'low', 'close', 'volume']
    """
    if not candles or len(candles) < 20:
        return {
            "orderBlocks": [],
            "fairValueGaps": [],
            "liquidityPools": [],
            "structure": {"trend": "NEUTRAL", "marketStructure": "BALANCED", "equilibrium": 0, "zone": "NEUTRAL"},
            "summary": "Insufficient candle data to map institutional order blocks."
        }
    
    # Work on recent lookback
    subset = candles[-lookback:]
    n = len(subset)
    current_price = subset[-1]["close"]
    
    # 1. Identify Swing Highs and Swing Lows (Fractal length = 2 on each side)
    swing_highs = []
    swing_lows = []
    
    for i in range(2, n - 2):
        # Swing High: apex at candle i, confirmed when candle i+2 closes below i
        if (subset[i]["high"] > subset[i-1]["high"] and 
            subset[i]["high"] > subset[i-2]["high"] and 
            subset[i]["high"] > subset[i+1]["high"] and 
            subset[i]["high"] > subset[i+2]["high"]):
            swing_highs.append({
                "index": i, 
                "time": subset[i]["time"], 
                "price": subset[i]["high"],
                "confirmed_index": i + 2,
                "confirmed_time": subset[i+2]["time"]
            })
            
        # Swing Low: apex at candle i, confirmed when candle i+2 closes above i
        if (subset[i]["low"] < subset[i-1]["low"] and 
            subset[i]["low"] < subset[i-2]["low"] and 
            subset[i]["low"] < subset[i+1]["low"] and 
            subset[i]["low"] < subset[i+2]["low"]):
            swing_lows.append({
                "index": i, 
                "time": subset[i]["time"], 
                "price": subset[i]["low"],
                "confirmed_index": i + 2,
                "confirmed_time": subset[i+2]["time"]
            })

    # Average candle body size and volume for displacement filtering (safely handle NaNs)
    body_sizes = [abs(c["close"] - c["open"]) for c in subset if not (np.isnan(c["close"]) or np.isnan(c["open"]))]
    avg_body = float(np.nanmean(body_sizes)) if body_sizes else 1.0
    if np.isnan(avg_body) or avg_body <= 0:
        avg_body = 1.0

    raw_vols = [float(c.get("volume") or 0) for c in subset if c.get("volume") is not None and not np.isnan(float(c.get("volume") or 0))]
    avg_vol = float(np.nanmean(raw_vols)) if raw_vols else 1.0
    if np.isnan(avg_vol) or avg_vol <= 0:
        avg_vol = 1.0

    # Dealing Range, Equilibrium, Premium vs Discount (calculated early for zone confluence)
    highs = [c["high"] for c in subset]
    lows = [c["low"] for c in subset]
    range_high = max(highs) if highs else current_price
    range_low = min(lows) if lows else current_price
    equilibrium = round(float((range_high + range_low) / 2), 2)
    zone = "DISCOUNT" if current_price < equilibrium else "PREMIUM"

    # Pre-detect Fair Value Gaps (FVGs) for confluence linking
    fvgs = []
    bull_fvg_indices = set()
    bear_fvg_indices = set()

    for i in range(2, n):
        c1 = subset[i-2]
        c2 = subset[i-1]
        c3 = subset[i]
        
        # Bullish FVG: Low of candle 3 is higher than High of candle 1
        if c3["low"] > c1["high"]:
            gap_size = c3["low"] - c1["high"]
            if gap_size > (avg_body * 0.25):
                filled = False
                for k in range(i + 1, n):
                    if subset[k]["low"] <= c1["high"]:
                        filled = True
                        break
                fvgs.append({
                    "id": f"FVG_BULL_{c2['time']}",
                    "type": "BULLISH_FVG",
                    "time": c2["time"],
                    "top": round(float(c3["low"]), 2),
                    "bottom": round(float(c1["high"]), 2),
                    "filled": filled,
                    "label": "Bullish FVG" if not filled else "Filled FVG"
                })
                bull_fvg_indices.add(i - 1)
                bull_fvg_indices.add(i)
                
        # Bearish FVG: High of candle 3 is lower than Low of candle 1
        elif c3["high"] < c1["low"]:
            gap_size = c1["low"] - c3["high"]
            if gap_size > (avg_body * 0.25):
                filled = False
                for k in range(i + 1, n):
                    if subset[k]["high"] >= c1["low"]:
                        filled = True
                        break
                fvgs.append({
                    "id": f"FVG_BEAR_{c2['time']}",
                    "type": "BEARISH_FVG",
                    "time": c2["time"],
                    "top": round(float(c1["low"]), 2),
                    "bottom": round(float(c3["high"]), 2),
                    "filled": filled,
                    "label": "Bearish FVG" if not filled else "Filled FVG"
                })
                bear_fvg_indices.add(i - 1)
                bear_fvg_indices.add(i)

    order_blocks = []
    
    # 2. Detect Bullish Order Blocks (OB+)
    for i in range(2, n - 3):
        candle = subset[i]
        if candle["close"] < candle["open"]:
            future_displacement = max(subset[i+1]["close"], subset[min(i+2, n-1)]["close"], subset[min(i+3, n-1)]["close"]) - candle["close"]
            displacement_ratio = future_displacement / (avg_body + 1e-6)
            if np.isnan(displacement_ratio):
                displacement_ratio = 1.0
            
            prior_highs = [sh["price"] for sh in swing_highs if sh.get("confirmed_index", sh["index"] + 2) <= i and sh["index"] >= i - 20]
            broke_structure = any(subset[min(i+2, n-1)]["close"] > sh for sh in prior_highs) if prior_highs else False
            
            if displacement_ratio >= 1.5 or broke_structure:
                ob_high = max(candle["open"], candle["high"])
                ob_low = candle["low"]
                confirmed_idx = min(i + 3, n - 1)
                confirmed_time = subset[confirmed_idx]["time"]
                
                mitigated = False
                mitigated_time = None
                for k in range(confirmed_idx + 1, n):
                    if subset[k]["low"] <= ob_high:
                        mitigated = True
                        mitigated_time = subset[k]["time"]
                        break
                        
                c_vol = float(candle.get("volume") or 0)
                if np.isnan(c_vol):
                    c_vol = 0.0
                vol_ratio = c_vol / (avg_vol + 1e-6)
                if np.isnan(vol_ratio):
                    vol_ratio = 1.0

                # Strict Confluence Scoring (0 - 100)
                confluence_score = 0
                factors = []

                if vol_ratio >= 1.3:
                    confluence_score += 20
                    factors.append(f"Volume Surge ({round(vol_ratio, 1)}x avg)")
                elif vol_ratio >= 1.0:
                    confluence_score += 10

                if displacement_ratio >= 2.0:
                    confluence_score += 25
                    factors.append(f"Massive Displacement ({round(displacement_ratio, 1)}x body)")
                elif displacement_ratio >= 1.5:
                    confluence_score += 15
                    factors.append("Strong Displacement")

                if broke_structure:
                    confluence_score += 20
                    factors.append("Market Structure Shift (BOS/MSS)")

                has_fvg = any(idx in bull_fvg_indices for idx in [i+1, i+2])
                if has_fvg:
                    confluence_score += 15
                    factors.append("Adjacent Bullish FVG Imbalance")

                if ob_high < equilibrium:
                    confluence_score += 10
                    factors.append("Institutional Discount Zone")

                if not mitigated:
                    confluence_score += 10
                    factors.append("Fresh & Unmitigated")

                confluence_score = min(99, max(25, confluence_score))

                # Grade assignment
                if confluence_score >= 80:
                    grade = "A+ Institutional (High Probability)"
                elif confluence_score >= 65:
                    grade = "A Setup (Solid)"
                elif confluence_score >= 50:
                    grade = "B Setup (Moderate)"
                else:
                    grade = "C Speculative (Low Probability)"
                
                if abs(current_price - ob_high) / (current_price + 1e-6) < 0.25:
                    order_blocks.append({
                        "id": f"OB_BULL_{subset[i]['time']}",
                        "type": "BULLISH",
                        "time": subset[i]["time"],
                        "candle_index": i,
                        "confirmed_index": confirmed_idx,
                        "confirmed_time": confirmed_time,
                        "high": round(float(ob_high), 2),
                        "low": round(float(ob_low), 2),
                        "mid": round(float((ob_high + ob_low) / 2), 2),
                        "mitigated": mitigated,
                        "mitigatedTime": mitigated_time,
                        "strength": confluence_score,
                        "confluenceScore": confluence_score,
                        "qualityGrade": grade,
                        "confluenceFactors": factors,
                        "brokeStructure": broke_structure,
                        "label": f"Bullish OB+ ({grade.split(' ')[0]})" if not mitigated else "Mitigated OB+"
                    })

    # 3. Detect Bearish Order Blocks (OB-)
    for i in range(2, n - 3):
        candle = subset[i]
        if candle["close"] > candle["open"]:
            future_drop = candle["close"] - min(subset[i+1]["close"], subset[min(i+2, n-1)]["close"], subset[min(i+3, n-1)]["close"])
            displacement_ratio = future_drop / (avg_body + 1e-6)
            if np.isnan(displacement_ratio):
                displacement_ratio = 1.0
            
            prior_lows = [sl["price"] for sl in swing_lows if sl.get("confirmed_index", sl["index"] + 2) <= i and sl["index"] >= i - 20]
            broke_structure = any(subset[min(i+2, n-1)]["close"] < sl for sl in prior_lows) if prior_lows else False
            
            if displacement_ratio >= 1.5 or broke_structure:
                ob_high = candle["high"]
                ob_low = min(candle["open"], candle["low"])
                confirmed_idx = min(i + 3, n - 1)
                confirmed_time = subset[confirmed_idx]["time"]
                
                mitigated = False
                mitigated_time = None
                for k in range(confirmed_idx + 1, n):
                    if subset[k]["high"] >= ob_low:
                        mitigated = True
                        mitigated_time = subset[k]["time"]
                        break
                        
                c_vol = float(candle.get("volume") or 0)
                if np.isnan(c_vol):
                    c_vol = 0.0
                vol_ratio = c_vol / (avg_vol + 1e-6)
                if np.isnan(vol_ratio):
                    vol_ratio = 1.0

                confluence_score = 0
                factors = []

                if vol_ratio >= 1.3:
                    confluence_score += 20
                    factors.append(f"Volume Surge ({round(vol_ratio, 1)}x avg)")
                elif vol_ratio >= 1.0:
                    confluence_score += 10

                if displacement_ratio >= 2.0:
                    confluence_score += 25
                    factors.append(f"Massive Downward Displacement ({round(displacement_ratio, 1)}x body)")
                elif displacement_ratio >= 1.5:
                    confluence_score += 15
                    factors.append("Strong Displacement")

                if broke_structure:
                    confluence_score += 20
                    factors.append("Market Structure Shift (BOS/MSS)")

                has_fvg = any(idx in bear_fvg_indices for idx in [i+1, i+2])
                if has_fvg:
                    confluence_score += 15
                    factors.append("Adjacent Bearish FVG Imbalance")

                if ob_low > equilibrium:
                    confluence_score += 10
                    factors.append("Institutional Premium Zone")

                if not mitigated:
                    confluence_score += 10
                    factors.append("Fresh & Unmitigated")

                confluence_score = min(99, max(25, confluence_score))

                if confluence_score >= 80:
                    grade = "A+ Institutional (High Probability)"
                elif confluence_score >= 65:
                    grade = "A Setup (Solid)"
                elif confluence_score >= 50:
                    grade = "B Setup (Moderate)"
                else:
                    grade = "C Speculative (Low Probability)"
                
                if abs(current_price - ob_low) / (current_price + 1e-6) < 0.25:
                    order_blocks.append({
                        "id": f"OB_BEAR_{subset[i]['time']}",
                        "type": "BEARISH",
                        "time": subset[i]["time"],
                        "candle_index": i,
                        "confirmed_index": confirmed_idx,
                        "confirmed_time": confirmed_time,
                        "high": round(float(ob_high), 2),
                        "low": round(float(ob_low), 2),
                        "mid": round(float((ob_high + ob_low) / 2), 2),
                        "mitigated": mitigated,
                        "mitigatedTime": mitigated_time,
                        "strength": confluence_score,
                        "confluenceScore": confluence_score,
                        "qualityGrade": grade,
                        "confluenceFactors": factors,
                        "brokeStructure": broke_structure,
                        "label": f"Bearish OB- ({grade.split(' ')[0]})" if not mitigated else "Mitigated OB-"
                    })

    # Liquidity Pools (Equal Highs and Equal Lows)
    liquidity_pools = []
    tolerance = 0.003  # 0.3% price tolerance for equal highs/lows
    
    for i in range(len(swing_highs) - 1):
        for j in range(i + 1, len(swing_highs)):
            h1 = swing_highs[i]["price"]
            h2 = swing_highs[j]["price"]
            if abs(h1 - h2) / (h1 + 1e-6) <= tolerance:
                avg_level = (h1 + h2) / 2
                swept = current_price > avg_level
                liquidity_pools.append({
                    "type": "BSL (Buy-Side Liquidity)",
                    "level": round(float(avg_level), 2),
                    "time1": swing_highs[i]["time"],
                    "time2": swing_highs[j]["time"],
                    "swept": swept,
                    "label": "Equal Highs (BSL)" if not swept else "BSL Swept"
                })
                break
                
    for i in range(len(swing_lows) - 1):
        for j in range(i + 1, len(swing_lows)):
            l1 = swing_lows[i]["price"]
            l2 = swing_lows[j]["price"]
            if abs(l1 - l2) / (l1 + 1e-6) <= tolerance:
                avg_level = (l1 + l2) / 2
                swept = current_price < avg_level
                liquidity_pools.append({
                    "type": "SSL (Sell-Side Liquidity)",
                    "level": round(float(avg_level), 2),
                    "time1": swing_lows[i]["time"],
                    "time2": swing_lows[j]["time"],
                    "swept": swept,
                    "label": "Equal Lows (SSL)" if not swept else "SSL Swept"
                })
                break

    # Unmitigated Order Blocks prioritized
    unmitigated_bullish = [ob for ob in order_blocks if ob["type"] == "BULLISH" and not ob["mitigated"]]
    unmitigated_bearish = [ob for ob in order_blocks if ob["type"] == "BEARISH" and not ob["mitigated"]]
    
    # Sort unmitigated bullish by proximity below current price
    unmitigated_bullish = sorted(unmitigated_bullish, key=lambda x: abs(current_price - x["high"]))
    unmitigated_bearish = sorted(unmitigated_bearish, key=lambda x: abs(current_price - x["low"]))
    
    # Dominant market structure bias
    active_bias = "BULLISH" if len(unmitigated_bullish) >= len(unmitigated_bearish) and current_price >= equilibrium else "BEARISH"
    if abs(current_price - equilibrium) / (equilibrium + 1e-6) < 0.015:
        active_bias = "EQUILIBRIUM_TEST"

    # Overall Setup Quality & Confluence Score
    top_bull_score = unmitigated_bullish[0]["confluenceScore"] if unmitigated_bullish else 40
    top_bear_score = unmitigated_bearish[0]["confluenceScore"] if unmitigated_bearish else 40
    best_confluence = max(top_bull_score, top_bear_score)
    
    if best_confluence >= 80:
        overall_setup_grade = "A+ Institutional (High Probability)"
        risk_warning = "High institutional confluence identified. Wait for rejection wick confirmation on retest."
    elif best_confluence >= 65:
        overall_setup_grade = "A Setup (Solid)"
        risk_warning = "Solid order structure. Manage risk with disciplined invalidation stops."
    elif best_confluence >= 50:
        overall_setup_grade = "B Setup (Moderate)"
        risk_warning = "Moderate confluence. Market may chop; avoid premature market orders."
    else:
        overall_setup_grade = "C Speculative / Low Probability"
        risk_warning = "Low confluence / noisy structure. Probability of fakeout is elevated."

    return {
        "orderBlocks": order_blocks[-15:],
        "unmitigatedBullish": unmitigated_bullish[:3],
        "unmitigatedBearish": unmitigated_bearish[:3],
        "fairValueGaps": fvgs[-10:],
        "liquidityPools": liquidity_pools[-6:],
        "structure": {
            "currentPrice": round(float(current_price), 2),
            "rangeHigh": round(float(range_high), 2),
            "rangeLow": round(float(range_low), 2),
            "equilibrium": equilibrium,
            "zone": zone,
            "trend": active_bias,
            "confluenceScore": best_confluence,
            "setupGrade": overall_setup_grade,
            "riskWarning": risk_warning,
            "unmitigatedBullishCount": len(unmitigated_bullish),
            "unmitigatedBearishCount": len(unmitigated_bearish)
        },
        "summary": f"Market trading in {zone} zone relative to EQ ₹{equilibrium:.2f}. "
                   f"Setup Quality: {overall_setup_grade} (Confluence: {best_confluence}/100). "
                   f"{len(unmitigated_bullish)} Bullish OBs and {len(unmitigated_bearish)} Bearish OBs identified."
    }
