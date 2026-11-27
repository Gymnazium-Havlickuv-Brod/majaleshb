// Veřejné informace o Majálesu 2027 – jen to, co je potvrzené.
// Zdroj pravdy je pracovní repo c:\dev\ghb\majales (data/milniky.json → akce.datum).
// Nepotvrzené věci (časy programu, jména kapel, ceny) sem nepatří.

export const AKCE = {
  nazev: 'Majáles 2027',
  rok: 2027,
  datum: '22. 5. 2027',
  datumIso: '2027-05-22',
  den: 'sobota',
  // odpočet míří na poledne dne akce (časy programu zatím nejsou potvrzené)
  zacatek: '2027-05-22T12:00:00+02:00',
  misto: 'Havlíčkovo náměstí',
  mesto: 'Havlíčkův Brod',
  skoly: ['Gymnázium Havlíčkův Brod', 'SPŠ stavební Havlíčkův Brod'],
  skolyKratce: 'Gymnázium HB × SPŠ stavební',
  spoluprace: 've spolupráci s městem Havlíčkův Brod',
};

// TODO: doplnit skutečný kontakt a sociální sítě (zatím placeholder – na webu se nezobrazí prázdné).
export const KONTAKT = {
  email: 'majales.ghb.spss@gmail.com', // shortcut: zatím Gmail, až bude schránka na majaleshb.cz, přepsat sem
  instagram: '', // např. 'https://www.instagram.com/majaleshb/'
  facebook: '',
};

export const PAS = ['kapely', 'DJ', 'sport', 'stánky', 'zóny škol', 'král a královna', 'celé náměstí'];

// Šest slotů na hlavní stage – jména zatím neznáme.
export const LINEUP = Array.from({ length: 6 }, (_, i) => ({
  cislo: String(i + 1).padStart(2, '0'),
  jmeno: '?',
}));

// Co tě čeká – pilíře programu (bez časů, ty ještě ladíme). `foto` = klíč z data/fotky.ts
export const PROGRAM = [
  {
    nazev: 'Kapely na hlavní stage',
    text: 'Odpoledne studentské a místní kapely, večer velká jména na pódiu uprostřed náměstí.',
    foto: 'stage',
  },
  {
    nazev: 'Běh a sport',
    text: 'Dopoledne patří pohybu: běh pro studenty i veřejnost. Formát ještě ladíme.',
    foto: 'run',
  },
  {
    nazev: 'Král a královna',
    text: 'Majálesová tradice: volba a korunovace krále a královny Majálesu.',
    foto: 'kral',
  },
  {
    nazev: 'Zóny obou škol',
    text: 'Gympl i stavebka mají na náměstí vlastní prostor. Soutěže, dílny a věci, které studenti postaví sami.',
    foto: 'zony',
  },
  {
    nazev: 'Stánky a jídlo',
    text: 'Food court, který připravují třídy obou škol.',
    foto: 'stanky',
  },
  {
    nazev: 'Pro děti a rodiny',
    text: 'Stanoviště, soutěže a hry. Majáles je pro celé město, nejen pro studenty.',
    foto: 'deti',
  },
];

// Průběh dne – jen orientačně, bez časů. `ikona` = ikona na časové ose (components/PrubehDne.astro): rano, slunce, mesic
export const DEN = [
  { kdy: 'Dopoledne', co: 'běh a sport', ikona: 'rano' },
  { kdy: 'Odpoledne', co: 'studentské kapely, zóny škol, král a královna', ikona: 'slunce' },
  { kdy: 'Večer', co: 'hlavní kapely na náměstí', ikona: 'mesic' },
];
