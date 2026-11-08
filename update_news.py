"""Fetch headlines from RSS feeds and write them to news.js for the dashboard.

Run:  py update_news.py
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import feedparser

FEEDS = {
    "NPR News": "https://feeds.npr.org/1001/rss.xml",
}
HEADLINES_PER_OUTLET = 5
OUTPUT = Path(__file__).with_name("news.js")


def fetch_outlet(name, url):
    feed = feedparser.parse(url)
    items = []
    for entry in feed.entries[:HEADLINES_PER_OUTLET]:
        title = entry.get("title", "").strip()
        link = entry.get("link", "")
        if title and link.startswith(("http://", "https://")):
            items.append({"title": title, "link": link})
    return {"name": name, "items": items}


def main():
    data = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "outlets": [fetch_outlet(name, url) for name, url in FEEDS.items()],
    }
    # news.js is a plain script file so index.html can load it by double-click
    # (browsers block fetching local .json files, but allow local script tags).
    OUTPUT.write_text("window.NEWS = " + json.dumps(data, indent=2) + ";\n", encoding="utf-8")
    for outlet in data["outlets"]:
        print(f"{outlet['name']}: {len(outlet['items'])} headlines")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
