"""Google Sheets writer met deduplicatie via URL kolom."""
import os
import json
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_NAME = "Listings"
URL_COLUMN_INDEX = 8  # H kolom (1-indexed: Datum=1, Bron=2, Titel=3, Plaats=4, Prijs=5, m²=6, Kamers=7, URL=8)


def _get_sheet():
    creds_json = os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]
    creds_dict = json.loads(creds_json)
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(os.environ["GOOGLE_SHEET_ID"])
    return sheet.worksheet(SHEET_NAME)


def get_existing_urls() -> set:
    """Return set van URLs die al in de Sheet staan, voor dedup."""
    ws = _get_sheet()
    try:
        col = ws.col_values(URL_COLUMN_INDEX)
        return set(col[1:])  # skip header
    except Exception as e:
        print(f"[Sheets] kon bestaande URLs niet lezen: {e}")
        return set()


def append_listings(scored_listings: list[dict]):
    """Voeg nieuwe rijen toe. Verwacht listings met 'score' en 'motivatie' velden."""
    if not scored_listings:
        print("[Sheets] geen nieuwe listings om toe te voegen")
        return

    ws = _get_sheet()
    today = datetime.now().strftime("%Y-%m-%d")

    rows = []
    for l in scored_listings:
        rows.append([
            today,
            l.get("bron", ""),
            l.get("titel", ""),
            l.get("plaats", ""),
            l.get("prijs", ""),
            l.get("m2", ""),
            l.get("kamers", ""),
            l.get("url", ""),
            l.get("score", ""),
            l.get("motivatie", ""),
            "Nieuw",  # Status kolom voor jou om bij te werken
        ])

    ws.append_rows(rows, value_input_option="USER_ENTERED")
    print(f"[Sheets] {len(rows)} nieuwe listings toegevoegd")
