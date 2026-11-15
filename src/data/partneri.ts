// Úrovně partnerství Majálesu 2027.
// Pozor: tabulka partnerů v pracovním repu (partneri/tabulka-partneru-2027.xlsx) má zatím
// úrovně do 5 000 / 10 000 / 25 000 a víc – sjednotit, až se úrovně schválí.

export type Uroven = {
  id: string;
  nazev: string;
  castka: string;
  podtitul: string;
  vyhody: string[];
  zvyraznit?: boolean;
};

export const UROVNE: Uroven[] = [
  {
    id: 'podporovatel',
    nazev: 'Podporovatel',
    castka: '5 000 Kč',
    podtitul: 'Pro menší firmy a živnostníky z Brodu.',
    vyhody: ['logo na webu majaleshb.cz', 'poděkování na sociálních sítích Majálesu'],
  },
  {
    id: 'partner',
    nazev: 'Partner',
    castka: '10 000 Kč',
    podtitul: 'Nejčastější forma podpory.',
    vyhody: [
      'všechno z úrovně Podporovatel',
      'logo na backdropu u pódia a na fotostěně',
      'poděkování z pódia během dne',
    ],
  },
  {
    id: 'hlavni',
    nazev: 'Hlavní partner',
    castka: 'od 20 000 Kč',
    podtitul: 'Výrazná viditelnost na náměstí.',
    vyhody: [
      'všechno z úrovně Partner',
      'vlastní banner na náměstí',
      'logo na plakátech a v programu',
      'krátké video studentů o vaší firmě',
    ],
  },
  {
    id: 'generalni',
    nazev: 'Generální partner',
    castka: 'od 25 000 Kč',
    podtitul: 'Majáles a vaše značka spolu.',
    zvyraznit: true,
    vyhody: [
      'všechno z úrovně Hlavní partner',
      'vlastní stánek nebo stan přímo na náměstí',
      'označení „generální partner“ na všech materiálech',
      'prezentace na pódiu a v aftermovie',
      'spolupráci připravíme do detailu společně',
    ],
  },
];

export const DALSI = [
  {
    id: 'barter',
    nazev: 'Barter',
    podtitul: 'Podpora věcí nebo službou',
    text: 'Jídlo a pití pro tým, ceny do soutěží, technika, doprava, tisk. Protihodnotu nastavíme podle hodnoty plnění.',
  },
  {
    id: 'na-miru',
    nazev: 'Na míru',
    podtitul: 'Individuální nabídka',
    text: 'Nesedí vám ani jedna úroveň? Napište nám, co by vám dávalo smysl, a postavíme spolupráci spolu.',
  },
];

export const PROC = [
  {
    nadpis: 'Celé náměstí',
    text: 'Majáles se koná na Havlíčkově náměstí, v srdci města. Celý den, od dopoledne do noci.',
  },
  {
    nadpis: 'Studenti dvou škol',
    text: 'Akci připravují studenti Gymnázia a SPŠ stavební. Vaše podpora jde přímo do jejich projektu.',
  },
  {
    nadpis: 'Pro celé město',
    text: 'Kapely, sport, program pro děti i rodiny. Uvidí vás mladí i jejich rodiče.',
  },
];

export const POSTUP = [
  'Napište nám, stačí pár vět.',
  'Domluvíme úroveň a co za to dostanete.',
  'Podepíšeme smlouvu a připravíme podklady (logo, banner).',
  'Na Majálesu vás uvidí celé náměstí, po akci dostanete fotky.',
];

// ---- Potvrzení partneři (loga na webu) ----
// Jak přidat partnera:
//  1. logo ulož do src/assets/partneri/ (ideálně SVG, jinak PNG s průhledným pozadím, šířka aspoň 600 px)
//  2. přidej řádek sem, `logo` = název souboru
//  3. na web jen se souhlasem partnera a až po potvrzení (smlouva / platba)
// Dokud je v úrovni míň partnerů než `MISTA`, doplní se zástupná místa „Vaše logo“.

export type UrovenLoga = 'generalni' | 'hlavni' | 'partner';

export type Partner = {
  nazev: string;
  logo?: string; // soubor v src/assets/partneri/
  url?: string;
  uroven: UrovenLoga; // podporovatel, partner i barter jdou do 'partner'
};

export const PARTNERI: Partner[] = [
  // { nazev: 'Firma s.r.o.', logo: 'firma.svg', url: 'https://www.firma.cz', uroven: 'hlavni' },
];

export const MISTA: Record<UrovenLoga, { nadpis: string; pocet: number }> = {
  generalni: { nadpis: 'Generální partner', pocet: 1 },
  hlavni: { nadpis: 'Hlavní partneři', pocet: 3 },
  partner: { nadpis: 'Partneři', pocet: 8 },
};
