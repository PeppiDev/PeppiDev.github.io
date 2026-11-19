export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Env {
  door: number; // apertura del portón del hangar 0..1
  rain: number;
  hour: number; // hora de Chillán, para los relojes
  daylight: number; // cuánta luz de día entra por las ventanas 0..1
  lamp: number; // lámpara del escritorio 0..1
  still: boolean; // prefers-reduced-motion
}
