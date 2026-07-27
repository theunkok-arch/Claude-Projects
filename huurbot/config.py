"""Centrale configuratie. Pas hier aan zonder code aan te raken."""

CRITERIA = {
    "min_oppervlakte_m2": 150,
    "min_huur": 0,
    "max_huur": 99999,  # Geen bovengrens
    "min_kamers": 3,
}

# Plaatsen + postcode-ranges voor filtering
PLAATSEN = {
    "De Bilt": ["3731", "3732", "3733"],
    "Bilthoven": ["3721", "3722", "3723"],
    "Groenekan": ["3737"],
    "Maartensdijk": ["3738"],
    "Hollandsche Rading": ["3739"],
    "Den Dolder": ["3734"],
    "Zeist": ["3700", "3701", "3702", "3703", "3704", "3705", "3706", "3707", "3708"],
    "Bunnik": ["3981"],
    "Utrecht-Oost": ["3581", "3582", "3583", "3584", "3585"],
    "Tuindorp": ["3571", "3572", "3573"],
}

ALLE_POSTCODES = [pc for pcs in PLAATSEN.values() for pc in pcs]
ALLE_PLAATSEN = list(PLAATSEN.keys())

# Persoonlijke context voor de AI fit-scoring
PERSOONLIJKE_CONTEXT = """
Theun (50) zoekt een huurwoning voor zichzelf, partner en twee dochters (vroege tienerleeftijd).
Belangrijke criteria:
- Minimaal 150 m2 woonoppervlak
- 4+ kamers (ouders + 2 kinderkamers + werkkamer ideaal)
- Tuin of ruim balkon zeer gewenst
- Goede staat (geen klusprojecten)
- Reistijd naar Utrecht Centrum redelijk
- Permanent contract sterk geprefereerd boven tijdelijk
- Huisdier-vriendelijk een plus
- Karakteristieke / vrijstaande / 2-onder-1-kap > flat
"""

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
REQUEST_DELAY_SEC = 3  # Tussen requests om rate-limit te respecteren
