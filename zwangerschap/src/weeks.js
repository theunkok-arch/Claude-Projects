// Inhoud per zwangerschapsweek. "Week 12" betekent: 12 weken en 0 tot 6 dagen.
// Lengte is kruin-stuit tot en met week 19, daarna kruin-hiel (vandaar de sprong
// bij week 20). Waarden zijn gemiddelden; elk kind groeit in zijn eigen tempo.
// Algemene informatie om mee te kijken, geen medisch advies.

export const DUE_DATE = '2027-04-16'
export const NAME = 'Benjamin'

export const WEEKS = {
  4: { cm: 0.1, g: 0, fruit: 'een maanzaadje',
    baby: ['Een klein bolletje cellen nestelt zich in de baarmoeder.', 'De placenta begint zich te vormen.'],
    mama: ['Rond nu blijft de menstruatie uit. Een test kan positief zijn.'] },
  5: { cm: 0.2, g: 0, fruit: 'een sesamzaadje',
    baby: ['De neurale buis ontstaat: de basis van hersenen en ruggenmerg.', 'Een eerste hartbuisje wordt aangelegd.'],
    mama: ['Moe, gevoelige borsten en vaker plassen zijn heel normaal.'] },
  6: { cm: 0.6, g: 0, fruit: 'een linze',
    baby: ['Het hartje begint te kloppen, op een echo soms al te zien.', 'Er verschijnen knopjes waar armen en benen komen.'],
    mama: ['Misselijkheid kan nu beginnen. Kleine, frequente maaltijden helpen vaak.'] },
  7: { cm: 1.0, g: 0, fruit: 'een blauwe bes',
    baby: ['De hersenen groeien hard: zo\'n 100 nieuwe cellen per minuut.', 'Handjes en voetjes lijken nog op peddeltjes.'],
    mama: ['Tijd om de verloskundige te bellen voor een eerste afspraak.'] },
  8: { cm: 1.6, g: 1, fruit: 'een framboos',
    baby: ['Vingers en tenen beginnen zich af te tekenen.', 'Het staartje verdwijnt, het gezichtje krijgt vorm.'],
    mama: ['De baarmoeder is nu ongeveer zo groot als een sinaasappel.'] },
  9: { cm: 2.3, g: 2, fruit: 'een kers',
    baby: ['Alle belangrijke organen zijn aangelegd.', 'Kleine spiertjes maken de eerste bewegingen, nog niet voelbaar.'],
    mama: ['Je bloedvolume neemt toe, dat kan duizelig maken.'] },
  10: { cm: 3.1, g: 4, fruit: 'een aardbei',
    baby: ['Officieel geen embryo meer maar een foetus.', 'Nageltjes en tandknopjes worden aangelegd.'],
    mama: ['Vaak de periode van de eerste echo en de termijnecho.'] },
  11: { cm: 4.1, g: 7, fruit: 'een vijg',
    baby: ['Handjes kunnen openen en sluiten.', 'Het hoofdje is bijna de helft van de lengte.'],
    mama: ['De misselijkheid wordt bij veel vrouwen minder.'] },
  12: { cm: 5.4, g: 14, fruit: 'een limoen',
    baby: ['Reflexen werken: Benjamin kan zijn teentjes krullen en duimpje zoeken.', 'De nieren maken al urine.', 'Darmen verhuizen van de navelstreng naar de buik.'],
    mama: ['Het einde van het eerste trimester is in zicht. Het risico op een miskraam daalt flink.'] },
  13: { cm: 7.4, g: 23, fruit: 'een peultje',
    baby: ['Vingerafdrukken ontstaan, uniek voor altijd.', 'De stembandjes worden aangelegd.'],
    mama: ['Welkom in het tweede trimester, vaak de fijnste periode.'] },
  14: { cm: 8.7, g: 43, fruit: 'een citroen',
    baby: ['Benjamin kan fronsen en grimassen trekken.', 'Een fijn donshaar (lanugo) bedekt de huid.'],
    mama: ['Meer energie, en soms al een klein buikje.'] },
  15: { cm: 10.1, g: 70, fruit: 'een appel',
    baby: ['Hij reageert op licht door de buikwand heen.', 'De botten worden steviger.'],
    mama: ['Een verstopte neus of bloedend tandvlees komt door de hormonen.'] },
  16: { cm: 11.6, g: 100, fruit: 'een avocado',
    baby: ['Oogjes bewegen al langzaam onder de oogleden.', 'Het hartje pompt zo\'n 25 liter bloed per dag.'],
    mama: ['Sommige moeders voelen nu de eerste fladderingen.'] },
  17: { cm: 13.0, g: 140, fruit: 'een ui',
    baby: ['Er wordt vetweefsel aangelegd.', 'Navelstreng wordt dikker en sterker.'],
    mama: ['Je zwaartepunt verschuift. Platte schoenen worden je vriend.'] },
  18: { cm: 14.2, g: 190, fruit: 'een paprika',
    baby: ['Oortjes staan op hun plek, hij kan geluid horen.', 'Hij gaapt en hikt.'],
    mama: ['Praat en zing maar tegen je buik, hij begint je te leren kennen.'] },
  19: { cm: 15.3, g: 240, fruit: 'een tomaat',
    baby: ['Een beschermend smeerlaagje (vernix) bedekt de huid.', 'De zintuigen ontwikkelen zich razendsnel.'],
    mama: ['Rond nu volgt de twintigwekenecho.'] },
  20: { cm: 25.6, g: 300, fruit: 'een banaan',
    baby: ['Halverwege! Vanaf nu meten we van kruin tot hiel.', 'Hij slikt vruchtwater en oefent met verteren.'],
    mama: ['De baarmoeder zit nu ter hoogte van je navel.'] },
  21: { cm: 26.7, g: 360, fruit: 'een wortel',
    baby: ['Bewegingen worden sterker, soms een echte schop.', 'Wenkbrauwen worden zichtbaar.'],
    mama: ['Partner kan de schopjes soms al van buiten voelen.'] },
  22: { cm: 27.8, g: 430, fruit: 'een courgette',
    baby: ['Lippen en oogleden zijn duidelijk gevormd.', 'De tastzin is goed ontwikkeld: hij voelt zijn gezichtje.'],
    mama: ['Striae kunnen verschijnen. Insmeren voelt fijn, voorkomen lukt niet altijd.'] },
  23: { cm: 28.9, g: 500, fruit: 'een grapefruit',
    baby: ['Hij hoort jullie stemmen en schrikt van harde geluiden.', 'De longen maken zich klaar voor de eerste ademhaling.'],
    mama: ['Gezwollen voeten aan het einde van de dag zijn normaal.'] },
  24: { cm: 30.0, g: 600, fruit: 'een maïskolf',
    baby: ['Het gezichtje is bijna af, met wimpers.', 'Hij heeft een slaap-waakritme.'],
    mama: ['Rond nu vaak de suikertest (bij een indicatie).'] },
  25: { cm: 34.6, g: 660, fruit: 'een bloemkool',
    baby: ['Haartjes op het hoofd krijgen kleur.', 'Handjes kunnen een vuistje maken.'],
    mama: ['Slapen op je zij wordt prettiger.'] },
  26: { cm: 35.6, g: 760, fruit: 'een krop sla',
    baby: ['De oogjes gaan voor het eerst open.', 'Hij oefent met ademhalingsbewegingen.'],
    mama: ['Harde buiken (oefenweeën) kunnen nu af en toe voorkomen.'] },
  27: { cm: 36.6, g: 875, fruit: 'een broccoli',
    baby: ['Hersenactiviteit neemt flink toe; misschien droomt hij al.', 'Hij herkent jullie stemmen.'],
    mama: ['Het laatste trimester begint bijna.'] },
  28: { cm: 37.6, g: 1000, fruit: 'een aubergine',
    baby: ['Een kilo! Hij knippert met zijn oogjes.', 'Vetlaagje groeit: hij wordt voller.'],
    mama: ['Welkom in het derde trimester. Afspraken worden vaker.'] },
  29: { cm: 38.6, g: 1150, fruit: 'een flespompoen',
    baby: ['Botten zijn volledig gevormd maar nog zacht.', 'Hij reageert op aanraking van buiten.'],
    mama: ['Let op de bewegingen: elke dag zijn ritme voelen geeft rust.'] },
  30: { cm: 39.9, g: 1320, fruit: 'een kool',
    baby: ['Het lanugo begint te verdwijnen.', 'Hij kan zijn hoofdje van links naar rechts draaien.'],
    mama: ['Zwangerschapsverlof komt dichterbij.'] },
  31: { cm: 41.1, g: 1500, fruit: 'een kokosnoot',
    baby: ['Alle vijf de zintuigen werken.', 'De ruimte wordt krapper, bewegingen voelen anders.'],
    mama: ['Kortademig? De baarmoeder drukt tegen je middenrif.'] },
  32: { cm: 42.4, g: 1700, fruit: 'een ananasje',
    baby: ['Teennageltjes zijn er.', 'Veel baby\'s draaien rond nu met het hoofd naar beneden.'],
    mama: ['Tijd om de vluchttas en het geboorteplan te bespreken.'] },
  33: { cm: 43.7, g: 1900, fruit: 'een ananas',
    baby: ['Het immuunsysteem krijgt antistoffen van mama.', 'De schedelbotjes blijven flexibel voor de geboorte.'],
    mama: ['Slaap komt minder vanzelf. Kussen tussen de knieën helpt.'] },
  34: { cm: 45.0, g: 2150, fruit: 'een meloen',
    baby: ['Centraal zenuwstelsel en longen rijpen verder.', 'Het vernix wordt dikker.'],
    mama: ['De kraamzorg is als het goed is geregeld.'] },
  35: { cm: 46.2, g: 2380, fruit: 'een honingmeloen',
    baby: ['Nieren en lever zijn helemaal klaar.', 'Hij groeit nu vooral in gewicht.'],
    mama: ['Vaker plassen, want hij drukt op je blaas.'] },
  36: { cm: 47.4, g: 2600, fruit: 'een romaine sla',
    baby: ['Hij zakt mogelijk al wat in het bekken.', 'Zuigen en slikken gaan steeds beter.'],
    mama: ['Ademen wordt soms makkelijker als hij indaalt.'] },
  37: { cm: 48.6, g: 2860, fruit: 'een bos snijbiet',
    baby: ['Vanaf nu is Benjamin voldragen.', 'Hij oefent met grijpen, ademen en zuigen.'],
    mama: ['Een bevalling vanaf nu heet "op tijd".'] },
  38: { cm: 49.8, g: 3080, fruit: 'een prei',
    baby: ['Organen zijn klaar voor de wereld buiten.', 'Het meeste lanugo is weg.'],
    mama: ['Weet wanneer je de verloskundige belt. Hang het nummer op het koelkastdeurtje.'] },
  39: { cm: 50.7, g: 3290, fruit: 'een kleine watermeloen',
    baby: ['Zijn hersenen groeien nog steeds hard.', 'Hij wacht op het goede moment.'],
    mama: ['Rust waar het kan. Het kan nu elk moment beginnen.'] },
  40: { cm: 51.2, g: 3460, fruit: 'een pompoen',
    baby: ['Uitgerekend! Benjamin is klaar om jullie te ontmoeten.', 'Maar slechts 1 op de 20 baby\'s komt precies op deze dag.'],
    mama: ['Na 41 weken bespreekt de verloskundige de volgende stappen.'] },
}

export const MIN_WEEK = 4
export const MAX_WEEK = 40

// Stadia met een eigen 3D-model. Tussenliggende weken tonen het dichtstbijzijnde
// eerdere model. Hotspots staan in genormaliseerde coördinaten van de bounding
// box van het model (-0.5..0.5); stel ze bij met ?edit=1 (tik op het model en
// lees de coördinaten af in de hoek).
export const STAGES = [6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40]

export function stageFor(week) {
  let s = STAGES[0]
  for (const st of STAGES) if (st <= week) s = st
  return s
}

// Algemene hotspots per lichaamsdeel. Welke getoond worden hangt af van de week.
export const HOTSPOTS = {
  hart: { label: 'Hart', from: 6,
    text: (w) => w < 10 ? 'Het hartje klopt al, zo\'n 110 keer per minuut, en versnelt nog.' : 'Het hart klopt 120 tot 160 keer per minuut, ongeveer twee keer zo snel als dat van jullie.' },
  hersenen: { label: 'Hersenen', from: 6,
    text: (w) => w < 20 ? 'De hersenen groeien het hardst van alles; het hoofdje is daarom zo groot.' : 'De hersenen maken plooien, zodat er meer ruimte is voor verbindingen.' },
  handjes: { label: 'Handjes', from: 8,
    text: (w) => w < 11 ? 'Vingertjes komen los van elkaar uit het peddelvormige handje.' : w < 20 ? 'Handjes openen en sluiten, en het duimpje vindt al de weg naar de mond.' : 'Hij grijpt naar de navelstreng en voelt aan zijn gezichtje.' },
  ogen: { label: 'Oogjes', from: 8,
    text: (w) => w < 26 ? 'De oogleden zijn nog gesloten om de oogjes te beschermen.' : 'De oogjes kunnen open en reageren op licht door je buik.' },
  oren: { label: 'Oortjes', from: 10,
    text: (w) => w < 18 ? 'De oortjes schuiven van de hals naar hun plek opzij van het hoofd.' : 'Hij hoort je hartslag, je stem en de muziek die je opzet.' },
  navelstreng: { label: 'Navelstreng', from: 6,
    text: () => 'Via de navelstreng krijgt hij zuurstof en voeding van de placenta.' },
  beentjes: { label: 'Beentjes', from: 9,
    text: (w) => w < 16 ? 'Beentjes en voetjes maken al kleine trappelbewegingen.' : 'Die schopjes voel jij steeds beter. Vooral als je stil ligt.' },
}

// Standaardposities (genormaliseerd), uitgaande van een zijaanzicht met het hoofd
// boven en het gezicht naar +x. Per stadium te overschrijven zodra de modellen er zijn.
export const DEFAULT_HOTSPOT_POS = {
  hersenen: [-0.05, 0.38, 0],
  ogen: [0.22, 0.22, 0.12],
  oren: [0.0, 0.2, 0.22],
  hart: [0.12, -0.02, 0.1],
  handjes: [0.28, 0.02, 0.15],
  navelstreng: [0.22, -0.18, 0.05],
  beentjes: [0.05, -0.38, 0.12],
}

export const STAGE_HOTSPOT_POS = {}
