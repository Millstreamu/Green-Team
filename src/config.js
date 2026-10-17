// Content values live together so a future builder can edit them.
export const CONFIG = Object.freeze({ width: 76, height: 56, rooms: 14, extraConnections: 3, preserveDeadEnds: 2, minLoopDetour: 8, maxLoopLength: 40, tile: 24, speed: 4.5, radius: 0.26, hopHeight: 6, hopRate: 12 });

// Supplied sprite faces left; keep orientation explicit.
export const GOBLIN_ART = Object.freeze({ src: 'assets/goblin.png', width: 16, height: 16, scale: 2, faces: -1 });

// Prototype balance values, separate from behaviour so they can be tuned later.
export const COMBAT = Object.freeze({ health: 3, invulnerable: 1.0, patrolSpeed: 1.8, chaseSpeed: 3.8, searchSpeed: 2.2, trailSeconds: 2.5, trailSpacing: 0.3, sight: 7, alertSight: 9, halfCone: Math.PI / 3.6, noticeTime: 0.8, searchTime: 4, attackRange: 0.95, attackReach: 1.2, attackHalfArc: Math.PI / 3, windup: 0.18, swingTime: 0.14, cooldown: 0.45, knockbackDistance: 0.55, knockbackTime: 0.1, guardRadius: 0.26 });

export const SEARCH = Object.freeze({ reach: 1.6, movementTolerance: 0.08, chestTime: 2.5, cupboardTime: 3.5, crateTime: 1.5, spillTime: 0.4 });

export const GUARD_PATTERNS = Object.freeze({ count: 3, roamerEnabled: true, roamRooms: 3, roamMaxLength: 55, roamPause: 3, lookPause: 2.6, roomPause: 2.0, turnSpeed: Math.PI * 2 });

export const TRAPS = Object.freeze({ placeTime: 1, reach: 1.5, holdTime: 3, triggerRadius: 0.32, clearMargin: 0.15, armDelay: 0.25 });

// Search rewards are rolled once per container when the dungeon is generated.
export const SEARCH_LOOT = Object.freeze({ nearEmptyChance: 0.7, farEmptyChance: 0.5, twoItemChance: 0.15, nearMaterialChance: 0.75, farMaterialChance: 0.2, nearRareChance: 0.1, farRareChance: 0.8 });

// Temporary XP pacing for the personal-progression playtest.
export const PROGRESSION = Object.freeze({ xpPerGold: 1 });

export const HEAT = Object.freeze({ riseSeconds: 30, coolDelay: 4, coolSeconds: 20, maxSpeedRatio: 1.08, alertsPerGuard: 3, arrivalWarning: 2, doorRoomInterval: 3 });

export const HIDING = Object.freeze({ enterTime: 0.5, reach: 1.6, roomInterval: 2, pullReach: 0.8 });

export const SMOKE = Object.freeze({ radius: 2, duration: 5 });
