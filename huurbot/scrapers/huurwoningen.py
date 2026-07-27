"""Huurwoningen.nl scraper."""
import time, re
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from config import USER_AGENT, REQUEST_DELAY_SEC
from proxy import proxy_get

BASE = "https://www.huurwoningen.nl"

SEARCH_URLS = [
    f"{BASE}/in/de-bilt/?min_size=150",
    f"{BASE}/in/bilthoven/?min_size=150",
    f"{BASE}/in/zeist/?min_size=150",
    f"{BASE}/in/utrecht/?min_size=150",
    f"{BASE}/in/bunnik/?min_size=150",
]

def fetch():
    listings = []
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "nl-NL,nl;q=0.9"}

    for search_url in SEARCH_URLS:
        try:
            r = proxy_get(search_url, headers=headers, timeout=30)
            if r.status_code != 200:
                print(f"[Huurwoningen] {search_url} returned {r.status_code}")
                time.sleep(REQUEST_DELAY_SEC)
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            cards = soup.select("section.listing-search-item, li.search-list__item")

            for card in cards:
                try:
                    link_el = card.select_one("a[href]")
                    if not link_el:
                        continue
                    url = urljoin(BASE, link_el.get("href"))
                    titel = link_el.get_text(strip=True)[:120] or "Listing"
                    text = card.get_text(" ", strip=True)

                    listings.append({
                        "bron": "Huurwoningen.nl",
                        "titel": titel,
                        "plaats": _extract_plaats(text),
                        "prijs": _extract_prijs(text),
                        "m2": _extract_m2(text),
                        "kamers": _extract_kamers(text),
                        "url": url,
                    })
                except Exception as e:
                    print(f"[Huurwoningen] card parse error: {e}")

            time.sleep(REQUEST_DELAY_SEC)
        except Exception as e:
            print(f"[Huurwoningen] fetch error: {e}")

    return listings


def _extract_prijs(text):
    m = re.search(r"€\s?([\d\.]+)", text)
    return int(m.group(1).replace(".", "")) if m else None

def _extract_m2(text):
    m = re.search(r"(\d+)\s?m²", text)
    return int(m.group(1)) if m else None

def _extract_kamers(text):
    m = re.search(r"(\d+)\s?kamer", text, re.IGNORECASE)
    return int(m.group(1)) if m else None

def _extract_plaats(text):
    m = re.search(r"\b(3[57]\d{2})\s+([A-Z][a-zA-Z\- ]+)", text)
    return m.group(2).strip() if m else ""
