// Het klantportaal in het Engels.
//
// Deze moet precies op `Woordenboek` passen, de vorm van nl.ts. Vergeet je een
// sleutel, dan faalt `npx tsc` en dus de build. Dat is met opzet: een
// ontbrekende vertaling hoort nooit als leeg plekje bij een opdrachtgever te
// belanden.
//
// De stages, afvalredenen en vacaturestatussen zijn hier vertalingen van de
// waarde in Airtable. De base blijft Nederlands; dit is alleen weergave.

import type { Woordenboek } from './nl'

export const en: Woordenboek = {
  taal: { label: 'Language', nl: 'Nederlands', en: 'English' },

  login: {
    portaal: 'Candidate portal',
    uitleg: 'Sign in with the email address and password we sent you.',
    email: 'Email address',
    wachtwoord: 'Password',
    bezig: 'Signing in…',
    inloggen: 'Sign in',
    kwijt:
      'Lost your password? We cannot look it up, it is not stored anywhere. Ask Do Solutions for a new one.',
  },

  portaal: {
    laden: 'Loading…',
    geenGegevens: 'No data.',
    uitloggen: 'Sign out',
    versie: (v: string) => `version ${v}`,
    geenOpdrachten: 'No assignments yet',
    geenOpdrachtenUitleg:
      'There are no vacancies ready for you yet. Get in touch with Do Solutions if you expected to see something here.',
    opdrachten: 'Assignments',
    opdrachtenUitleg: 'Where each vacancy stands, up to date as of today.',
    vacature: 'Vacancy',
    samenvatting: (inProces: number, afgevallen: number) =>
      `${inProces} in process · ${afgevallen} dropped out`,
    onbekendePagina: 'This page does not exist, or it is not available to you.',
    naarOpdrachten: 'Back to your assignments',
  },

  vacature: {
    terug: 'All assignments',
    inProces: 'In process',
    afgevallen: 'Dropped out',
    startdatum: 'Start date',
    streefdatum: 'Shortlist target date',
    verloop: 'Progress',
    verloopUitleg:
      'How many candidates ever reached this stage. The number in brackets is who is there now.',
    waarom: 'Why candidates dropped out',
    waaromUitleg:
      'Counted, not per person. A drop-out reason is a judgement about someone; as a number it shows where the search runs into trouble.',
    kandidaten: 'Candidates in process',
    kandidatenUitleg:
      'Candidates are shown by initials until they know they are being put forward to you. From that point you see the full name and employer.',
    niemand: 'Nobody is in process for this vacancy at the moment.',
    onderDrempel: (n: number) =>
      n === 1
        ? '1 candidate was assessed and scored below 50. They are not listed separately.'
        : `${n} candidates were assessed and scored below 50. They are not listed separately.`,
    dagenInFase: (n: number) => (n === 1 ? '1 day in this stage' : `${n} days in this stage`),
    geenStage: 'No stage',
  },

  score: {
    legenda: 'What the score means',
    nogNiet: 'Not scored yet',
    banden: {
      top: 'Top fit',
      sterk: 'Strong fit',
      goed: 'Good fit',
      grens: 'Borderline',
      laag: 'Not a fit',
    },
  },

  fout: {
    algemeen: 'Something went wrong.',
    geenVerbinding: 'No connection. Check your internet and try again.',
    geenToegang: 'No access.',
    onbekendAdres: 'Unknown address.',
    veldenLeeg: 'Enter your email address and password.',
    teVeelPogingen: (v: { minuten: number }) =>
      `Too many attempts. Try again in ${v.minuten} minutes.`,
    afgewezen: 'That email address and password do not match.',
    nietIngelogd: 'You are not signed in.',
    ingetrokken: 'This access has been withdrawn.',
    ingetrokkenContact: 'This access has been withdrawn. Please contact Do Solutions.',
    verlopen: 'This access has expired.',
    verlopenOp: (v: { datum: string }) =>
      `This access expired on ${v.datum}. Ask Do Solutions for new access.`,
  },

  stage: {
    Gescoord: 'Scored',
    Benaderd: 'Contacted',
    Opgevolgd: 'Followed up',
    Gereageerd: 'Replied',
    Gesproken: 'Spoken with',
    Shortlist: 'Shortlisted',
    Voorgesteld: 'Presented',
    'Interview klant': 'Client interview',
    Aanbod: 'Offer',
    Geplaatst: 'Placed',
    Ingewerkt: 'Onboarded',
    Afgevallen: 'Dropped out',
  },

  reden: {
    Overgekwalificeerd: 'Overqualified',
    Ondergekwalificeerd: 'Underqualified',
    'Geen match met team of cultuur': 'Not a fit with the team or culture',
    'Salariswens te hoog': 'Salary expectation too high',
    'Afgewezen door ons (profielcheck)': 'Rejected by us (profile check)',
    Achtergrondverificatie: 'Background check',
    'Geen interesse': 'Not interested',
    'Geen reactie': 'No response',
    'Tevreden in huidige rol': 'Happy in their current role',
    Timing: 'Timing',
    Reisafstand: 'Commute',
    Voorwaarden: 'Terms and conditions',
    'Elders geaccepteerd': 'Accepted another offer',
    'Teruggetrokken tijdens proces': 'Withdrew during the process',
    'Vacature vervuld': 'Vacancy filled',
    'Opdracht ingetrokken': 'Assignment withdrawn',
  },

  vacaturestatus: {
    Intake: 'Intake',
    Actief: 'Active',
    'On hold': 'On hold',
    Vervuld: 'Filled',
    Gestopt: 'Stopped',
  },
}
