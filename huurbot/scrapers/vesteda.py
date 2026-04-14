"""Vesteda en Bouwinvest portals. Beide hebben aparte search-pagina's."""
import time, re
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from config import USER_AGENT, REQUEST_DELAY_SEC


def fetch():
    return _fetch_vesteda() + _fetch_bouwinvest()


def _fetch_vesteda():
    """Vesteda search met plaats-filter."""
    listings = []
    headers = {"User-Agent": USER_AGENT}
    url = "https://www.vesteda.com/nl/woning-zoeken?placeOrAreaInput=Utrecht&radius=15"

    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code != 200:
            print(f"[Vesteda] returned {r.status_code}")
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        cards = soup.select(".search-object")

        for card in cards:
            try:
                link_el = card.select_one("a[href]")
                if not link_el:
                    continue
                url_l = urljoin("https://www.vesteda.com", link_el.get("href"))
                text = card.get_text(" ", strip=True)
                titel = (card.select_one(".search-object__title") or link_el).get_text(strip=True)

                listings.append({
                    "bron": "Vesteda",
                    "titel": titel,
                    "plaats": _extract_plaats(text),
                    "prijs": _extract_prijs(text),
                    "m2": _extract_m2(text),
                    "kamers": _extract_kamers(text),
                    "url": url_l,
                })
            except Exception as e:
                print(f"[Vesteda] card error: {e}")

        time.sleep(REQUEST_DELAY_SEC)
    except Exception as e:
        print(f"[Vesteda] error: {e}")

    return listings


def _fetch_bouwinvest():
    """Bouwinvest 'Wonen bij Bouwinvest' portal."""
    listings = []
    headers = {"User-Agent": USER_AGENT}
    url = "https://www.wonenbijbouwinvest.nl/woningaanbod?location=utrecht"

    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code != 200:
            print(f"[Bouwinvest] returned {r.status_code}")
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        cards = soup.select("article, .property-card, .residence-card")

        for card in cards:
            try:
                link_el = card.select_one("a[href]")
                if not link_el:
                    continue
                url_l = urljoin("https://www.wonenbijbouwinvest.nl", link_el.get("href"))
                text = card.get_text(" ", strip=True)
                titel = link_el.get_text(strip=True)[:120] or "Bouwinvest listing"

                listings.append({
                    "bron": "Bouwinvest",
                    "titel": titel,
                    "plaats": _extract_plaats(text),
                    "prijs": _extract_prijs(text),
                    "m2": _extract_m2(text),
                    "kamers": _extract_kamers(text),
                    "url": url_l,
                })
            except Exception as e:
                print(f"[Bouwinvest] card error: {e}")

        time.sleep(REQUEST_DELAY_SEC)
    except Exception as e:
        print(f"[Bouwinvest] error: {e}")

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
