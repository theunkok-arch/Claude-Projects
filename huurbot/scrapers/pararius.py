"""Pararius scraper. Gebruikt search-URLs, geen API."""
import time
import re
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from config import USER_AGENT, REQUEST_DELAY_SEC

BASE = "https://www.pararius.nl"

# Pararius zoekt per stad. We doen meerdere queries.
SEARCH_URLS = [
    f"{BASE}/huurwoningen/de-bilt/0-9999/150m2",
    f"{BASE}/huurwoningen/bilthoven/0-9999/150m2",
    f"{BASE}/huurwoningen/zeist/0-9999/150m2",
    f"{BASE}/huurwoningen/utrecht/0-9999/150m2",
    f"{BASE}/huurwoningen/bunnik/0-9999/150m2",
    f"{BASE}/huurwoningen/den-dolder/0-9999/150m2",
    f"{BASE}/huurwoningen/maartensdijk/0-9999/150m2",
]

def fetch():
    """Return list of dicts: {bron, titel, plaats, prijs, m2, kamers, url}"""
    listings = []
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "nl-NL,nl;q=0.9"}

    for search_url in SEARCH_URLS:
        try:
            r = requests.get(search_url, headers=headers, timeout=15)
            if r.status_code != 200:
                print(f"[Pararius] {search_url} returned {r.status_code}")
                time.sleep(REQUEST_DELAY_SEC)
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            cards = soup.select("section.listing-search-item")

            for card in cards:
                try:
                    link_el = card.select_one("a.listing-search-item__link--title")
                    if not link_el:
                        continue
                    titel = link_el.get_text(strip=True)
                    url = urljoin(BASE, link_el.get("href"))

                    plaats_el = card.select_one(".listing-search-item__sub-title")
                    plaats = plaats_el.get_text(strip=True) if plaats_el else ""

                    prijs_el = card.select_one(".listing-search-item__price")
                    prijs_txt = prijs_el.get_text(strip=True) if prijs_el else ""
                    prijs = _parse_int(prijs_txt)

                    features = card.select(".illustrated-features__item")
                    m2 = None
                    kamers = None
                    for f in features:
                        txt = f.get_text(strip=True)
                        if "m²" in txt or "m2" in txt:
                            m2 = _parse_int(txt)
                        elif "kamer" in txt.lower():
                            kamers = _parse_int(txt)

                    listings.append({
                        "bron": "Pararius",
                        "titel": titel,
                        "plaats": plaats,
                        "prijs": prijs,
                        "m2": m2,
                        "kamers": kamers,
                        "url": url,
                    })
                except Exception as e:
                    print(f"[Pararius] card parse error: {e}")

            time.sleep(REQUEST_DELAY_SEC)
        except Exception as e:
            print(f"[Pararius] fetch error for {search_url}: {e}")

    return listings


def _parse_int(txt):
    nums = re.findall(r"\d+", txt.replace(".", "").replace(",", ""))
    return int(nums[0]) if nums else None
