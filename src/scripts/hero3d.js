// PROTOTYP 3D hero: Majáles na Havlíčkově náměstí za soumraku.
// Všechno je procedurální low-poly geometrie (žádné modely, žádné AI obrázky).
// Výkon: statická geometrie je sloučená do dvou meshů, všechno ostatní jsou InstancedMesh / Points → ~20 draw calls.
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Fog,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const B = { modra: '#3044F3', pulnoc: '#0B0F4A', ruzova: '#FFC2E2', hot: '#FF4FA3', mlecna: '#FFE9F4', teplo: '#FFCB8A' };
const BPM = 120;
const TAU = Math.PI * 2;

// ---------- pomůcky ----------
function nahoda(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const C = (hex, k = 1) => new Color(hex).multiplyScalar(k);
const mix = (a, b, t) => new Color(a).lerp(new Color(b), t);
const _q = new Quaternion();
const _v = new Vector3();
const _s = new Vector3();
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);
function M(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(UP, ry), new Vector3(sx, sy, sz));
}

// Skládá statickou geometrii s barvou ve vrcholech do jednoho meshe.
class Stavba {
  constructor() {
    this.g = [];
    this.zaklad = new Matrix4();
  }
  // barva: Color, nebo funkce (těžiště trojúhelníku v lokálních souřadnicích) → Color
  pridej(geo, barva, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position;
    const n = pos.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) {
      let b = barva;
      if (typeof barva === 'function') {
        b = barva((pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3);
      }
      for (let k = 0; k < 3; k++) {
        c[(i + k) * 3] = b.r;
        c[(i + k) * 3 + 1] = b.g;
        c[(i + k) * 3 + 2] = b.b;
      }
    }
    g.setAttribute('color', new BufferAttribute(c, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    const zaklad = (this.rodic ?? this).zaklad; // svítící stavba sdílí umístění s osvětlenou
    g.applyMatrix4(m ? zaklad.clone().multiply(m) : zaklad);
    this.g.push(g);
  }
  kvadr(w, h, d, x, y, z, barva, ry = 0) {
    this.pridej(new BoxGeometry(w, h, d), barva, M(x, y, z, ry));
  }
  v(m, fn) {
    const puvodni = this.zaklad;
    this.zaklad = puvodni.clone().multiply(m);
    fn();
    this.zaklad = puvodni;
  }
  hotovo() {
    const g = mergeGeometries(this.g, false);
    this.g.forEach((x) => x.dispose());
    return g;
  }
}

function platno(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texturaKolecka() {
  const c = platno(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

function texturaDlazby(rnd) {
  const c = platno(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#8e93c9';
  x.fillRect(0, 0, 256, 256);
  const k = 16;
  for (let r = 0; r < 256 / k; r++) {
    for (let s = -1; s < 256 / k; s++) {
      const l = 74 + rnd() * 22;
      x.fillStyle = `hsl(${232 + rnd() * 14} 26% ${l}%)`;
      const ox = s * k + (r % 2 ? k / 2 : 0);
      x.beginPath();
      x.roundRect(ox + 1.2, r * k + 1.2, k - 2.4, k - 2.4, 3.5);
      x.fill();
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(110, 110);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// ---------- LED stěna ----------
function pasuj(x, text, font, maxW, maxH) {
  let v = maxH;
  x.font = `${font.replace('%', v)}`;
  const w = x.measureText(text).width;
  if (w > maxW) v = Math.floor((v * maxW) / w);
  x.font = `${font.replace('%', v)}`;
  return v;
}
const ANTON = '400 %px Anton, Impact, sans-serif';
const GROTESK = '700 %px "Space Grotesk", system-ui, sans-serif';

// rozdělí slova na dva co nejvyrovnanější řádky
function dveRadky(slova) {
  if (slova.length < 2) return slova;
  const celkem = slova.join(' ').length;
  let nej = 1;
  let rozdil = Infinity;
  for (let i = 1; i < slova.length; i++) {
    const a = slova.slice(0, i).join(' ').length;
    const d = Math.abs(celkem - 1 - 2 * a);
    if (d < rozdil) {
      rozdil = d;
      nej = i;
    }
  }
  return [slova.slice(0, nej).join(' '), slova.slice(nej).join(' ')];
}

function kresliSnimek(x, W, H, s, obrazky) {
  const naVysku = H > W;
  x.save();
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const u = Math.min(W, H) / 100;
  if (s.typ === 'majales') {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#3044F3');
    g.addColorStop(1, '#1a2296');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = B.ruzova;
    if (naVysku) {
      pasuj(x, s.datum.trim(), ANTON, W * 0.8, H * 0.2);
      x.fillText(s.datum.trim(), W / 2, H * 0.36);
      x.fillStyle = B.mlecna;
      pasuj(x, String(s.rok), ANTON, W * 0.8, H * 0.2);
      x.fillText(String(s.rok), W / 2, H * 0.6);
    } else {
      const v = pasuj(x, `MAJÁLES ${s.rok}`, ANTON, W * 0.88, H * 0.36);
      x.fillText(`MAJÁLES ${s.rok}`, W / 2, H * 0.27); // obsah drží nahoře, spodek stěny zakrývá kapela
      x.fillStyle = B.mlecna;
      const pod = `${s.datum.trim()} · ${s.misto}`.toUpperCase();
      pasuj(x, pod, GROTESK, W * 0.86, v * 0.3);
      x.fillText(pod, W / 2, H * 0.27 + v * 0.8);
    }
  } else if (s.typ === 'partner') {
    const img = s.logo && obrazky.get(s.logo);
    x.fillStyle = B.mlecna;
    x.fillRect(0, 0, W, H);
    x.fillStyle = B.modra;
    pasuj(x, s.uroven.toUpperCase(), GROTESK, W * 0.8, u * 7);
    x.fillText(s.uroven.toUpperCase(), W / 2, H * (naVysku ? 0.1 : 0.09));
    const bw = W * 0.8;
    const bh = H * (naVysku ? 0.5 : 0.4);
    const cy = H * (naVysku ? 0.56 : 0.36);
    if (img) {
      const pomer = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : s.pomer || 2;
      let w = bw;
      let h = w / pomer;
      if (h > bh) {
        h = bh;
        w = h * pomer;
      }
      x.drawImage(img, W / 2 - w / 2, cy - h / 2, w, h);
    } else {
      x.fillStyle = B.pulnoc;
      const slova = s.nazev.toUpperCase().split(/\s+/);
      const radky = naVysku ? slova : s.nazev.length > 14 ? dveRadky(slova) : [slova.join(' ')];
      const vr = Math.min(bh / radky.length, u * 34);
      radky.forEach((r, i) => {
        pasuj(x, r, ANTON, bw, vr * 0.9);
        x.fillText(r, W / 2, cy + (i - (radky.length - 1) / 2) * vr);
      });
    }
  } else {
    x.fillStyle = B.pulnoc;
    x.fillRect(0, 0, W, H);
    x.strokeStyle = B.ruzova;
    x.lineWidth = u * 1.6;
    x.setLineDash([u * 6, u * 4]);
    x.strokeRect(u * 6, u * 6, W - u * 12, H - u * 12);
    x.fillStyle = B.ruzova;
    const slova = s.nadpis.toUpperCase().split(/\s+/);
    const radky = naVysku ? slova : [slova.join(' ')];
    const vr = naVysku ? H * 0.17 : H * 0.34;
    const cy = naVysku ? H * 0.4 : H * 0.27;
    let v = vr;
    radky.forEach((r, i) => {
      v = pasuj(x, r, ANTON, W * 0.76, vr * 0.92);
      x.fillText(r, W / 2, cy + (i - (radky.length - 1) / 2) * vr);
    });
    x.fillStyle = B.mlecna;
    if (naVysku) {
      const sl = s.text.split(/\s+|(?<=\/)/);
      sl.forEach((r, i) => {
        pasuj(x, r, GROTESK, W * 0.74, u * 13);
        x.fillText(r, W / 2, H * 0.7 + i * u * 16);
      });
    } else {
      pasuj(x, s.text, GROTESK, W * 0.74, H * 0.1);
      x.fillText(s.text, W / 2, cy + vr * 0.5 + H * 0.06);
    }
  }
  x.restore();
}

// ---------- náměstí ----------
function stit(w, h, gh, typ) {
  const s = new Shape();
  const a = w / 2;
  s.moveTo(-a, 0);
  s.lineTo(a, 0);
  s.lineTo(a, h);
  if (typ === 0) {
    s.lineTo(0, h + gh);
  } else if (typ === 1) {
    s.lineTo(a * 0.74, h);
    s.lineTo(a * 0.74, h + gh * 0.36);
    s.lineTo(a * 0.46, h + gh * 0.36);
    s.lineTo(a * 0.46, h + gh * 0.7);
    s.lineTo(a * 0.2, h + gh * 0.7);
    s.lineTo(a * 0.2, h + gh);
    s.lineTo(-a * 0.2, h + gh);
    s.lineTo(-a * 0.2, h + gh * 0.7);
    s.lineTo(-a * 0.46, h + gh * 0.7);
    s.lineTo(-a * 0.46, h + gh * 0.36);
    s.lineTo(-a * 0.74, h + gh * 0.36);
    s.lineTo(-a * 0.74, h);
  } else if (typ === 2) {
    s.lineTo(a * 0.92, h);
    s.quadraticCurveTo(a * 0.9, h + gh * 0.5, a * 0.5, h + gh * 0.52);
    s.lineTo(a * 0.5, h + gh * 0.7);
    s.quadraticCurveTo(a * 0.45, h + gh, 0, h + gh);
    s.quadraticCurveTo(-a * 0.45, h + gh, -a * 0.5, h + gh * 0.7);
    s.lineTo(-a * 0.5, h + gh * 0.52);
    s.quadraticCurveTo(-a * 0.9, h + gh * 0.5, -a * 0.92, h);
  } else {
    s.lineTo(a, h + gh * 0.3);
    s.lineTo(a * 0.5, h + gh * 0.3);
    s.lineTo(0, h + gh * 0.75);
    s.lineTo(-a * 0.5, h + gh * 0.3);
    s.lineTo(-a, h + gh * 0.3);
  }
  s.lineTo(-a, h);
  s.closePath();
  return s;
}
const FASADY = ['#F3E3A8', '#F6B8C8', '#BFE0C2', '#F0C9A0', '#CFD8F7', '#F4EFE6', '#E8D38A', '#F2A9C4', '#D9C7F2'];
const OKNA = ['#FFD08A', '#FFC2E2', '#FFE2B0', '#FFD08A'];

function dum(st, sv, rnd, w, opts = {}) {
  const h = opts.h ?? 5.6 + rnd() * 2.6;
  const gh = opts.gh ?? 2 + rnd() * 1.6;
  const typ = opts.typ ?? Math.floor(rnd() * 4);
  const barva = mix(FASADY[Math.floor(rnd() * FASADY.length)], B.modra, 0.3);
  const strecha = mix('#7a3b4e', B.pulnoc, 0.45);
  const hl = 6;
  const g = new ExtrudeGeometry(stit(w - 0.08, h, gh, typ), { depth: 0.5, bevelEnabled: false, curveSegments: 5 });
  st.pridej(g, barva, M(0, 0, -0.5));
  st.kvadr(w - 0.08, h, hl, 0, h / 2, -0.5 - hl / 2, barva.clone().multiplyScalar(0.8));
  // sedlová střecha s hřebenem podél fasády
  const tr = new Shape();
  tr.moveTo(0, 0);
  tr.lineTo(hl, 0);
  tr.lineTo(hl / 2, gh * 0.8);
  tr.closePath();
  st.pridej(new ExtrudeGeometry(tr, { depth: w - 0.08, bevelEnabled: false }), strecha, M(-(w - 0.08) / 2, h, -0.5, Math.PI / 2));
  st.kvadr(w + 0.06, 0.16, 0.2, 0, h, 0.02, mix(B.mlecna, B.modra, 0.25));
  // okna
  const pater = Math.max(2, Math.round(h / 2.7));
  const sloupcu = Math.max(2, Math.floor(w / 1.55));
  for (let p = 0; p < pater; p++) {
    const y = 1.5 + (p * (h - 1.6)) / pater;
    for (let s = 0; s < sloupcu; s++) {
      const x = ((s + 0.5) / sloupcu - 0.5) * (w - 0.9);
      if (p === 0 && rnd() < 0.55) {
        if (s === 0) sv.pridej(new PlaneGeometry(w - 1.3, 1.5), C(B.teplo, 0.55 + rnd() * 0.3), M(0, 1.15, 0.03));
        continue;
      }
      const sviti = rnd() < 0.5;
      sv.pridej(new PlaneGeometry(0.52, 0.86), sviti ? C(OKNA[Math.floor(rnd() * OKNA.length)], 0.75 + rnd() * 0.25) : C('#1b2176'), M(x, y, 0.03));
    }
  }
  if (typ !== 3) sv.pridej(new PlaneGeometry(0.46, 0.7), rnd() < 0.4 ? C(B.teplo, 0.8) : C('#1b2176'), M(0, h + gh * 0.32, 0.03));
}

function rada(st, sv, rnd, x0, z0, dx, dz, ry, delka) {
  let u = 0;
  while (u < delka) {
    const w = 4.3 + rnd() * 2.4;
    st.v(M(x0 + dx * (u + w / 2), 0, z0 + dz * (u + w / 2), ry), () => dum(st, sv, rnd, w));
    u += w;
  }
}

function radnice(st, sv) {
  const kr = mix('#F3E3A8', B.modra, 0.14);
  const tm = mix('#3a3566', B.pulnoc, 0.3);
  const w = 21;
  const h = 8;
  st.kvadr(w, h, 6, 0, h / 2, -3, kr);
  // cimbuří
  for (let x = -w / 2 + 0.4; x <= w / 2 - 0.3; x += 1.05) {
    if (Math.abs(x) < 4.2) continue;
    st.kvadr(0.6, 0.55, 0.4, x, h + 0.27, -0.2, kr);
  }
  // střední štít s hodinami
  st.pridej(new ExtrudeGeometry(stit(8.2, h, 5, 1), { depth: 0.7, bevelEnabled: false }), kr.clone().multiplyScalar(1.06), M(0, 0, -0.35));
  for (const [x, y] of [[-3.6, h], [3.6, h], [-2.45, h + 1.8], [2.45, h + 1.8], [-1.35, h + 3.5], [1.35, h + 3.5]]) {
    st.pridej(new ConeGeometry(0.2, 1.1, 4), kr, M(x, y + 0.55, 0));
  }
  st.kvadr(w + 0.2, 0.22, 0.3, 0, h, 0.05, mix(B.mlecna, B.modra, 0.2));
  st.kvadr(w + 0.2, 0.22, 0.3, 0, 3.4, 0.05, mix(B.mlecna, B.modra, 0.2));
  sv.pridej(new CircleGeometry(1.08, 24), C(B.pulnoc), M(0, h + 2.55, 0.37));
  sv.pridej(new CircleGeometry(0.9, 24), C(B.mlecna, 0.95), M(0, h + 2.55, 0.39));
  sv.pridej(new PlaneGeometry(0.1, 0.72), C(B.pulnoc), new Matrix4().makeTranslation(0.13, h + 2.82, 0.41).multiply(new Matrix4().makeRotationZ(-0.45)));
  sv.pridej(new PlaneGeometry(0.13, 0.48), C(B.pulnoc), new Matrix4().makeTranslation(-0.2, h + 2.62, 0.41).multiply(new Matrix4().makeRotationZ(1.25)));
  // okna
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < 12; i++) {
      const x = -w / 2 + 1.2 + (i * (w - 2.4)) / 11;
      sv.pridej(new PlaneGeometry(0.62, p ? 1.5 : 1.2), (i * 7 + p * 3) % 5 < 2 ? C(B.teplo, 0.85) : C('#1b2176'), M(x, p ? 5.5 : 1.7, 0.42 * (Math.abs(x) < 4.1 ? 1 : 0.1)));
    }
  }
  // věž
  const v = 6.4;
  st.kvadr(3.6, v, 3.6, 0, h + v / 2, -3.4, tm);
  st.kvadr(4.2, 0.3, 4.2, 0, h + v + 0.1, -3.4, kr);
  st.kvadr(2.9, 2.4, 2.9, 0, h + v + 1.4, -3.4, tm);
  for (const x of [-0.6, 0.6]) sv.pridej(new PlaneGeometry(0.5, 1.3), C(B.teplo, 0.7), M(x, h + v + 1.4, -1.93));
  st.pridej(new ConeGeometry(2.7, 4, 4), tm.clone().multiplyScalar(0.8), M(0, h + v + 4.6, -3.4, Math.PI / 4));
  st.pridej(new ConeGeometry(0.16, 2, 6), kr, M(0, h + v + 7.2, -3.4));
}

function stanek(st, sv, rnd, typ, barvy) {
  const [a, b] = barvy;
  const drevo = C('#8a5f48');
  for (const [x, z] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) st.kvadr(0.12, 2.3, 0.12, x, 1.15, z, drevo);
  st.kvadr(3, 1, 0.14, 0, 0.5, 1.25, b);
  st.kvadr(0.14, 1, 2.4, -1.45, 0.5, 0, b);
  st.kvadr(0.14, 1, 2.4, 1.45, 0.5, 0, b);
  st.kvadr(3.1, 0.08, 0.5, 0, 1.04, 1.25, drevo);
  st.kvadr(2.9, 2.2, 0.08, 0, 1.1, -1.25, a.clone().multiplyScalar(0.7));
  sv.pridej(new PlaneGeometry(2.6, 1.1), C(B.teplo, 0.5), M(0, 1.7, -1.2));
  if (typ === 0) {
    const g = new ConeGeometry(2.45, 1.5, 8, 1);
    st.pridej(g, (x, y, z) => (Math.floor(((Math.atan2(z, x) + TAU) % TAU) / (TAU / 8)) % 2 ? a : b), M(0, 3.05, 0, Math.PI / 8));
    st.pridej(new CylinderGeometry(2.45, 2.45, 0.34, 8, 1, true), (x, y, z) => (Math.floor(((Math.atan2(z, x) + TAU) % TAU) / (TAU / 8)) % 2 ? b : a), M(0, 2.16, 0, Math.PI / 8));
  } else {
    const tr = new Shape();
    tr.moveTo(-1.75, 0);
    tr.lineTo(1.75, 0);
    tr.lineTo(0, 1.25);
    tr.closePath();
    const pruh = (x) => (Math.floor((x + 10) / 0.45) % 2 ? a : b);
    // hřeben podél pultu: profil v rovině z–y, vytažený podél x
    st.pridej(new ExtrudeGeometry(tr, { depth: 3.4, bevelEnabled: false }), (x, y, z) => pruh(z), M(-1.7, 2.3, 0, Math.PI / 2));
    st.kvadr(3.4, 0.3, 0.06, 0, 2.18, 1.75, a);
    st.kvadr(3.4, 0.3, 0.06, 0, 2.18, -1.75, a);
  }
}

// ---------- hlavní ----------
export async function init(root) {
  const canvas = root.querySelector('.hero3d-platno');
  const tlacitko = root.querySelector('.hero3d-pauza');
  if (!canvas) return false;
  const klid = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maly = Math.min(innerWidth, innerHeight) < 720;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maly ? 1.5 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;

  // písma pro kreslení na plátno LED stěny (Anton je dělený podle unicode-range, proto i znaky s háčky)
  const snimky = JSON.parse(root.dataset.snimky || '[]');
  const vsechenText = 'MAJÁLES 0123456789 . · / ' + snimky.map((s) => Object.values(s).join(' ')).join(' ');
  try {
    await Promise.all([
      document.fonts.load('400 64px Anton', vsechenText.toUpperCase()),
      document.fonts.load('700 32px "Space Grotesk"', vsechenText + vsechenText.toUpperCase()),
    ]);
    await document.fonts.ready;
  } catch {
    /* nevadí, nakreslí se náhradním písmem */
  }
  const obrazky = new Map();
  await Promise.all(
    snimky
      .filter((s) => s.logo)
      .map(
        (s) =>
          new Promise((res) => {
            const img = new Image();
            img.onload = () => {
              // SVG bez rozměrů některé prohlížeče na canvas nenakreslí → radši text
              if (img.naturalWidth > 0) obrazky.set(s.logo, img);
              res();
            };
            img.onerror = () => res();
            img.src = s.logo;
          }),
      ),
  );

  const rnd = nahoda(2027);
  const scene = new Scene();
  const MLHA = new Color('#171d86');
  scene.fog = new Fog(MLHA, 30, 130);
  const camera = new PerspectiveCamera(32, 1, 0.5, 600);

  // ----- obloha -----
  {
    const g = new SphereGeometry(300, 24, 16);
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const zastavky = [
      [-0.2, C('#3a3ae0')],
      [0.0, C('#4a4cf0')],
      [0.07, C(B.modra)],
      [0.3, C('#161c84')],
      [0.7, C(B.pulnoc)],
      [1.01, C('#070a38')],
    ];
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) / 300;
      let k = 0;
      while (k < zastavky.length - 2 && h > zastavky[k + 1][0]) k++;
      const [h0, c0] = zastavky[k];
      const [h1, c1] = zastavky[k + 1];
      const b = c0.clone().lerp(c1, MathUtils.clamp((h - h0) / (h1 - h0), 0, 1));
      c[i * 3] = b.r;
      c[i * 3 + 1] = b.g;
      c[i * 3 + 2] = b.b;
    }
    g.setAttribute('color', new BufferAttribute(c, 3));
    const m = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -10;
    m.frustumCulled = false;
    scene.add(m);

    const n = 220;
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const e = 0.22 + rnd() * 1.2;
      sp[i * 3] = Math.cos(a) * Math.cos(e) * 280;
      sp[i * 3 + 1] = Math.sin(e) * 280;
      sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 280;
    }
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(sp, 3));
    const hv = new Points(sg, new PointsMaterial({ color: C(B.mlecna), size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7, depthWrite: false }));
    hv.frustumCulled = false;
    scene.add(hv);
  }

  // ----- světla -----
  scene.add(new HemisphereLight(new Color('#6f7fff'), new Color('#10155e'), 1.75));
  const zapad = new DirectionalLight(new Color('#ff9fd0'), 0.5);
  zapad.position.set(-14, 9, -24);
  scene.add(zapad);
  const predni = new DirectionalLight(new Color('#8fa0ff'), 0.55);
  predni.position.set(8, 12, 30);
  scene.add(predni);
  const washA = new PointLight(new Color(B.hot), 200, 30, 1.8);
  washA.position.set(-3.4, 5, 2.4);
  const washB = new PointLight(new Color('#5a6cff'), 200, 30, 1.8);
  washB.position.set(3.4, 5, 2.4);
  const uvnitr = new PointLight(new Color(B.ruzova), 90, 16, 1.6);
  uvnitr.position.set(0, 4.6, -2.6);
  const strobo = new PointLight(new Color(B.mlecna), 0, 46, 1.4);
  strobo.position.set(0, 6, 4);
  const teploL = new PointLight(new Color('#ffb36b'), 110, 20, 1.7);
  teploL.position.set(-13, 3, 10);
  const teploP = new PointLight(new Color('#ffb36b'), 110, 20, 1.7);
  teploP.position.set(13, 3, 10);
  scene.add(washA, washB, uvnitr, strobo, teploL, teploP);

  // ----- dlažba -----
  const texKolecko = texturaKolecka();
  {
    const zem = new Mesh(new PlaneGeometry(440, 440), new MeshLambertMaterial({ map: texturaDlazby(rnd), color: C('#565cb0') }));
    zem.material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    zem.rotation.x = -Math.PI / 2;
    scene.add(zem);
  }

  // ----- statická scéna -----
  const st = new Stavba(); // osvětlená
  const sv = new Stavba(); // svítící (okna, hodiny)
  sv.rodic = st;
  const zarovky = []; // [x,y,z, barva]
  const kola = []; // světelná kolečka: {p, s, c, k:'z'(zem)|'b'(billboard), f?}

  // domy: zadní řada vedle radnice a obě boční řady
  const ZZ = -13.5;
  st.v(M(0, 0, ZZ), () => radnice(st, sv));
  rada(st, sv, rnd, -10.6, ZZ, -1, 0, 0, 44);
  rada(st, sv, rnd, 10.6, ZZ, 1, 0, 0, 44);
  rada(st, sv, rnd, -31, ZZ + 3, 0, 1, Math.PI / 2, 70);
  rada(st, sv, rnd, 31, ZZ + 3, 0, 1, -Math.PI / 2, 70);

  // pódium
  const drevo = C('#9a6a4c');
  const drevoT = C('#5b3c33');
  const bila = mix(B.mlecna, '#ffffff', 0.4);
  const cerna = C('#0c0e2e');
  const PY = 1.25; // výška podlahy pódia
  st.kvadr(12.6, PY, 6.6, 0, PY / 2, -3, drevoT);
  st.kvadr(12.8, 0.14, 6.8, 0, PY, -3, drevo);
  for (const x of [-6.25, 6.25]) for (const z of [-0.2, -5.9]) st.kvadr(0.4, 6.7, 0.4, x, 3.35 + 0.6, z, drevo);
  // plochá dřevěná střecha, vpředu lehce zvednutá
  {
    const m = new Matrix4().makeTranslation(0, 7.85, -2.3).multiply(new Matrix4().makeRotationX(0.07));
    st.pridej(new BoxGeometry(16.4, 0.32, 10.4), drevo, m);
    for (let x = -7; x <= 7; x += 2) st.pridej(new BoxGeometry(0.22, 0.34, 10.2), drevoT, m.clone().multiply(new Matrix4().makeTranslation(x, -0.3, 0)));
  }
  // bílé zadní a boční plachty
  st.kvadr(12.5, 6, 0.12, 0, PY + 3, -6.05, bila);
  st.kvadr(0.12, 6, 3.6, -6.25, PY + 3, -4.2, bila);
  st.kvadr(0.12, 6, 3.6, 6.25, PY + 3, -4.2, bila);
  // rám LED stěny
  st.kvadr(10, 4.9, 0.2, 0, PY + 2.6, -5.9, cerna);
  // truss + světla
  const FIX = [];
  for (const [y, z] of [[7.1, 1.3]]) {
    st.kvadr(12.4, 0.12, 0.12, 0, y, z, C('#9aa0c8'));
    st.kvadr(12.4, 0.12, 0.12, 0, y + 0.32, z, C('#9aa0c8'));
    for (let x = -6; x <= 6; x += 0.8) st.kvadr(0.06, 0.34, 0.06, x, y + 0.16, z, C('#9aa0c8'));
  }
  for (let i = 0; i < 6; i++) {
    const x = -5 + i * 2;
    st.kvadr(0.36, 0.42, 0.36, x, 6.82, 1.3, cerna);
    FIX.push(new Vector3(x, 6.65, 1.34));
  }
  // reproduktory
  for (const x of [-5.45, 5.45]) {
    st.kvadr(1.2, 2.5, 1.0, x, PY + 1.32, -0.75, cerna);
    for (const y of [0.7, 1.9]) sv.pridej(new CircleGeometry(0.4, 12), C('#23286e'), M(x, PY + y, -0.24));
  }
  for (const x of [-7.6, 7.6]) st.kvadr(1.5, 1.3, 1.3, x, 0.65, 0.4, cerna);
  // bicí, klávesy, stojan na mikrofon, odposlechy
  const RISER = 0.3;
  st.kvadr(3.2, RISER, 2.4, 0, PY + RISER / 2 + 0.07, -4.2, cerna);
  st.v(M(0, (PY + RISER + 0.07) * -0.3, -4.2 * -0.3, 0, 1.3, 1.3, 1.3), () => {
    const y0 = PY + RISER + 0.07;
    const buben = (r, h, x, y, z, b) => st.pridej(new CylinderGeometry(r, r, h, 12), b, M(x, y0 + y, z));
    st.pridej(new CylinderGeometry(0.42, 0.42, 0.5, 14), C(B.hot, 0.9), new Matrix4().makeTranslation(0, y0 + 0.44, -3.55).multiply(new Matrix4().makeRotationX(Math.PI / 2)));
    sv.pridej(new CircleGeometry(0.36, 14), C(B.mlecna, 0.85), M(0, y0 + 0.44, -3.29));
    buben(0.24, 0.2, -0.55, 0.78, -3.7, C(B.mlecna));
    buben(0.2, 0.2, -0.22, 1.02, -3.5, C(B.hot, 0.9));
    buben(0.22, 0.22, 0.25, 1.02, -3.5, C(B.hot, 0.9));
    buben(0.3, 0.34, 0.75, 0.62, -3.85, C(B.hot, 0.9));
    buben(0.3, 0.025, -0.95, 1.12, -3.75, C('#e7c878'));
    buben(0.34, 0.025, 0.95, 1.32, -3.85, C('#e7c878'));
    buben(0.3, 0.025, -0.75, 1.42, -4.3, C('#e7c878'));
    for (const [x, h, z] of [[-0.95, 1.12, -3.75], [0.95, 1.32, -3.85], [-0.75, 1.42, -4.3]]) st.kvadr(0.03, h, 0.03, x, y0 + h / 2, z, C('#9aa0c8'));
  });
  st.kvadr(2.1, 0.14, 0.7, 4.05, PY + 1.36, -3.45, cerna, -0.35);
  st.kvadr(1.9, 1.25, 0.08, 4.05, PY + 0.7, -3.45, C(B.modra, 0.8), -0.35);
  st.kvadr(0.05, 1.95, 0.05, 0.3, PY + 1.0, -0.72, C('#9aa0c8'));
  st.kvadr(0.5, 0.04, 0.5, 0.3, PY + 0.09, -0.72, cerna);
  for (const x of [-2.6, -0.8, 1.4, 3.2]) st.kvadr(0.8, 0.34, 0.5, x, PY + 0.24, -0.5, cerna);
  // schůdky
  for (let i = 0; i < 4; i++) st.kvadr(1.4, 0.3, 0.4, -7.2, 0.15 + i * 0.3, -1.4 - i * 0.4, drevoT);

  // stánky po stranách
  const BARVY_STANKU = [
    [C(B.hot), C(B.mlecna)],
    [C(B.modra), C(B.mlecna)],
    [C(B.ruzova), C(B.modra)],
    [C(B.ruzova), C(B.mlecna)],
  ];
  const mistaStanku = [];
  for (const strana of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = strana * (14.6 + (i % 2) * 0.8 + i * 0.5);
      const z = 1.5 + i * 5.2;
      mistaStanku.push([x, z, (-strana * Math.PI) / 2 + strana * 0.12 * (i - 2), (i + (strana > 0 ? 1 : 0)) % 2, i + (strana > 0 ? 2 : 0)]);
    }
  }
  mistaStanku.push([-11.5, -7.5, 0.5, 0, 1], [11.5, -7.5, -0.5, 0, 0], [-19.5, -8.2, 0.25, 1, 3], [19.5, -8.2, -0.25, 1, 2]);
  const stiny = [];
  for (const [x, z, ry, typ, bi] of mistaStanku) {
    st.v(M(x, 0, z, ry), () => stanek(st, sv, rnd, typ, BARVY_STANKU[bi % BARVY_STANKU.length]));
    kola.push({ p: new Vector3(x + Math.sin(ry) * 2.4, 0.05, z + Math.cos(ry) * 2.4), s: 8, c: C('#ffb36b', 0.34), k: 'z' });
    stiny.push([x, z, 5.5, 0.5]);
    // žárovky po obvodu stříšky
    for (let k = 0; k < 7; k++) {
      const lx = -1.5 + k * 0.5;
      zarovky.push([x + Math.cos(ry) * lx + Math.sin(ry) * 1.75, 2.12, z - Math.sin(ry) * lx + Math.cos(ry) * 1.75]);
    }
  }
  // světelné řetězy od střechy pódia ke sloupům u stánků a mezi sloupy
  const sloupy = [
    [-13, 4.6, 5],
    [-14.5, 4.6, 15.5],
    [-12.5, 4.6, 26],
    [13, 4.6, 5],
    [14.5, 4.6, 15.5],
    [12.5, 4.6, 26],
  ];
  for (const [x, y, z] of sloupy) st.kvadr(0.14, y, 0.14, x, y / 2, z, drevoT);
  const retez = (a, b, pruhyb, n) => {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      zarovky.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * pruhyb, a[2] + (b[2] - a[2]) * t]);
    }
  };
  retez([-8.1, 8.0, 2.7], sloupy[0], 0.8, 10);
  retez([8.1, 8.0, 2.7], sloupy[3], 0.8, 10);
  retez(sloupy[0], sloupy[1], 0.8, 14);
  retez(sloupy[1], sloupy[2], 0.8, 14);
  retez(sloupy[3], sloupy[4], 0.8, 14);
  retez(sloupy[4], sloupy[5], 0.8, 14);
  retez(sloupy[2], sloupy[5], 1.6, 30);

  // morový sloup, kašna, stromy, lampy
  {
    const kamen = mix('#d9cbb8', B.modra, 0.25);
    st.v(M(-10.5, 0, 24.5), () => {
      st.pridej(new CylinderGeometry(2.2, 2.5, 0.5, 8), kamen, M(0, 0.25, 0));
      st.kvadr(1.5, 1.6, 1.5, 0, 1.3, 0, kamen);
      st.kvadr(1.9, 0.2, 1.9, 0, 2.2, 0, kamen);
      st.pridej(new CylinderGeometry(0.26, 0.34, 6.4, 8), kamen, M(0, 5.5, 0));
      st.kvadr(0.8, 0.3, 0.8, 0, 8.8, 0, kamen);
      st.pridej(new ConeGeometry(0.34, 1.3, 6), kamen, M(0, 9.6, 0));
      st.pridej(new IcosahedronGeometry(0.22, 0), C('#e7c878'), M(0, 10.4, 0));
      for (const a of [0, 1, 2, 3]) st.pridej(new ConeGeometry(0.26, 1.1, 5), kamen, M(Math.cos(a * 1.57 + 0.78) * 1.45, 1.05, Math.sin(a * 1.57 + 0.78) * 1.45));
    });
    stiny.push([-10.5, 24.5, 7, 0.45]);
    st.v(M(11.5, 0, 25.5), () => {
      st.pridej(new CylinderGeometry(2.3, 2.5, 0.7, 10), kamen, M(0, 0.35, 0));
      sv.pridej(new CircleGeometry(2.0, 10), C('#3a50ff', 0.8), new Matrix4().makeTranslation(0, 0.72, 0).multiply(new Matrix4().makeRotationX(-Math.PI / 2)));
      st.pridej(new CylinderGeometry(0.3, 0.45, 1.8, 8), kamen, M(0, 1.2, 0));
      st.pridej(new ConeGeometry(0.4, 1.2, 6), kamen, M(0, 2.6, 0));
    });
    stiny.push([11.5, 25.5, 7, 0.4]);
    const zelen = mix('#1f6a5e', B.pulnoc, 0.35);
    for (const [x, z, s] of [[-22, 4, 1], [22, 9, 1.1], [-23, 20, 1.15], [23, 24, 0.95], [-21.5, 34, 1], [21.5, 37, 1.1], [-25, -9, 0.9], [25, -9, 0.9]]) {
      st.pridej(new CylinderGeometry(0.13, 0.17, 2.2, 5), drevoT, M(x, 1.1, z));
      st.pridej(new IcosahedronGeometry(1.35 * s, 0), zelen, M(x, 3.1, z, rnd() * 3, 1, 1.25, 1));
      stiny.push([x, z, 4, 0.4]);
    }
    for (const [x, z] of [[-24.5, 12], [24.5, 16], [-24.5, 28], [24.5, 31]]) {
      st.kvadr(0.12, 4.2, 0.12, x, 2.1, z, cerna);
      sv.pridej(new IcosahedronGeometry(0.26, 0), C(B.mlecna), M(x, 4.35, z));
      kola.push({ p: new Vector3(x, 0.05, z), s: 9, c: C('#ffd9b0', 0.2), k: 'z' });
      kola.push({ p: new Vector3(x, 4.35, z), s: 2.2, c: C('#ffe2c0', 0.5), k: 'b' });
    }
  }

  // rámy bočních bannerů (obrazovky u křídel pódia)
  for (const s of [-1, 1]) {
    st.v(M(s * 9.9, 0, 1.2, s * -0.2), () => {
      st.kvadr(2.1, 4.7, 0.12, 0, 3.95, -0.08, cerna);
      st.kvadr(0.12, 1.7, 0.12, -0.8, 0.85, -0.08, cerna);
      st.kvadr(0.12, 1.7, 0.12, 0.8, 0.85, -0.08, cerna);
    });
  }
  // reflektory do nebe stojí na zemi vedle pódia
  const NEBE = [new Vector3(-10.4, 0.6, -2.2), new Vector3(-8.8, 0.6, -3.4), new Vector3(8.8, 0.6, -3.4), new Vector3(10.4, 0.6, -2.2)];
  for (const p of NEBE) st.kvadr(0.5, 0.6, 0.5, p.x, 0.3, p.z, cerna);

  const statika = new Mesh(st.hotovo(), new MeshLambertMaterial({ vertexColors: true }));
  const svitici = new Mesh(sv.hotovo(), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false }));
  scene.add(statika, svitici);

  // ----- LED stěna + boční bannery -----
  const pl1 = platno(1024, 480);
  const pl2 = platno(256, 608);
  const texLed = new CanvasTexture(pl1);
  const texBok = new CanvasTexture(pl2);
  for (const t of [texLed, texBok]) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
  }
  const led = new Mesh(new PlaneGeometry(9.6, 4.5), new MeshBasicMaterial({ map: texLed, toneMapped: false }));
  led.position.set(0, PY + 2.6, -5.7);
  scene.add(led);
  {
    // oba boční bannery jako jeden mesh (jedna textura, jeden draw call)
    const g = mergeGeometries([
      new PlaneGeometry(1.9, 4.5).applyMatrix4(M(-9.9, 3.95, 1.2, 0.2)),
      new PlaneGeometry(1.9, 4.5).applyMatrix4(M(9.9, 3.95, 1.2, -0.2)),
    ]);
    scene.add(new Mesh(g, new MeshBasicMaterial({ map: texBok, toneMapped: false, side: DoubleSide })));
  }
  let snimekTed = -1;
  function ukazSnimek(i) {
    if (i === snimekTed || !snimky.length) return;
    snimekTed = i;
    const s = snimky[i % snimky.length];
    kresliSnimek(pl1.getContext('2d'), pl1.width, pl1.height, s, obrazky);
    kresliSnimek(pl2.getContext('2d'), pl2.width, pl2.height, s, obrazky);
    texLed.needsUpdate = true;
    texBok.needsUpdate = true;
  }
  ukazSnimek(0);

  // ----- nápis MAJÁLES z „balónků" nad střechou -----
  const NAPIS = 'MAJÁLES';
  const napis = (() => {
    const bw = 100;
    const c = platno(bw * NAPIS.length, 208);
    const x = c.getContext('2d');
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.font = '400 150px Anton, Impact, sans-serif';
    x.lineJoin = 'round';
    [...NAPIS].forEach((ch, i) => {
      const cx = bw * i + bw / 2;
      const g = x.createLinearGradient(0, 40, 0, 200);
      g.addColorStop(0, '#FFE9F4');
      g.addColorStop(0.45, '#FFC2E2');
      g.addColorStop(1, '#FF4FA3');
      x.strokeStyle = '#FF4FA3';
      x.lineWidth = 10;
      x.strokeText(ch, cx, 192);
      x.fillStyle = g;
      x.fillText(ch, cx, 192);
    });
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    const n = NAPIS.length;
    const g = new BufferGeometry();
    const pos = new Float32Array(n * 12);
    const uv = new Float32Array(n * 8);
    const idx = [];
    for (let i = 0; i < n; i++) {
      uv.set([i / n, 0, (i + 1) / n, 0, (i + 1) / n, 1, i / n, 1], i * 8);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    }
    g.setAttribute('position', new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage));
    g.setAttribute('uv', new BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new Mesh(g, new MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.35, side: DoubleSide, toneMapped: false }));
    m.frustumCulled = false;
    scene.add(m);
    return { pos, g };
  })();
  function hybejNapisem(t) {
    const n = NAPIS.length;
    const w = 1.1;
    const h = (w * 208) / 100;
    for (let i = 0; i < n; i++) {
      const cx = (i - (n - 1) / 2) * 1.16;
      const cy = 9.4 + Math.sin(t * 1.1 + i * 1.7) * 0.09;
      const a = Math.sin(t * 0.8 + i * 2.3) * 0.07;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const r = [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ];
      r.forEach(([x, y], k) => {
        napis.pos[i * 12 + k * 3] = cx + x * ca - y * sa;
        napis.pos[i * 12 + k * 3 + 1] = cy + x * sa + y * ca;
        napis.pos[i * 12 + k * 3 + 2] = 2.9;
      });
    }
    napis.g.attributes.position.needsUpdate = true;
  }

  // ----- kapela -----
  const dily = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), 64);
  const K = 1.3; // kapela je schválně větší než publikum, ať je z dálky čitelná
  const hlavy = new InstancedMesh(new IcosahedronGeometry(0.17 * K, 1), new MeshLambertMaterial(), 8);
  dily.frustumCulled = hlavy.frustumCulled = false;
  dily.instanceMatrix.setUsage(DynamicDrawUsage);
  hlavy.instanceMatrix.setUsage(DynamicDrawUsage);
  scene.add(dily, hlavy);
  const _m = new Matrix4();
  const _a = new Vector3();
  const _b = new Vector3();
  const _qy = new Quaternion();
  let nd = 0;
  let nh = 0;
  const KUZE = C(B.ruzova, 0.95);
  function usek(a, b, tx, tz, barva, ry = 0) {
    _v.subVectors(b, a);
    const d = _v.length();
    _q.setFromUnitVectors(UP, _v.divideScalar(d || 1));
    _q.multiply(_qy.setFromAxisAngle(UP, ry));
    _m.compose(_s.addVectors(a, b).multiplyScalar(0.5), _q, _v.set(tx * K, d, tz * K));
    dily.setMatrixAt(nd, _m);
    dily.setColorAt(nd, barva);
    nd++;
  }
  function postava(o) {
    const cs = Math.cos(o.ry);
    const sn = Math.sin(o.ry);
    const y0 = o.y ?? PY + 0.07;
    const W = (out, lx, ly, lz) => out.set(o.x + (lx * cs + lz * sn) * K, y0 + ly * K, o.z + (-lx * sn + lz * cs) * K);
    const hip = o.sedi ? 0.55 : 0.93 - (o.drep ?? 0);
    const sw = o.sway ?? 0;
    const lean = o.lean ?? 0;
    const p1 = new Vector3();
    const p2 = new Vector3();
    // nohy
    for (const s of [-1, 1]) {
      if (o.sedi) usek(W(p1, s * 0.26, 0, 0.42), W(p2, s * 0.13, hip, 0), 0.15, 0.15, o.nohy, o.ry);
      else usek(W(p1, s * 0.15, 0, 0), W(p2, s * 0.11 + sw * 0.5, hip, 0), 0.16, 0.16, o.nohy, o.ry);
    }
    const kx = sw;
    const ky = hip + 0.6;
    usek(W(p1, sw * 0.5, hip - 0.05, 0), W(p2, kx, ky, lean), 0.46, 0.25, o.telo, o.ry);
    // ruce
    usek(W(p1, kx - 0.26, ky - 0.07, lean), W(p2, ...o.l), 0.11, 0.11, o.rukav ?? o.telo, o.ry);
    usek(W(p1, kx + 0.26, ky - 0.07, lean), W(p2, ...o.r), 0.11, 0.11, o.rukav ?? o.telo, o.ry);
    W(p1, kx + (o.hlavaX ?? 0), ky + 0.2 + (o.kyv ?? 0) * 0.02, lean + 0.02 + (o.kyv ?? 0) * 0.06);
    _m.makeTranslation(p1.x, p1.y, p1.z);
    hlavy.setMatrixAt(nh, _m);
    hlavy.setColorAt(nh, KUZE);
    nh++;
    return W;
  }
  const obl = {
    mlecna: C(B.mlecna),
    hot: C(B.hot),
    modra: C('#4a5cff'),
    tmava: C('#1a1f6e'),
    cerna: C('#10133f'),
    ruzova: C(B.ruzova),
    kov: C('#c9cdea'),
    kytara: C(B.mlecna),
    basa: C(B.hot),
  };
  function hybejKapelou(beat) {
    nd = 0;
    nh = 0;
    const f = beat % 1;
    const bob = 0.5 - 0.5 * Math.cos(TAU * beat); // 0 na době, 1 mezi
    const kop = Math.exp(-f * 5);
    const p1 = new Vector3();
    const p2 = new Vector3();
    // zpěvák
    {
      const zveda = Math.sin(beat * (Math.PI / 4)) > 0.2;
      const W = postava({
        x: 0.3,
        z: -1.35,
        ry: 0.12 * Math.sin(beat * 0.39),
        drep: 0.07 * (1 - bob),
        lean: 0.1,
        sway: 0.07 * Math.sin(beat * Math.PI * 0.5),
        telo: obl.mlecna,
        nohy: obl.tmava,
        r: [0.1, 1.5, 0.32],
        l: zveda ? [-0.5, 2.0 + 0.12 * (1 - bob), 0.18] : [-0.36, 1.0, 0.1],
        kyv: 1 - bob,
      });
      usek(W(p1, 0.1, 1.46, 0.3), W(p2, 0.1, 1.62, 0.42), 0.07, 0.07, obl.cerna);
    }
    // kytarista
    {
      const o = { x: 3.3, z: -1.9, ry: -0.35 + 0.1 * Math.sin(beat * 0.5), drep: 0.06 * (1 - bob), lean: 0.08, sway: 0.05 * Math.sin(beat * Math.PI), telo: obl.hot, nohy: obl.cerna, kyv: kop };
      o.l = [-0.6, 1.3, 0.3];
      o.r = [0.14, 1.0 + 0.09 * Math.sin(beat * TAU * 2), 0.3];
      const W = postava(o);
      usek(W(p1, 0.34, 0.86, 0.26), W(p2, -0.1, 1.08, 0.26), 0.4, 0.1, obl.kytara, o.ry);
      usek(W(p1, -0.1, 1.08, 0.27), W(p2, -0.84, 1.44, 0.27), 0.07, 0.05, obl.cerna, o.ry);
    }
    // basák
    {
      const o = { x: -3.3, z: -2.1, ry: 0.38 + 0.08 * Math.sin(beat * 0.31), drep: 0.05 * (1 - bob), lean: 0.06, sway: 0.09 * Math.sin(beat * Math.PI * 0.5), telo: obl.modra, nohy: obl.cerna, kyv: kop };
      o.l = [-0.66, 1.34, 0.3];
      o.r = [0.14, 0.98 + 0.07 * Math.sin(beat * TAU), 0.3];
      const W = postava(o);
      usek(W(p1, 0.36, 0.82, 0.26), W(p2, -0.1, 1.06, 0.26), 0.36, 0.1, obl.basa, o.ry);
      usek(W(p1, -0.1, 1.06, 0.27), W(p2, -0.96, 1.5, 0.27), 0.06, 0.05, obl.cerna, o.ry);
    }
    // bubeník (sedí za bicími)
    {
      const hh = Math.abs(Math.sin(beat * TAU)); // hi-hat po osminách
      const sn = Math.exp(-(((beat + 1) % 2) % 2) * 4); // virbl na 2 a 4
      const o = { x: 0, z: -4.92, y: PY + RISER + 0.07, ry: 0, sedi: true, lean: 0.12, sway: 0.03 * Math.sin(beat * Math.PI), telo: obl.tmava, rukav: obl.ruzova, nohy: obl.cerna, kyv: kop };
      o.r = [0.62, 1.02 + 0.2 * hh, 0.6];
      o.l = [-0.3, 0.98 + 0.3 * (1 - sn), 0.62];
      const W = postava(o);
      usek(W(p1, ...o.r), W(p2, 0.82, o.r[1] - 0.12, 0.98), 0.035, 0.035, obl.mlecna);
      usek(W(p1, ...o.l), W(p2, -0.42, o.l[1] - 0.16, 1.0), 0.035, 0.035, obl.mlecna);
    }
    // klávesy / DJ
    {
      const o = { x: 4.25, z: -4.15, ry: -0.35, drep: 0.05 * (1 - bob), lean: 0.12, sway: 0, telo: obl.cerna, rukav: obl.modra, nohy: obl.tmava, kyv: 1 - bob };
      o.r = [0.3, 1.12, 0.5];
      o.l = [-0.42, 1.86 + 0.16 * (1 - bob), 0.2];
      postava(o);
    }
    dily.count = nd;
    hlavy.count = nh;
    dily.instanceMatrix.needsUpdate = true;
    hlavy.instanceMatrix.needsUpdate = true;
    if (dily.instanceColor) dily.instanceColor.needsUpdate = true;
    if (hlavy.instanceColor) hlavy.instanceColor.needsUpdate = true;
  }

  // ----- publikum -----
  const N = maly ? 230 : 460;
  const lide = [];
  {
    let pokusy = 0;
    while (lide.length < N && pokusy++ < N * 60) {
      const u = rnd();
      const z = 2.5 + Math.pow(u, 1.35) * 17;
      const sirka = 6.2 + (z - 2.5) * 0.42;
      const x = (rnd() * 2 - 1) * sirka;
      let ok = true;
      for (const p of lide) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < 0.36) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      lide.push({
        x,
        z,
        s: 0.88 + rnd() * 0.26,
        ry: Math.atan2(x - 0, z + 2) + (rnd() - 0.5) * 0.5,
        faze: rnd() * 0.22,
        amp: rnd() < 0.12 ? 0.22 + rnd() * 0.14 : 0.04 + rnd() * 0.09,
        pul: rnd() < 0.2,
        kyv: (rnd() - 0.5) * 0.25,
      });
    }
  }
  const telo = (() => {
    const a = new CylinderGeometry(0.15, 0.23, 1.28, 6).toNonIndexed();
    a.translate(0, 0.64, 0);
    const b = new IcosahedronGeometry(0.165, 1);
    b.translate(0, 1.47, 0);
    const barvi = (g, k) => g.setAttribute('color', new BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(k), 3));
    barvi(a, 1);
    barvi(b, 0.5);
    for (const g of [a, b]) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    return mergeGeometries([a, b]);
  })();
  const SATY = [
    [C('#20267e'), 5],
    [C('#2c3bd0'), 3],
    [C('#151a5c'), 4],
    [C('#4b3f9e'), 2],
    [C(B.ruzova, 0.9), 1.3],
    [C(B.hot, 0.9), 1],
    [C(B.mlecna, 0.9), 1.2],
  ];
  const vahy = SATY.reduce((a, [, w]) => a + w, 0);
  const dav = new InstancedMesh(telo, new MeshLambertMaterial({ vertexColors: true }), lide.length);
  dav.frustumCulled = false;
  dav.instanceMatrix.setUsage(DynamicDrawUsage);
  lide.forEach((p, i) => {
    let r = rnd() * vahy;
    let b = SATY[0][0];
    for (const [c, w] of SATY) {
      if ((r -= w) <= 0) {
        b = c;
        break;
      }
    }
    dav.setColorAt(i, b);
  });
  scene.add(dav);
  // zvednuté ruce a telefony jen u části lidí
  const sRukama = lide.map((p, i) => i).filter(() => rnd() < 0.26);
  const sTelefonem = sRukama.filter(() => rnd() < 0.24);
  const ruceGeo = mergeGeometries([
    new BoxGeometry(0.075, 0.62, 0.075).applyMatrix4(new Matrix4().makeTranslation(-0.24, 1.5, 0).multiply(new Matrix4().makeRotationZ(0.28))),
    new BoxGeometry(0.075, 0.62, 0.075).applyMatrix4(new Matrix4().makeTranslation(0.24, 1.5, 0).multiply(new Matrix4().makeRotationZ(-0.28))),
  ]);
  const ruce = new InstancedMesh(ruceGeo, new MeshLambertMaterial({ color: C(B.ruzova, 0.85) }), Math.max(1, sRukama.length));
  ruce.frustumCulled = false;
  ruce.instanceMatrix.setUsage(DynamicDrawUsage);
  const telGeo = new PlaneGeometry(0.11, 0.19).applyMatrix4(new Matrix4().makeTranslation(0.33, 1.86, 0.05));
  const telefony = new InstancedMesh(telGeo, new MeshBasicMaterial({ color: C(B.mlecna), side: DoubleSide, toneMapped: false }), Math.max(1, sTelefonem.length));
  telefony.frustumCulled = false;
  telefony.instanceMatrix.setUsage(DynamicDrawUsage);
  scene.add(ruce, telefony);
  const yLidi = new Float32Array(lide.length);
  function zapis(arr, i, p, y, sy) {
    const c = Math.cos(p.ry) * p.s;
    const s = Math.sin(p.ry) * p.s;
    const o = i * 16;
    arr[o] = c;
    arr[o + 1] = 0;
    arr[o + 2] = -s;
    arr[o + 3] = 0;
    arr[o + 4] = p.kyv * sy * 0.3;
    arr[o + 5] = p.s * sy;
    arr[o + 6] = 0;
    arr[o + 7] = 0;
    arr[o + 8] = s;
    arr[o + 9] = 0;
    arr[o + 10] = c;
    arr[o + 11] = 0;
    arr[o + 12] = p.x;
    arr[o + 13] = y;
    arr[o + 14] = p.z;
    arr[o + 15] = 1;
  }
  function hybejDavem(beat) {
    const a = dav.instanceMatrix.array;
    for (let i = 0; i < lide.length; i++) {
      const p = lide[i];
      const b = (p.pul ? beat * 0.5 : beat) + p.faze;
      const up = 0.5 - 0.5 * Math.cos(TAU * b);
      const y = p.amp > 0.2 ? Math.pow(up, 1.6) * p.amp : up * p.amp;
      yLidi[i] = y;
      p.kyv = Math.sin(b * Math.PI + i) * 0.12;
      zapis(a, i, p, y, 1);
    }
    dav.instanceMatrix.needsUpdate = true;
    const r = ruce.instanceMatrix.array;
    sRukama.forEach((i, k) => {
      const p = lide[i];
      zapis(r, k, p, yLidi[i] + 0.05 + 0.1 * (0.5 - 0.5 * Math.cos(TAU * (beat + p.faze))), 1);
    });
    ruce.instanceMatrix.needsUpdate = true;
    const tf = telefony.instanceMatrix.array;
    sTelefonem.forEach((i, k) => zapis(tf, k, lide[i], yLidi[i] + 0.12, 1));
    telefony.instanceMatrix.needsUpdate = true;
  }

  // ----- stíny (falešné: tmavá měkká kolečka na dlažbě) -----
  stiny.push([0, -3, 21, 0.75], [0, 7, 22, 0.55], [0, 14, 24, 0.4]);
  {
    const m = new InstancedMesh(
      new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ map: texKolecko, color: C('#050833'), transparent: true, depthWrite: false, fog: false }),
      stiny.length,
    );
    stiny.forEach(([x, z, s, k], i) => {
      m.setMatrixAt(i, _m.compose(_v.set(x, 0.02, z), _q.identity(), _s.set(s, 1, s * (i >= stiny.length - 3 ? 0.75 : 1))));
      m.setColorAt(i, C('#050833', 1));
    });
    m.material.opacity = 0.7;
    m.renderOrder = 1;
    m.frustumCulled = false;
    scene.add(m);
  }

  // ----- žárovky -----
  {
    const g = new BufferGeometry();
    const p = new Float32Array(zarovky.length * 3);
    const c = new Float32Array(zarovky.length * 3);
    const teple = [C('#ffd9a0'), C('#ffc98a'), C(B.ruzova), C('#ffe6c0')];
    zarovky.forEach(([x, y, z], i) => {
      p.set([x, y, z], i * 3);
      const b = teple[i % teple.length];
      c.set([b.r, b.g, b.b], i * 3);
    });
    g.setAttribute('position', new BufferAttribute(p, 3));
    g.setAttribute('color', new BufferAttribute(c, 3));
    const m = new Points(g, new PointsMaterial({ map: texKolecko, size: 0.85, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    m.frustumCulled = false;
    m.renderOrder = 4;
    scene.add(m);
  }

  // ----- paprsky -----
  const NB = FIX.length + 4;
  const paprsky = new InstancedMesh(
    new CylinderGeometry(0.05, 1, 1, 20, 1, true).translate(0, -0.5, 0),
    new ShaderMaterial({
      uniforms: { uI: { value: 1 } },
      vertexShader: /* glsl */ `
        varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vC;
        void main() {
          vH = uv.y;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vN = normalMatrix * mat3(instanceMatrix) * normal;
          vV = -mv.xyz;
          vC = instanceColor;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uI;
        varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vC;
        void main() {
          float f = abs(dot(normalize(vN), normalize(vV)));
          float a = pow(f, 1.6) * (0.14 + 0.86 * pow(vH, 1.3)) * (1.0 - smoothstep(0.88, 1.0, vH)) * uI;
          gl_FragColor = vec4(vC * a, 1.0);
        }`,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
    NB,
  );
  paprsky.frustumCulled = false;
  paprsky.renderOrder = 5;
  paprsky.instanceMatrix.setUsage(DynamicDrawUsage);
  const barvyPaprsku = [C(B.hot), C('#7f8dff'), C(B.ruzova), C(B.ruzova), C('#7f8dff'), C(B.hot), C('#6f80ff'), C(B.hot), C(B.hot), C('#6f80ff')];
  for (let i = 0; i < NB; i++) paprsky.setColorAt(i, barvyPaprsku[i % barvyPaprsku.length].clone().multiplyScalar(i < FIX.length ? 1 : 1.7));
  scene.add(paprsky);

  // ----- světelná kolečka: louže světla na zemi, opar, záře -----
  const dopady = FIX.map((_, i) => {
    const k = { p: new Vector3(), s: 5, c: barvyPaprsku[i].clone(), k: 'z', i: 0.5 };
    kola.push(k);
    return k;
  });
  FIX.forEach((p, i) => kola.push({ p: p.clone(), s: 1.5, c: barvyPaprsku[i].clone().lerp(C('#ffffff'), 0.4), k: 'b', i: 0.9 }));
  NEBE.forEach((p, i) => kola.push({ p: p.clone(), s: 2.4, c: barvyPaprsku[FIX.length + i].clone().lerp(C('#ffffff'), 0.3), k: 'b', i: 0.8 }));
  kola.push({ p: new Vector3(0, 6, -70), s: 120, c: C(B.hot, 0.11), k: 'b' }); // růžový dosvit za radnicí
  kola.push({ p: new Vector3(0, 0.06, 5), s: 24, c: C(B.hot, 0.1), k: 'z', puls: 1 });
  kola.push({ p: new Vector3(0, 4.2, -3.2), s: 15, c: C(B.ruzova, 0.035), k: 'b', puls: 1 });
  const opar = [];
  for (let i = 0; i < 7; i++) {
    const k = { p: new Vector3((rnd() - 0.5) * 16, 2.5 + rnd() * 4, -2 + rnd() * 9), s: 9 + rnd() * 8, c: (i % 2 ? C(B.hot) : C('#6f80ff')).multiplyScalar(0.04), k: 'b', x0: 0, f: rnd() * 6 };
    k.x0 = k.p.x;
    opar.push(k);
    kola.push(k);
  }
  const kolecka = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: texKolecko, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }),
    kola.length,
  );
  kolecka.frustumCulled = false;
  kolecka.renderOrder = 3;
  kolecka.instanceMatrix.setUsage(DynamicDrawUsage);
  scene.add(kolecka);
  const qZem = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  const _c = new Color();
  function hybejKolecky(puls) {
    for (let i = 0; i < kola.length; i++) {
      const k = kola[i];
      _m.compose(k.p, k.k === 'z' ? qZem : camera.quaternion, _s.set(k.s, k.s, 1));
      kolecka.setMatrixAt(i, _m);
      _c.copy(k.c).multiplyScalar((k.i ?? 1) * (k.puls ? 0.75 + 0.5 * puls : 1));
      kolecka.setColorAt(i, _c);
    }
    kolecka.instanceMatrix.needsUpdate = true;
    kolecka.instanceColor.needsUpdate = true;
  }

  // ----- konfety -----
  const NK = maly ? 70 : 130;
  const konf = new Float32Array(NK * 3);
  const konfD = [];
  {
    const c = new Float32Array(NK * 3);
    const b = [C(B.ruzova), C(B.hot), C(B.mlecna), C('#7f8dff')];
    for (let i = 0; i < NK; i++) {
      konfD.push({ x: (rnd() - 0.5) * 22, z: -1 + rnd() * 16, y: rnd() * 11, v: 0.5 + rnd() * 0.6, f: rnd() * 9 });
      const k = b[i % b.length];
      c.set([k.r, k.g, k.b], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(konf, 3).setUsage(DynamicDrawUsage));
    g.setAttribute('color', new BufferAttribute(c, 3));
    const m = new Points(g, new PointsMaterial({ size: 0.13, vertexColors: true, fog: false, toneMapped: false }));
    m.frustumCulled = false;
    scene.add(m);
    konfD.g = g;
  }
  function hybejKonfetami(t) {
    for (let i = 0; i < NK; i++) {
      const k = konfD[i];
      const y = 11 - ((k.y + t * k.v) % 11);
      konf[i * 3] = k.x + Math.sin(t * 0.9 + k.f) * 0.5;
      konf[i * 3 + 1] = y + 0.4;
      konf[i * 3 + 2] = k.z + Math.cos(t * 0.7 + k.f) * 0.4;
    }
    konfD.g.attributes.position.needsUpdate = true;
  }

  // ----- kamera -----
  const cil = new Vector3(0, 4.6, 1.5);
  let vzdal = 34;
  let siroky = true;
  let uhel0 = 0.42;
  let rozkmit = 0.3;
  let vyska0 = 0.2;
  const mys = { x: 0, y: 0, tx: 0, ty: 0 };
  function rozvrh() {
    const w = Math.max(1, root.clientWidth);
    const h = Math.max(1, root.clientHeight);
    renderer.setSize(w, h, false);
    const pomer = w / h;
    siroky = w >= 1024;
    // kde na plátně má být střed scény a kolik šířky jí patří (zbytek zabírá text)
    const cx = siroky ? 0.69 : 0.5;
    const cy = siroky ? 0.6 : w < 640 ? 0.29 : 0.29;
    const podil = siroky ? 0.66 : 1;
    const sirkaSceny = siroky ? 31 : pomer < 0.62 ? 20 : 29;
    camera.fov = siroky ? 30 : 36;
    camera.aspect = pomer;
    const tg = Math.tan(MathUtils.degToRad(camera.fov / 2));
    vzdal = MathUtils.clamp(sirkaSceny / (podil * 2 * tg * pomer), 26, 80);
    // na výšku nesmí scéna přerůst svůj díl (věž radnice ~24 m + publikum)
    const vyskaDilu = siroky ? 0.92 : 0.46;
    vzdal = Math.max(vzdal, (siroky ? 23.5 : 25) / (vyskaDilu * 2 * tg));
    uhel0 = siroky ? 0.44 : 0.3;
    rozkmit = siroky ? 0.3 : 0.24;
    vyska0 = siroky ? 0.15 : 0.2;
    camera.setViewOffset(w, h, (0.5 - cx) * w, (0.5 - cy) * h, w, h);
    camera.updateProjectionMatrix();
    scene.fog.near = vzdal * 0.75;
    scene.fog.far = vzdal + 105;
  }
  function hybejKamerou(t) {
    mys.x += (mys.tx - mys.x) * 0.04;
    mys.y += (mys.ty - mys.y) * 0.04;
    const th = uhel0 + Math.sin(t * 0.085) * rozkmit + mys.x * 0.07;
    const ph = vyska0 + Math.sin(t * 0.061 + 1) * 0.035 - mys.y * 0.03;
    const d = vzdal * (1 + Math.sin(t * 0.05 + 2) * 0.035);
    camera.position.set(cil.x + d * Math.sin(th) * Math.cos(ph), cil.y + d * Math.sin(ph), cil.z + d * Math.cos(th) * Math.cos(ph));
    camera.lookAt(cil);
  }

  // ----- snímek -----
  const info = { snimku: 0, volani: 0, trojuhelniku: 0, bezi: false, gpu: '' };
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    info.gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  } catch {
    /* nic */
  }
  window.__hero3d = info;

  function kresli(t) {
    const beat = (t * BPM) / 60;
    const f = beat % 1;
    const puls = Math.exp(-f * 4.5); // kopák na každou dobu
    const blesk = Math.exp(-(beat % 8) * 3.2); // jemný záblesk jednou za dva takty
    hybejKamerou(t);
    hybejKapelou(beat);
    hybejDavem(beat);
    hybejNapisem(t);
    hybejKonfetami(t);
    ukazSnimek(info.snimek ?? Math.floor(beat / 8) % Math.max(1, snimky.length)); // info.snimek = zámek pro ladění

    // paprsky z trussu do publika
    for (let i = 0; i < FIX.length; i++) {
      const o = FIX[i];
      const s = i < 3 ? -1 : 1;
      const tx = o.x * 1.25 + Math.sin(t * 0.55 + i * 1.1) * 4.2 * s;
      const tz = 8.5 + Math.sin(t * 0.4 + i * 0.9) * 4.5;
      _a.set(tx, 0, tz);
      dopady[i].p.set(tx, 0.07, tz);
      dopady[i].i = 0.34 + 0.22 * puls;
      _b.subVectors(_a, o);
      const d = _b.length();
      _q.setFromUnitVectors(DOWN, _b.divideScalar(d));
      paprsky.setMatrixAt(i, _m.compose(o, _q, _s.set(1.25, d, 1.25)));
    }
    // paprsky do nebe, vějíř po stranách pódia
    for (let i = 0; i < NEBE.length; i++) {
      const s = i < 2 ? -1 : 1;
      const vnitrni = i === 1 || i === 2;
      const a = (vnitrni ? 0.22 : 0.62) + Math.sin(t * 0.5 + (vnitrni ? 1.2 : 0)) * 0.2;
      _b.set(Math.sin(a) * s, Math.cos(a), 0.12 + 0.1 * Math.sin(t * 0.3 + i)).normalize();
      _q.setFromUnitVectors(DOWN, _b);
      paprsky.setMatrixAt(FIX.length + i, _m.compose(NEBE[i], _q, _s.set(1.5, 30, 1.5)));
    }
    paprsky.instanceMatrix.needsUpdate = true;
    paprsky.material.uniforms.uI.value = 0.3 + 0.1 * puls + 0.2 * blesk;

    // wash na pódiu: dvě barvy se pomalu přelévají a dýchají s kopákem
    const w = 0.5 + 0.5 * Math.sin(t * 0.45);
    washA.intensity = (130 + 90 * puls) * (0.6 + 0.4 * w);
    washB.intensity = (130 + 90 * puls) * (1 - 0.4 * w);
    uvnitr.intensity = 34 + 26 * puls;
    strobo.intensity = 260 * blesk;
    for (const k of opar) k.p.x = k.x0 + Math.sin(t * 0.12 + k.f) * 2.2;
    hybejKolecky(puls);

    renderer.render(scene, camera);
    info.snimku++;
    info.volani = renderer.info.render.calls;
    info.trojuhelniku = renderer.info.render.triangles;
  }

  // ----- běh -----
  let cas = 1.3;
  let posledni = 0;
  let raf = 0;
  let videt = true;
  let pauza = false;
  function tik(ted) {
    raf = 0;
    const dt = Math.min(0.05, (ted - posledni) / 1000 || 0);
    posledni = ted;
    cas += dt;
    kresli(info.cas ?? cas); // info.cas = zámek času pro ladění
    naplanuj();
  }
  function maBezet() {
    return !klid && !pauza && videt && !document.hidden;
  }
  function naplanuj() {
    info.bezi = maBezet();
    if (info.bezi && !raf) {
      raf = requestAnimationFrame((t) => {
        if (!posledni) posledni = t;
        tik(t);
      });
    }
  }
  function prekontroluj() {
    if (!maBezet()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      posledni = 0;
      info.bezi = false;
    } else {
      posledni = 0;
      naplanuj();
    }
  }

  rozvrh();
  kresli(cas);
  canvas.classList.add('je-videt');

  new ResizeObserver(() => {
    rozvrh();
    if (!raf) kresli(cas); // i při pauze / omezeném pohybu překresli jeden snímek
  }).observe(root);
  new IntersectionObserver(
    (z) => {
      videt = z[0].isIntersecting;
      prekontroluj();
    },
    { threshold: 0.02 },
  ).observe(root);
  document.addEventListener('visibilitychange', prekontroluj);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener(
      'pointermove',
      (e) => {
        mys.tx = (e.clientX / innerWidth) * 2 - 1;
        mys.ty = (e.clientY / innerHeight) * 2 - 1;
      },
      { passive: true },
    );
  }
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    pauza = true;
    prekontroluj();
    canvas.classList.remove('je-videt'); // zpátky na statický podklad
    if (tlacitko) tlacitko.hidden = true;
  });
  if (tlacitko && !klid) {
    tlacitko.hidden = false;
    tlacitko.addEventListener('click', () => {
      pauza = !pauza;
      tlacitko.setAttribute('aria-pressed', String(pauza));
      const popis = pauza ? 'Spustit animaci' : 'Pozastavit animaci';
      tlacitko.setAttribute('aria-label', popis);
      tlacitko.title = popis;
      prekontroluj();
    });
  }
  prekontroluj();
  return true;
}
