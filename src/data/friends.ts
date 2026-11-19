// Amigos que aparecen en el cuadro de la caseta de radio.
// `spoken` es lo que dice la voz de la radio (en inglés) antes de redirigir.
export interface Friend {
  name: string;
  spoken: string;
  url: string;
}

export const friends: Friend[] = [{ name: 'Damián Panes', spoken: 'Damian Panes', url: 'https://dapan.es/' }];
