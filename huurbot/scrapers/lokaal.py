"""Lokale makelaars in De Bilt regio.
Elke makelaar heeft eigen HTML structuur, dus per-site logic.
Begin met deze 3, breid uit naar wens."""

import time, re
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from config import USER_AGENT, REQUEST_DELAY_SEC


LOKAAL_SITES = [
    {
        "naam": "Van Ringh",
        "url": "https://www.vanringh.nl/aanbod/woningaanbod/HUUR/",
        "card_selector": ".object-list-item, article.object",
    },
    {
        "naam": "Wieman",
        "url": "https://www.wiemanmakelaars.nl/aanbod/?status=beschikbaar&type=huur",
        "card_selector": ".aanbod-item, article",
    },
    # Voeg makkelijk meer toe met dezelfde struktuur
]


def fetch():
    listings = []
    headers = {"User-Agent": USER_AGENT}

    for site in LOKAAL_SITES:
        try:
            r = requests.get(site["url"], headers=headers, timeout=15)
            if r.status_code != 200:
                print(f"[{site['naam']}] returned {r.status_code}")
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            cards = soup.select(site["card_selector"])

            for card in cards:
                try:
                    link_el = card.select_one("a[href]")
                    if not link_el:
                        continue
                    href = link_el.get("href")
                    url_l = urljoin(site["url"], href)
                    text = card.get_text(" ", strip=True)
                    titel = link_el.get_text(strip=True)[:120] or site["naam"]

                    listings.append({
                        "bron": site["naam"],
                        "titel": titel,
                        "plaats": _extract_plaats(text),
                        "prijs": _extract_prijs(text),
                        "m2": _extract_m2(text),
                        "kamers": _extract_kamers(text),
                        "url": url_l,
                    })
                except Exception as e:
                    print(f"[{site['naam']}] card error: {e}")

            time.sleep(REQUEST_DELAY_SEC)
        except Exception as e:
            print(f"[{site['naam']}] error: {e}")

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
