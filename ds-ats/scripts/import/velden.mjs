// De veld-id's van de ATS-base appSAz5sjFyPm4e0g, op één plek.
//
// Deze lijsten stonden in mcp-batches.mjs en in sync.mjs, met in de tweede het
// commentaar "Gelijk aan mcp-batches.mjs". Dat is precies de constructie die
// het misgaan uitnodigt: een veld erbij in het ene bestand en niet in het
// andere, en dan schrijft de import iets weg wat de sync er weer af haalt.
// Dezelfde reden waarom shared/stages.mjs bestaat.
//
// Wat de lezer oplevert hoort hier compleet in te staan. Laat nooit een veld
// weg om een batch kleiner te maken: dat kostte bij de import van 484
// aanmeldingen de complete score-onderbouwing, en niemand zag dat, want een
// leeg veld ziet er niet uit als een fout. Is een batch te groot, verlaag dan
// PER_BATCH in het aanroepende script.

export const KANDIDAAT_VELDEN = {
  Naam: 'fldQIFur9mv4iEW3o',
  'LinkedIn-URL': 'fldyIJfhaSHN73NvY',
  'E-mail': 'fldKNZWTDgtYh39eE',
  Telefoon: 'fldhH5eH7X0J62eqD',
  Instagram: 'fldrpaCEB8RELj7KF',
  Woonplaats: 'fldEnhEWMNzMMsEMK',
  'Huidige rol': 'fldghxszbfwFZT3vL',
  'Huidige werkgever': 'fldAO15vFPzDf9QGU',
  Opleiding: 'fldpKJRL5LMyjntVb',
  Talen: 'fldkrLqtgILPb0O73',
  Bron: 'fldhw1ZEIgH6pzNU1',
  'Laatste contact': 'fldejtMGxyH4T3Se8',
}

export const AANMELDING_VELDEN = {
  Aanmelding: 'fldrokgT9ocqlxIMM',
  Stage: 'fldxhOfwK0xJuLmvJ',
  'Reden afvallen': 'fldoppqbtmIYs9QOR',
  Eigenaar: 'fldWjFTYVtdMThlBs',
  'Datum in huidige stage': 'fld3r0aWsAVVFHPql',
  'Datum aangemaakt': 'fldH0XlZaSPJOFGug',
  'Score totaal': 'fldA5l5QCqwcxqXU8',
  'Score-onderbouwing': 'fldVbf3o5cwtst2ki',
  'Reistijd minuten': 'fldgFDWJlFaK9l2OS',
  Opmerkingen: 'fld4aQRWCz67bD5M1',
  'Outreach-concept': 'fldtyiPCfsdITrwHT',
  Concurrent: 'fldBrXKLqvGelxUDl',
}

export const STAGELOG_VELDEN = {
  Omschrijving: 'fldRbqdQXuSZv9sGA',
  'Naar stage': 'fld4OfMGt3ejTnfZL',
  Datum: 'fld7GeDZkjC3mCWQe',
}

export const LINK_KANDIDAAT = 'fldEdzzoV2QZ0B1hC'
export const LINK_VACATURE = 'fldrGEsSZZrZPmJCL'
export const LINK_AANMELDING = 'fldvjMTnid9PVRCUf'
