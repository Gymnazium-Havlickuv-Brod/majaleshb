// Úrovně partnerství Majálesu 2027 (5 000 / 10 000 / 25 000 Kč a věcný dar).
// Pozor: soutěž o ceny se nesmí jmenovat „tombola“ (zákon o hazardních hrách), vždy „hra o ceny“.

export type Uroven = {
  id: string;
  nazev: string;
  castka: string;
  podtitul: string;
  vyhody: string[];
  zvyraznit?: boolean;
  stitek?: string; // štítek nad kartou, např. „jen jeden“
};

export const UROVNE: Uroven[] = [
  {
    id: 'podporovatel',
    nazev: 'Podporovatel',
    castka: '5 000 Kč',
    podtitul: 'Pro menší firmy a živnostníky z Brodu.',
    vyhody: ['logo na webu', 'poděkování na sociálních sítích', 'poděkování na pódiu'],
  },
  {
    id: 'partner',
    nazev: 'Partner',
    castka: '10 000 Kč',
    podtitul: 'Nejčastější forma podpory.',
    vyhody: [
      'logo na webu',
      'poděkování na sociálních sítích',
      'poděkování na pódiu',
      'logo na plakátu',
      'banner na pódiu',
    ],
  },
  {
    id: 'hlavni',
    nazev: 'Hlavní partner',
    castka: '25 000 Kč',
    podtitul: 'Největší viditelnost na náměstí i na pódiu.',
    zvyraznit: true,
    vyhody: [
      'logo na webu',
      'poděkování na sociálních sítích',
      'poděkování na pódiu',
      'logo na plakátu',
      'hlavní banner na pódiu',
      'příspěvek věnovaný partnerovi',
      'program na pódiu',
    ],
  },
  {
    id: 'dar',
    nazev: 'Dar',
    castka: 'Věcný dar',
    podtitul: 'Podpora jídlem nebo cenami do hry o ceny.',
    vyhody: ['jídlo: zmíníme vás na pódiu', 'jídlo: zmíníme vás u stánku', 'ceny do hry o ceny'],
  },
];

export const DALSI = [
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

export type UrovenLoga = 'hlavni' | 'partner';

export type Partner = {
  nazev: string;
  logo?: string; // soubor v src/assets/partneri/
  url?: string;
  uroven: UrovenLoga; // hlavní partner = 'hlavni'; partner, podporovatel i dar jdou do 'partner'
};

export const PARTNERI: Partner[] = [
  // { nazev: 'Firma s.r.o.', logo: 'firma.svg', url: 'https://www.firma.cz', uroven: 'hlavni' },
];

export const MISTA: Record<UrovenLoga, { nadpis: string; pocet: number }> = {
  hlavni: { nadpis: 'Hlavní partneři', pocet: 3 },
  partner: { nadpis: 'Partneři', pocet: 8 },
};
