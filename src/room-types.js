// First room pass: existing items and search rates; purpose changes furniture
// and the mix inside successful material/common/rare rolls.
export const ROOM_TYPES = Object.freeze({
 dining: {furnishings:['table','bench','sideboard','bench'],name:'Dining hall',furniture:'table',label:'Dining table',materials:{meat:3,berries:2},pool:['copperCoin','silverCoin','coin'],rarePool:['candlestick','horn']},
 storage: {furnishings:['stores','crate','stores'],name:'Storage room',furniture:'stores',label:'Supply shelves',materials:{scrap:2,cloth:2},pool:['scroll','copperCoin','silverCoin','coin'],rarePool:['sword','horn']},
 prayer: {furnishings:['altar','pew','pew'],name:'Prayer room',furniture:'altar',label:'Altar',materials:{cloth:3,mushroom:2},pool:['scroll','scroll','copperCoin','coin'],rarePool:['candlestick','ruby']},
 bedroom: {furnishings:['bed','wardrobe','dresser'],name:'Bedroom',furniture:'bed',label:'Bed',materials:{cloth:6},pool:['silverCoin','coin','scroll'],rarePool:['ruby','candlestick']},
 kitchen: {furnishings:['stove','counter','pantry'],name:'Kitchen',furniture:'stove',label:'Kitchen stores',materials:{meat:5,berries:4,mushroom:4},pool:['copperCoin','silverCoin','coin'],rarePool:['candlestick','horn']},
 armoury: {furnishings:['rack','armourChest','rack'],name:'Armoury',furniture:'rack',label:'Weapon rack',materials:{scrap:6,cloth:2},pool:['copperCoin','silverCoin','coin'],rarePool:['sword','sword','horn']}
});
export function assignRoomTypes(world) {
 if(!world.roomThemes)return;
 const ids=Object.keys(ROOM_TYPES),order=[...ids];let state=(world.seed^0x726f6f6d)>>>0;
 for(let i=order.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 world.rooms.forEach((r,i)=>{if(i>0&&!Object.hasOwn(ROOM_TYPES,r.roomType))r.roomType=order[(i-1)%order.length];});
}
export function roomLootPools(roomType,definition,materials) {
 const room=Object.hasOwn(ROOM_TYPES,roomType)?ROOM_TYPES[roomType]:null;
 if(!room)return {materials,pool:definition.pool,rarePool:definition.rarePool};
 return {materials:materials.flatMap(id=>Array(room.materials[id]??1).fill(id)),pool:room.pool,rarePool:room.rarePool};
}
export function searchableName(object) {
 return object.roomFurniture ? ROOM_FURNITURE_NAMES[object.roomFurniture] ?? object.type : ({chest:'Chest',cupboard:'Cupboard',crate:'Crate'}[object.type]??object.type);
}

export function roomMaterialContainer(roomType,containerType) { return Object.hasOwn(ROOM_TYPES,roomType)?'cupboard':containerType; }

export const ROOM_FURNITURE_NAMES = Object.freeze({table:'Dining table',bench:'Bench',sideboard:'Sideboard',stores:'Supply shelves',crate:'Supply crate',altar:'Altar',pew:'Prayer bench',bed:'Bed',wardrobe:'Wardrobe',dresser:'Dresser',stove:'Stove',counter:'Kitchen counter',pantry:'Pantry',rack:'Weapon rack',armourChest:'Equipment chest'});
export function roomFurnitureFor(roomType,index) { const r=Object.hasOwn(ROOM_TYPES,roomType)?ROOM_TYPES[roomType]:null;return r?r.furnishings[index%r.furnishings.length]:null; }

// Coordinates are source-art pixels on the existing one-tile furniture.
// Closed cupboards, beds, stoves and weapon racks are not loose-loot surfaces.
export const LOOT_SURFACES = Object.freeze({
 table: [16, 15], bench: [16, 20], sideboard: [16, 6],
 stores: [15, 15], crate: [22, 10], altar: [16, 17],
 pew: [16, 20], dresser: [16, 6], counter: [24, 16],
 armourChest: [16, 6], chest: [16, 12], cupboard: [16, 8]
});
export function lootSurface(object) {
 const kind=object.roomFurniture ?? object.type;
 return Object.hasOwn(LOOT_SURFACES,kind)?LOOT_SURFACES[kind]:null;
}
