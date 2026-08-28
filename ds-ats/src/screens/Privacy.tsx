/**
 * Publieke privacyverklaring, buiten de inlog. Paragraaf 12 zet dit in fase 1
 * en niet later: er staan gegevens in van honderden mensen die zich nooit
 * hebben aangemeld, en die moeten kunnen lezen waarom.
 *
 * LET OP — dit is een ingevulde concepttekst, geen juridisch advies. De
 * plaatsen met [...] moeten door Do Solutions worden aangevuld, en laat het
 * geheel een keer nakijken voordat je ernaar linkt vanuit outreach.
 */
export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="font-semibold tracking-tight">
        Do <span className="text-oranje">Solutions</span>
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Privacyverklaring kandidaten</h1>
      <p className="mt-1 text-sm text-navy-400">Laatst bijgewerkt: 28 augustus 2026</p>

      <Blok titel="Wie verwerkt je gegevens">
        <p>
          Do Solutions, [rechtsvorm en KvK-nummer invullen], [adres invullen]. Wij zijn
          verwerkingsverantwoordelijke voor de gegevens die in deze verklaring staan. Vragen kun je
          stellen via <a className="underline" href="mailto:[e-mailadres invullen]">[e-mailadres invullen]</a>.
        </p>
      </Blok>

      <Blok titel="Waarom wij je gegevens hebben">
        <p>
          Wij zijn een werving- en selectiebureau. Wij zoeken actief naar mensen die passen bij een
          opdracht van een van onze opdrachtgevers. Dat betekent dat wij je gegevens kunnen hebben
          zonder dat je hebt gesolliciteerd: wij hebben je gevonden, meestal via je openbare
          LinkedIn-profiel.
        </p>
      </Blok>

      <Blok titel="Welke gegevens">
        <ul className="list-disc pl-5">
          <li>Naam, woonplaats en publieke profiel-URL.</li>
          <li>Huidige functie, werkgever, werkervaring, opleiding en talen.</li>
          <li>Contactgegevens die je zelf met ons deelt: e-mailadres en telefoonnummer.</li>
          <li>
            Onze eigen aantekeningen over de match met een specifieke vacature, en het verloop van
            het contact.
          </li>
        </ul>
        <p className="mt-2">
          Wij verzamelen geen bijzondere persoonsgegevens en vragen daar ook niet naar.
        </p>
      </Blok>

      <Blok titel="Op welke grondslag">
        <p>
          Wij baseren ons op ons gerechtvaardigd belang (artikel 6 lid 1 sub f AVG): het kunnen
          uitvoeren van een zoekopdracht. Wij hebben afgewogen dat het om beroepsmatige gegevens
          gaat die je zelf openbaar hebt gemaakt, dat wij je bij het eerste contact vertellen wie wij
          zijn en waarvoor wij bellen, en dat je op elk moment kunt zeggen dat wij je gegevens moeten
          wissen. Geef je ons contactgegevens of een cv, dan verwerken wij die op basis van je
          toestemming.
        </p>
      </Blok>

      <Blok titel="Met wie wij delen">
        <p>
          Wij delen je gegevens pas met een opdrachtgever nadat wij je hebben gesproken en jij
          akkoord hebt gegeven op een voordracht. Zolang dat niet is gebeurd, ziet de opdrachtgever
          hooguit geanonimiseerde aantallen — geen naam, geen profiel.
        </p>
        <p className="mt-2">
          Voor de opslag gebruiken wij Airtable en Netlify. Beide verwerken gegevens binnen de
          Europese Economische Ruimte dan wel onder de EU-standaardbepalingen. [Verwerkers­overeenkomsten
          controleren en hier bevestigen.]
        </p>
      </Blok>

      <Blok titel="Hoe lang wij je gegevens bewaren">
        <p>
          Twaalf maanden na ons laatste contact met jou. Daarna verwijderen wij je gegevens, tenzij
          je ons hebt laten weten dat je in beeld wilt blijven voor toekomstige opdrachten.
        </p>
      </Blok>

      <Blok titel="Je rechten">
        <p>Je kunt op elk moment vragen om:</p>
        <ul className="mt-1 list-disc pl-5">
          <li>inzage in wat wij van je hebben vastgelegd;</li>
          <li>correctie van gegevens die niet kloppen;</li>
          <li>verwijdering van al je gegevens;</li>
          <li>bezwaar tegen het feit dat wij je gegevens verwerken.</li>
        </ul>
        <p className="mt-2">
          Eén mail is genoeg, je hoeft geen reden te geven. Wij verwijderen dan alles wat wij van je
          hebben: je profiel, alle aanmeldingen op vacatures en de contacthistorie. Wij reageren
          binnen vier weken. Ben je het niet eens met wat wij doen, dan kun je een klacht indienen bij
          de Autoriteit Persoonsgegevens.
        </p>
      </Blok>

      <Blok titel="Geautomatiseerde besluitvorming">
        <p>
          Wij scoren profielen op geschiktheid voor een vacature, maar er wordt nooit automatisch
          een besluit over je genomen. Elke beoordeling en elke afwijzing is mensenwerk.
        </p>
      </Blok>

      <footer className="mt-10 border-t border-lijn pt-4 text-sm text-navy-400">
        Wil je dat wij je gegevens verwijderen? Mail{' '}
        <a className="underline" href="mailto:[e-mailadres invullen]">[e-mailadres invullen]</a> met
        het onderwerp "verwijderverzoek".
      </footer>
    </main>
  )
}

function Blok({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-1.5 text-lg font-semibold">{titel}</h2>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}
