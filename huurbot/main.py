"""Main orchestrator. Wordt gerund door GitHub Actions cron."""
from scrapers import pararius, funda, huurwoningen, vesteda, lokaal
from ai_filter import score_listing
from sheets import get_existing_urls, append_listings
from config import CRITERIA, ALLE_PLAATSEN


def matches_criteria(listing: dict) -> bool:
    """Hard filters voordat we AI scoring doen (saves API calls)."""
    m2 = listing.get("m2")
    if m2 and m2 < CRITERIA["min_oppervlakte_m2"]:
        return False

    prijs = listing.get("prijs")
    if prijs and prijs < CRITERIA["min_huur"]:
        return False
    if prijs and prijs > CRITERIA["max_huur"]:
        return False

    # Plaats-filter: skip listings buiten target regio (ALS plaats herkenbaar is)
    plaats = (listing.get("plaats") or "").lower()
    if plaats:
        match_plaats = any(p.lower() in plaats for p in ALLE_PLAATSEN)
        if not match_plaats:
            return False

    return True


def main():
    print("=" * 60)
    print("Huurbot dagelijkse run gestart")
    print("=" * 60)

    # 1. Verzamel van alle bronnen
    all_listings = []
    for naam, scraper in [
        ("Pararius", pararius),
        ("Funda", funda),
        ("Huurwoningen", huurwoningen),
        ("Vesteda/Bouwinvest", vesteda),
        ("Lokaal", lokaal),
    ]:
        try:
            results = scraper.fetch()
            print(f"[{naam}] {len(results)} listings opgehaald")
            all_listings.extend(results)
        except Exception as e:
            print(f"[{naam}] FAILED: {e}")

    print(f"\nTotaal opgehaald: {len(all_listings)}")

    # 2. Deduplicatie tegen Sheet
    bestaande_urls = get_existing_urls()
    nieuw = [l for l in all_listings if l.get("url") and l["url"] not in bestaande_urls]
    print(f"Nieuw (niet eerder gezien): {len(nieuw)}")

    # 3. Hard filters
    gefilterd = [l for l in nieuw if matches_criteria(l)]
    print(f"Na hard-filter (m², plaats, prijs): {len(gefilterd)}")

    # 4. AI scoring (alleen op overgebleven set)
    for l in gefilterd:
        score_data = score_listing(l)
        l["score"] = score_data["score"]
        l["motivatie"] = score_data["motivatie"]
        print(f"   {l.get('titel', '?')[:50]} | {l['score']} | {l['motivatie']}")

    # 5. Sorteer hoogste score eerst, dan schrijven
    gefilterd.sort(key=lambda x: x.get("score", 0), reverse=True)
    append_listings(gefilterd)

    print("\nKlaar.")


if __name__ == "__main__":
    main()
