// Content values live together so a future builder can edit them.
export const CONFIG = Object.freeze({ width: 76, height: 56, rooms: 14, extraConnections: 3, preserveDeadEnds: 2, minLoopDetour: 8, maxLoopLength: 40, tile: 24, speed: 4.5, radius: 0.26, hopHeight: 6, hopRate: 12 });

// Supplied sprite faces left; keep orientation explicit.
export const GOBLIN_ART = Object.freeze({ src: 'assets/goblin.png', width: 16, height: 16, scale: 2, faces: -1 });

// Prototype balance values, separate from behaviour so they can be tuned later.
export const COMBAT = Object.freeze({ health: 3, invulnerable: 1.0, patrolSpeed: 1.8, chaseSpeed: 3.8, sight: 7, alertSight: 9, halfCone: Math.PI / 3.6, noticeTime: 0.8, searchTime: 4, attackRange: 0.95, windup: 0.55, cooldown: 1.1, guardRadius: 0.26 });
