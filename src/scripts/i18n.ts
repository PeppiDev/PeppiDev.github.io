// Idioma: el HTML viene en español; si el visitante prefiere inglés se reemplazan
// los textos antes de mostrar nada. La detección (parámetro ?lang, elección guardada,
// y si no la lista de idiomas del navegador en orden) está en el <head> de la página.

export type Lang = 'es' | 'en';
export const lang: Lang = document.documentElement.lang === 'es' ? 'es' : 'en';
export const tr = (es: string, en: string) => (lang === 'es' ? es : en);

const TEXT: [string, string | string[]][] = [
  ['.bar nav a', ['Outside', 'About', 'Projects', 'Contact']],
  ['#snd', 'Sound · on'],
  ['.tagline', 'Every part has a reason to be there.'],
  ['.hint', 'Pick a place to enter'],
  ['.spot[data-to] .tag', ['<b>LZ 20</b> Projects · Sound3ds', '<b>Hangar</b> About me', '<b>Radio</b> Contact']],
  ['[data-scene="taller"] > .back', '← Leave the hangar'],
  ['#look', 'Look to starboard →'],
  ['[data-lamp] b', ['Lamp', 'Lamp']],
  ['#sheet1 .kicker', 'Hangar · workshop'],
  ['#sheet1 h2', 'About me'],
  ['#sheet1 .role', 'Programmer · cybersecurity student · Chillán'],
  [
    '#sheet1 p:not(.mono)',
    [
      'Before I ever touched a line of code, I was already spending whole afternoons in front of an Olidata running Windows XP — the old family desktop, the same one I kept an eye on while my brother studied computer science and kept an eye on me. I didn’t choose programming so much as it found me there, little by little.',
      'For a while I thought my path would be a different one: the Air Force. But here I am.',
      'That love of flying never went away; it just changed shape. It began with Flyboys, a 2006 film — the same year I was born — and it stayed, turning over the years into a genuine fascination with the engineering behind vintage aircraft. Zeppelins above all: not out of childhood nostalgia, but with the same kind of attention I give a mechanical watch, an analog gauge, a radio station — things where every part has a reason to be there.',
    ],
  ],
  [
    '#sheet2 p[data-type]',
    'I’m from Chillán. I left a technical high school with a programmer’s diploma, and I’m still studying today — cybersecurity this time. In between, I keep going back to the same saga, as I have for years: Metro. Maybe because it’s the closest thing, in video game form, to what I truly like: mechanisms and instruments, things you understand better the longer you look at them.',
  ],
  ['[data-scene="lz20"] > a.back', '← Disembark'],
  ['#log header .mono', 'Logbook · LZ 20'],
  [
    '#log p[data-type]',
    [
      'A music player and streaming client for the Nintendo 3DS/2DS, written in plain C on devkitPro — the kind of environment where there’s no memory to spare and no room to improvise. It decodes MP3, AAC and FLAC (up to 24-bit/96kHz on the original 3DS), and connects to SoundCloud, Bandcamp and self-hosted music servers like Navidrome or Subsonic.',
      'Gapless playback with crossfade, cover flow, seven visual themes each with its own spectrum visualizer, and a companion PC app that transfers music wirelessly via QR. Every feature was tested on real hardware — an old 2DS, a New 3DS XL, a New 2DS XL — because on consoles like these, what works in theory doesn’t always work on the actual machine.',
    ],
  ],
  ['[data-scene="contacto"] > .back', '← Leave the radio shack'],
  ['#framebtn .tag', '<b>Friends</b> see the photo'],
  ['#unzoom', '← Back to the desk'],
  ['.soundnote', 'Turn the sound on (top) to hear the radio'],
  ['#card .kicker', 'Radio station'],
  ['#card h2', 'Contact'],
  ['#card > p:not(.mono)', 'Two channels, always open.'],
  ['.channels li:first-child .mono', 'Email'],
  ['#upstairs', '← Back upstairs'],
];

const ATTR: [string, string, string][] = [
  ['.bar nav', 'aria-label', 'Places'],
  ['#keys', 'aria-label', 'Typewriter keyboard: press the keys'],
  ['#sheet2', 'aria-label', 'About me, second sheet'],
  ['#pilot', 'aria-label', 'The helmsman: give him a tap'],
  ['#lampS', 'aria-label', 'Table lamp: turn on or off'],
  ['#mug', 'aria-label', 'Coffee mug'],
  ['#survivor', 'aria-label', 'Someone in a gas mask: say hi'],
  ['#cat', 'aria-label', 'The cat on the beanbag: bother him'],
  ['#rbx', 'aria-label', 'A badly pasted avatar: talk to it'],
  ['#spy', 'aria-label', 'Binoculars: take a closer look at the valley'],
  ['#dials', 'aria-label', 'Instruments: project data and conditions in Chillán'],
  ['#tkey', 'aria-label', 'Telegraph key: hold down to transmit'],
  ['#me', 'aria-label', 'Benjamín, sprawled in the armchair: talk to him'],
  ['meta[name="description"]', 'content', 'Benjamín Ulloa (Peppi) — programmer from Chillán, Chile. Every part has a reason to be there.'],
];

/** Traduce la página (si corresponde), arma el botón de idioma y recién ahí la muestra. */
export function localize() {
  if (lang === 'en') {
    for (const [sel, html] of TEXT)
      document.querySelectorAll(sel).forEach((el, i) => {
        const h = typeof html === 'string' ? html : html[i];
        if (h !== undefined) el.innerHTML = h;
      });
    for (const [sel, attr, value] of ATTR) document.querySelector(sel)?.setAttribute(attr, value);
  }
  const b = document.querySelector<HTMLElement>('#lng');
  if (b) {
    const other: Lang = lang === 'es' ? 'en' : 'es';
    b.textContent = other.toUpperCase();
    b.setAttribute('lang', other);
    b.setAttribute('aria-label', other === 'en' ? 'Switch to English' : 'Cambiar a español');
    b.addEventListener('click', () => {
      try {
        localStorage.setItem('lang', other);
      } catch {
        /* sin almacenamiento: se cambia sólo por esta vez */
      }
      const u = new URL(location.href);
      u.searchParams.set('lang', other);
      location.replace(u);
    });
  }
  document.documentElement.dataset.ready = '';
}
