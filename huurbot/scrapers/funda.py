"""Funda scraper. Funda blokkeert agressief, dit is best-effort.
Als dit faalt, val terug op Funda email-alerts naar gmail."""
import time
import re
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from config import USER_AGENT, REQUEST_DELAY_SEC

BASE = "https://www.funda.nl"

# Funda search URL voor huur, 150+ m², specifieke gemeentes
SEARCH_URLS = [
    f"{BASE}/zoeken/huur?selected_area=%5B%22de-bilt%22,%22zeist%22,%22bunnik%22,%22utrecht%22%5D&floor_area=%22150-%22",
]

def fetch():
    listings = []
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "nl-NL,nl;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    }

    for search_url in SEARCH_URLS:
        try:
            r = requests.get(search_url, headers=headers, timeout=15)
            if r.status_code != 200:
                print(f"[Funda] {search_url} returned {r.status_code} (likely blocked, consider proxy)")
                time.sleep(REQUEST_DELAY_SEC)
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            # Funda's HTML structuur verandert vaak. Robuuste fallback via data-test-id attributen.
            cards = soup.select("[data-test-id='search-result-item']")
            if not cards:
                cards = soup.select("div.search-result")  # legacy fallback

            for card in cards:
                try:
                    link_el = card.select_one("a[href*='/huur/']")
                    if not link_el:
                        continue
                    url = urljoin(BASE, link_el.get("href"))
                    titel = link_el.get_text(strip=True) or "Funda listing"

                    text = card.get_text(" ", strip=True)
                    prijs = _extract_prijs(text)
                    m2 = _extract_m2(text)
                    kamers = _extract_kamers(text)
                    plaats = _extract_plaats(text)

                    listings.append({
                        "bron": "Funda",
                        "titel": titel,
                        "plaats": plaats,
                        "prijs": prijs,
                        "m2": m2,
                        "kamers": kamers,
                        "url": url,
                    })
                except Exception as e:
                    print(f"[Funda] card parse error: {e}")

            time.sleep(REQUEST_DELAY_SEC)
        except Exception as e:
            print(f"[Funda] fetch error: {e}")

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
