"""AI fit-scoring met Claude. Gebruikt Haiku voor kostenbeheersing."""
import os
import json
import anthropic
from config import PERSOONLIJKE_CONTEXT

MODEL = "claude-haiku-4-5-20251001"  # Snel en goedkoop voor scoring
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def score_listing(listing: dict) -> dict:
    """Geeft listing een fit score 0-100 + 1-zin motivatie."""
    prompt = f"""Je bent een woning-adviseur. Beoordeel deze huurwoning voor een huurder met dit profiel:

{PERSOONLIJKE_CONTEXT}

Listing data:
- Bron: {listing.get('bron')}
- Titel: {listing.get('titel')}
- Plaats: {listing.get('plaats')}
- Prijs: {listing.get('prijs')} EUR/maand
- Oppervlakte: {listing.get('m2')} m²
- Kamers: {listing.get('kamers')}
- URL: {listing.get('url')}

Geef JSON terug, niets anders:
{{"score": <0-100 integer>, "motivatie": "<1 korte zin in NL, max 25 woorden>"}}

Score richtlijnen:
- 90+: uitstekende match op alle criteria
- 70-89: goede match, kleine concessies
- 50-69: redelijk, significante mismatch op 1 criterium
- <50: slechte match (te klein, verkeerde plaats, slechte staat indicatie)
"""

    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        # Strip eventuele ```json fences
        text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        return {
            "score": int(result.get("score", 0)),
            "motivatie": result.get("motivatie", ""),
        }
    except Exception as e:
        print(f"[AI] scoring error voor {listing.get('url')}: {e}")
        return {"score": 0, "motivatie": f"Scoring failed: {e}"}
