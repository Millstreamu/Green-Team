import { findSpace, LOOT_TYPES } from './loot.js';
export const CART_HOLD = Object.freeze({width:6,height:6});
export function createRunCart(){return {items:[],aboard:[],countdown:null};}
// Transfers move the exact instance, preserving count, rotation, sale multiplier
// and test-item tags. Capacity is spatial; it never grows with stack counts.
export function transferCart(cart,loot,id,toCart){
 if(loot.held||typeof id!=='string'||toCart!==true)return false;
 const source=loot.bag,target=cart.items;
 const index=source.findIndex(item=>item.id===id);if(index<0)return false;
 const item=source[index];if(LOOT_TYPES[item.type]?.runOnly)return false;
 const placed=findSpace(target,item,CART_HOLD);if(!placed)return false;
 source.splice(index,1);target.push(placed);return true;
}
export function boardRunCart(cart,id,active){
 if(typeof active!=='boolean'||typeof id!=='string')return false;
 const seated=cart.aboard.includes(id);if(seated===active)return false;
 cart.aboard=active?[...cart.aboard,id]:cart.aboard.filter(value=>value!==id);cart.countdown=null;return true;
}
export function tickRunCart(cart,eligible,dt){
 cart.aboard=cart.aboard.filter(id=>eligible.includes(id));
 if(!eligible.length||eligible.some(id=>!cart.aboard.includes(id))){cart.countdown=null;return false;}
 cart.countdown=Math.max(0,(cart.countdown??3)-Math.max(0,dt));return cart.countdown<=.000001;
}
