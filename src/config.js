// Content values live together so a future builder can edit them.
export const CONFIG = Object.freeze({ width: 76, height: 56, rooms: 14, tile: 24, speed: 4.5, radius: 0.26, hopHeight: 6, hopRate: 12 });

// Supplied sprite faces left; keep orientation explicit.
export const GOBLIN_ART = Object.freeze({ src: 'assets/goblin.png', width: 16, height: 16, scale: 2, faces: -1 });
