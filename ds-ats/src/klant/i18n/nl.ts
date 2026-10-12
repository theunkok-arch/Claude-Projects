// Alle tekst van het klantportaal, in het Nederlands.
//
// Dit bestand is de bron van de vorm: `en.ts` moet er precies op passen, anders
// klapt de typecheck en dus de build. Een ontbrekende vertaling wordt zo nooit
// een leeg plekje bij een opdrachtgever.
//
// De interne app blijft Nederlands. Alleen het portaal op /klant is vertaald,
// want dat is het enige scherm dat een klant leest.
//
// Drie soorten sleutels:
//
// 1. Schermtekst, per scherm gegroepeerd.
// 2. `fout`, op de code die de server meestuurt. Nooit op de zin zelf matchen:
//    daar ging het eerder mis (`message.startsWith('Je bent niet')`).
// 3. De vaste woordenlijsten uit de base. Die staan hier als weergave, nooit
//    als hernoeming: `Gescoord` blijft in Airtable `Gescoord`, en de app
//    sorteert er ook op. Zie de huisregel over stagenamen.

export const nl = {
  taal: { label: 'Taal', nl: 'Nederlands', en: 'English' },

  login: {
    portaal: 'Kandidatenportaal',
    uitleg: 'Log in met het e-mailadres en wachtwoord die je van ons hebt gekregen.',
    email: 'E-mailadres',
    wachtwoord: 'Wachtwoord',
    bezig: 'Bezig…',
    inloggen: 'Inloggen',
    kwijt:
      'Wachtwoord kwijt? Wij kunnen het niet opzoeken, het staat nergens bewaard. Vraag Do Solutions om een nieuw wachtwoord.',
  },

  portaal: {
    laden: 'Laden…',
    geenGegevens: 'Geen gegevens.',
    uitloggen: 'Uitloggen',
    versie: (v: string) => `versie ${v}`,
    geenOpdrachten: 'Nog geen opdrachten',
    geenOpdrachtenUitleg:
      'Er staan voor jou nog geen vacatures klaar. Neem contact op met Do Solutions als je hier wel iets verwacht.',
    opdrachten: 'Opdrachten',
    opdrachtenUitleg: 'De stand van zaken per vacature, bijgewerkt tot vandaag.',
    vacature: 'Vacature',
    samenvatting: (inProces: number, afgevallen: number) =>
      `${inProces} in het proces · ${afgevallen} afgevallen`,
    onbekendePagina: 'Deze pagina bestaat niet, of hij is niet voor jou beschikbaar.',
    naarOpdrachten: 'Naar je opdrachten',
  },

  vacature: {
    terug: 'Alle opdrachten',
    inProces: 'In het proces',
    afgevallen: 'Afgevallen',
    startdatum: 'Startdatum',
    streefdatum: 'Streefdatum shortlist',
    verloop: 'Verloop',
    verloopUitleg:
      'Hoeveel kandidaten deze fase ooit hebben bereikt. Het getal tussen haakjes is wie er nu staat.',
    waarom: 'Waarom kandidaten afvielen',
    waaromUitleg:
      'Geteld, niet per persoon. Een afvalreden is een oordeel over iemand; als aantal laat het zien waar de zoekopdracht op stuit.',
    kandidaten: 'Kandidaten in het proces',
    kandidatenUitleg:
      'Kandidaten staan op initialen tot ze weten dat ze bij jullie worden voorgedragen. Vanaf dat moment zie je de volledige naam en werkgever.',
    niemand: 'Er zit op dit moment niemand in het proces voor deze vacature.',
    onderDrempel: (n: number) =>
      n === 1
        ? '1 kandidaat is beoordeeld en bleef onder de 50. Die staat hier niet apart.'
        : `${n} kandidaten zijn beoordeeld en bleven onder de 50. Die staan hier niet apart.`,
    dagenInFase: (n: number) => (n === 1 ? '1 dag in deze fase' : `${n} dagen in deze fase`),
    geenStage: 'Geen fase',
  },

  score: {
    legenda: 'Wat de score betekent',
    nogNiet: 'Nog niet gescoord',
    banden: {
      top: 'Top fit',
      sterk: 'Sterke fit',
      goed: 'Goede fit',
      grens: 'Grensgeval',
      laag: 'Niet passend',
    },
  },

  /** Op de code uit de server, niet op de zin. */
  fout: {
    algemeen: 'Er ging iets mis.',
    geenVerbinding: 'Geen verbinding. Controleer je internet en probeer het opnieuw.',
    geenToegang: 'Geen toegang.',
    onbekendAdres: 'Onbekend adres.',
    veldenLeeg: 'Vul je e-mailadres en wachtwoord in.',
    teVeelPogingen: (v: { minuten: number }) =>
      `Te veel pogingen. Probeer het over ${v.minuten} minuten opnieuw.`,
    afgewezen: 'Onjuiste combinatie van e-mailadres en wachtwoord.',
    nietIngelogd: 'Je bent niet ingelogd.',
    ingetrokken: 'Deze toegang is ingetrokken.',
    ingetrokkenContact: 'Deze toegang is ingetrokken. Neem contact op met Do Solutions.',
    verlopen: 'Deze toegang is verlopen.',
    verlopenOp: (v: { datum: string }) =>
      `Deze toegang is verlopen op ${v.datum}. Vraag Do Solutions om een nieuwe.`,
  },

  /** Weergave van de stage, nooit een hernoeming van de waarde in Airtable. */
  stage: {
    Gescoord: 'Gescoord',
    Benaderd: 'Benaderd',
    Opgevolgd: 'Opgevolgd',
    Gereageerd: 'Gereageerd',
    Gesproken: 'Gesproken',
    Shortlist: 'Shortlist',
    Voorgesteld: 'Voorgesteld',
    'Interview klant': 'Interview klant',
    Aanbod: 'Aanbod',
    Geplaatst: 'Geplaatst',
    Ingewerkt: 'Ingewerkt',
    Afgevallen: 'Afgevallen',
  },

  reden: {
    Overgekwalificeerd: 'Overgekwalificeerd',
    Ondergekwalificeerd: 'Ondergekwalificeerd',
    'Geen match met team of cultuur': 'Geen match met team of cultuur',
    'Salariswens te hoog': 'Salariswens te hoog',
    'Afgewezen door ons (profielcheck)': 'Afgewezen door ons (profielcheck)',
    Achtergrondverificatie: 'Achtergrondverificatie',
    'Geen interesse': 'Geen interesse',
    'Geen reactie': 'Geen reactie',
    'Tevreden in huidige rol': 'Tevreden in huidige rol',
    Timing: 'Timing',
    Reisafstand: 'Reisafstand',
    Voorwaarden: 'Voorwaarden',
    'Elders geaccepteerd': 'Elders geaccepteerd',
    'Teruggetrokken tijdens proces': 'Teruggetrokken tijdens proces',
    'Vacature vervuld': 'Vacature vervuld',
    'Opdracht ingetrokken': 'Opdracht ingetrokken',
  },

  vacaturestatus: {
    Intake: 'Intake',
    Actief: 'Actief',
    'On hold': 'On hold',
    Vervuld: 'Vervuld',
    Gestopt: 'Gestopt',
  },
}

/**
 * De vorm waar elke taal op moet passen.
 *
 * Bewust afgeleid van het Nederlands en zonder `as const`: dan dwingt de
 * typecheck dezelfde sleutels af, maar niet dezelfde woorden.
 */
export type Woordenboek = typeof nl
