// Fill available station space with reserved slots, leaving real actions first.
export function stationGridCapacity(width,height,size=64,gap=8,count=0){
 const columns=Math.max(1,Math.floor((Math.max(0,width)+gap)/(size+gap)));
 const rows=Math.max(1,Math.floor((Math.max(0,height)+gap)/(size+gap)));
 return {columns,total:Math.max(columns*rows,Math.ceil((count+columns)/columns)*columns)};
}
export function createFillingStationGrid(grid,getCount,{className='book-placeholder',label='Reserved for future recipes'}={}){
 const slots=[];
 function refresh(){
  const count=getCount();let layout={columns:3,total:12};
  if(typeof getComputedStyle==='function'&&grid.clientWidth>0&&grid.clientHeight>0){
   const css=getComputedStyle(grid),size=parseFloat(css.getPropertyValue('--station-slot'))||64,gap=parseFloat(css.columnGap)||8;
   layout=stationGridCapacity(grid.clientWidth,grid.clientHeight,size,gap,count);
  }
  grid.dataset.columns=String(layout.columns);
  if(grid.style.setProperty)grid.style.setProperty('--station-columns',String(layout.columns));
  while(slots.length<layout.total-count){const slot=document.createElement('div');slot.className=className;slot.setAttribute('role','img');slot.setAttribute('aria-label',label);slot.textContent='+';grid.append(slot);slots.push(slot);}
  slots.forEach((slot,index)=>{slot.hidden=index>=layout.total-count;});
 }
 if(typeof ResizeObserver==='function')new ResizeObserver(refresh).observe(grid);
 return {refresh};
}
