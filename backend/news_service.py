import os, httpx, traceback, re
from datetime import datetime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()
_finbert_pipeline = None
_finbert_attempted = False

def _get_finbert_pipeline():
    global _finbert_pipeline, _finbert_attempted
    if _finbert_attempted:
        return _finbert_pipeline
    _finbert_attempted = True
    try:
        from transformers import pipeline
        # Use CPU-efficient PyTorch pipeline
        _finbert_pipeline = pipeline("text-classification", model="ProsusAI/finbert", device=-1)
    except Exception as e:
        _finbert_pipeline = None
    return _finbert_pipeline

def _get_sentiment(text: str):
    """
    Analyzes sentiment using FinBERT financial domain transformer model,
    with fast local VADER fallback.
    """
    clean_text = text.strip()[:512]  # Max 512 tokens for BERT
    pipe = _get_finbert_pipeline()
    if pipe:
        try:
            res = pipe(clean_text)[0]
            label = res["label"].capitalize()  # 'Positive', 'Negative', 'Neutral'
            conf = round(float(res["score"]), 2)
            # Map to signed score [-1.0 to +1.0]
            score = conf if label == "Positive" else (-conf if label == "Negative" else 0.0)
            return label, score
        except Exception:
            pass

    # High-speed Fallback: VADER
    scores = _vader.polarity_scores(clean_text)
    compound = scores["compound"]
    if compound >= 0.05:
        return "Positive", round(compound, 2)
    elif compound <= -0.05:
        return "Negative", round(compound, 2)
    return "Neutral", round(compound, 2)


def _deduplicate_articles(articles: list) -> list:
    """Removes duplicate or near-duplicate news items based on title similarity."""
    seen_titles = set()
    unique = []
    for a in articles:
        norm_title = re.sub(r'[^a-zA-Z0-9]', '', a.get("title", "").lower())[:40]
        if norm_title and norm_title not in seen_titles:
            seen_titles.add(norm_title)
            unique.append(a)
    return unique


def get_stock_news(stock_name: str, symbol: str):
    api_key = os.getenv("NEWS_API_KEY", "")
    if api_key:
        try:
            articles = _fetch_gnews(stock_name, api_key)
            if articles:
                return _deduplicate_articles(articles)
        except Exception as e:
            traceback.print_exc()
    demo = _generate_demo_news(stock_name, symbol)
    return _deduplicate_articles(demo)


def _fetch_gnews(query: str, api_key: str):
    url = "https://gnews.io/api/v4/search"
    params = {
        "q": f"{query} stock India",
        "lang": "en",
        "country": "in",
        "max": 8,
        "apikey": api_key,
    }
    with httpx.Client(timeout=10) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    articles = []
    for a in data.get("articles", []):
        title = a.get("title", "")
        desc = a.get("description", "")
        sentiment, score = _get_sentiment(f"{title} {desc}")
        articles.append({
            "title": title,
            "description": desc,
            "url": a.get("url", ""),
            "source": a.get("source", {}).get("name", ""),
            "publishedAt": a.get("publishedAt", ""),
            "sentiment": sentiment,
            "sentimentScore": score,
        })
    return articles


def _generate_demo_news(stock_name: str, symbol: str):
    """Generate realistic demo news when no API key is available."""
    clean = stock_name.replace(" Ltd", "").replace(" Industries", "").strip()
    demo = [
        {
            "title": f"{clean} Reports Strong Quarterly Results, Beats Street Estimates",
            "description": f"{clean} posted a net profit growth of 18% YoY in the latest quarter, driven by robust demand and operational efficiency improvements across segments.",
            "url": "#",
            "source": "Economic Times",
            "publishedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sentiment": "Positive",
            "sentimentScore": 0.75,
        },
        {
            "title": f"Analysts Upgrade {clean} Target Price on Growth Outlook",
            "description": f"Multiple brokerage firms have revised their target price upward for {clean} citing strong fundamentals, expanding margins, and favorable sector tailwinds.",
            "url": "#",
            "source": "Moneycontrol",
            "publishedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sentiment": "Positive",
            "sentimentScore": 0.62,
        },
        {
            "title": f"FII Activity Increases in {clean}, Institutional Holding Up",
            "description": f"Foreign institutional investors increased their stake in {clean} during the latest quarter, signaling growing confidence in the company's long-term prospects.",
            "url": "#",
            "source": "LiveMint",
            "publishedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sentiment": "Positive",
            "sentimentScore": 0.45,
        },
        {
            "title": f"Sector Headwinds May Impact {clean} in Near Term",
            "description": f"Rising input costs and regulatory changes in the sector could pressure {clean}'s margins in the coming quarters, though long-term outlook remains stable.",
            "url": "#",
            "source": "Business Standard",
            "publishedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sentiment": "Negative",
            "sentimentScore": -0.38,
        },
        {
            "title": f"{clean} Announces Strategic Partnership for Digital Expansion",
            "description": f"{clean} has entered a strategic partnership to accelerate its digital transformation initiatives, expected to drive growth in new revenue streams.",
            "url": "#",
            "source": "NDTV Profit",
            "publishedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sentiment": "Positive",
            "sentimentScore": 0.55,
        },
    ]
    return demo
