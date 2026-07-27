"""Proxy helper voor ScraperAPI. Alle scrapers gebruiken proxy_get() in plaats van requests.get()."""
import os
import requests

SCRAPERAPI_KEY = os.environ.get("SCRAPERAPI_KEY", "")


def proxy_get(url, headers=None, timeout=30):
    if SCRAPERAPI_KEY:
        params = {
            "api_key": SCRAPERAPI_KEY,
            "url": url,
            "render": "false",
            "country_code": "nl",
        }
        return requests.get(
            "https://api.scraperapi.com",
            params=params,
            timeout=timeout,
        )
    return requests.get(url, headers=headers, timeout=timeout)
