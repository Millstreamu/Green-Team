"""Proposed 47-pattern wall atlas: drawing reference, not a runtime migration."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, base64, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'workshop/templates/terrain-v2'
OUT.mkdir(parents=True, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n): return ImageFont.truetype(FONT, n)
# Clockwise neighbour bits: N NE E SE S SW W NW. Ignore a diagonal
# unless both of its adjacent cardinal neighbours are also walls.
def normalize(m):
    for d,a,b in [(1,0,2),(3,2,4),(5,4,6),(7,6,0)]:
        if not (m & (1<<a) and m & (1<<b)): m &= ~(1<<d)
    return m
MASKS = sorted({normalize(m) for m in range(256)}, key=lambda m:(-sum(bool(m&(1<<i)) for i in [0,2,4,6]),-m.bit_count(),m))
assert len(MASKS)==47
dirs=['N','NE','E','SE','S','SW','W','NW']
def family(m):
    sides=[d for i,d in [(0,'N'),(2,'E'),(4,'S'),(6,'W')] if m&(1<<i)]
    n=len(sides)
    if n==0:return 'Isolated pillar'
    if n==1:return 'End cap · joins '+sides[0]
    if n==2:
        if set(sides) in [set('NS'),set('EW')]:return 'Thin wall · '+'/'.join(sides)
        return 'Elbow · '+'/'.join(sides)
    if n==3:return 'T join · '+'/'.join(sides)
    if m==255:return 'Solid wall interior'
    return 'Inside corner variant'
def tile(m):
    im=Image.new('RGBA',(32,32)); d=ImageDraw.Draw(im)
    # A deliberately plain wall silhouette. Fixed source-pixel depth; no rotations.
    d.rectangle((6,6,25,25),fill='#91a294')
    for b,box in [(0,(6,0,25,6)),(2,(25,6,31,25)),(4,(6,25,25,31)),(6,(0,6,6,25)),(1,(25,0,31,6)),(3,(25,25,31,31)),(5,(0,25,6,31)),(7,(0,0,6,6))]:
        if m&(1<<b):d.rectangle(box,fill='#91a294')
    alpha=im.getchannel('A'); p=im.load()
    for x in range(32):
        for y in range(32):
            if not alpha.getpixel((x,y)):continue
            # South-facing visible wall face occupies the final 8 opaque pixels.
            if any(y+k<32 and not alpha.getpixel((x,y+k)) for k in range(1,9)) or (not m&16 and y>=18):
                p[x,y]=(72,91,80,255)
            if (y==0 and not m&1) or (y>0 and not alpha.getpixel((x,y-1))):p[x,y]=(209,221,187,255)
    return im
floor=Image.new('RGBA',(32,32),'#d9c89c'); fd=ImageDraw.Draw(floor);fd.line((0,31,31,31),fill='#c2ae80');fd.line((31,0,31,31),fill='#c2ae80')
tiles=[floor]+[tile(m) for m in MASKS]
atlas=Image.new('RGBA',(256,192))
for i,t in enumerate(tiles):atlas.paste(t,(i%8*32,i//8*32))
atlas.save(OUT/'terrain-v2-construction-256x192.png')
Image.new('RGBA',(256,192)).save(OUT/'terrain-v2-blank-256x192.png')
entries=[dict(id=0,name='Floor',mask=None,x=0,y=0)]+[dict(id=i+1,name=family(m),mask=m,joins=[dirs[b] for b in range(8) if m&(1<<b)],x=(i+1)%8*32,y=(i+1)//8*32) for i,m in enumerate(MASKS)]
(OUT/'terrain-v2-layout.json').write_text(json.dumps(dict(status='PROPOSED; not accepted by the five-tile workshop importer',tileSize=32,columns=8,rows=6,spacing=0,padding=0,entries=entries),indent=2))
sheet=Image.new('RGB',(1280,1230),'#f4f0e5');d=ImageDraw.Draw(sheet)
d.text((28,18),'WALL TILE DRAWING GUIDE',font=font(30),fill='#23362e')
d.text((28,60),'Proposed atlas: 8 columns × 6 rows · 32px tiles · 256 × 192px PNG',font=font(20),fill='#23362e')
d.text((28,91),'Green = wall cap · dark green = face · cream = floor showing through transparency',font=font(17),fill='#23362e')
for e,t in zip(entries,tiles):
    x=28+e['id']%8*156;y=140+e['id']//8*173
    d.rectangle((x,y,x+127,y+127),fill='#d9c89c')
    sheet.paste(t.resize((128,128),Image.Resampling.NEAREST),(x,y),t.resize((128,128),Image.Resampling.NEAREST))
    d.rectangle((x,y,x+127,y+127),outline='#718273')
    d.text((x,y+131),f"{e['id']:02}  "+ ('Floor' if e['id']==0 else ''.join(v for v in e['joins'] if len(v)==1) or 'Pillar'),font=font(17),fill='#23362e')
    d.text((x,y+152),e['name'].split(' · ')[0],font=font(13),fill='#23362e')
d.text((28,1190),'Reference only. Paint on a separate layer. Do not upload this labelled guide as game art.',font=font(18),fill='#23362e')
sheet.save(OUT/'terrain-v2-labelled-guide.png')
# Assembled stress scene: room boundary, doors, narrow partitions and pillar.
rows=['####################','#........#.........#','#........#.........#','#..................#','#........####..#####','#..##....#.........#','#..##..............#','#........#....#....#','####..####....#....#','#.............#....#','#..................#','####################']
scene=Image.new('RGB',(640,384),'#d9c89c');sd=ImageDraw.Draw(scene)
for y,row in enumerate(rows):
    for x,ch in enumerate(row):
        if ch!='#':t=floor;i=0
        else:
            m=0
            for b,(dx,dy) in enumerate([(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]):
                xx,yy=x+dx,y+dy
                if 0<=xx<20 and 0<=yy<12 and rows[yy][xx]=='#':m|=1<<b
            m=normalize(m);i=1+MASKS.index(m);t=tiles[i]
        scene.paste(t,(x*32,y*32),t)
scene.resize((1280,768),Image.Resampling.NEAREST).save(OUT/'terrain-v2-assembled-example.png')
def uri(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
cards=''
for e,t in zip(entries,tiles):
    from io import BytesIO
    b=BytesIO();t.save(b,format='PNG');src='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
    cards+=f'<button type="button" class="tg-cell" data-id="{e["id"]}" aria-label="Tile {e["id"]}: {e["name"]}"><img alt="" src="{src}"><span>{e["id"]:02}</span></button>'
readme='''# Terrain drawing kit v2 — proposed format

This is an art specification for review, not an implemented game format.
The existing workshop still accepts only its original 128×64 five-piece sheet.
Do not import this 256×192 sheet into that importer.

## Draw at native size
8 columns × 6 rows. Each tile is 32×32 pixels, no padding or spacing.
Slot 00 is an opaque repeating floor. Slots 01–47 are wall connection shapes.
Use the construction PNG as a temporary reference layer; draw your art on a new
layer and hide the reference before export. The blank PNG is fully transparent.
The labelled guide is a reference, never a runtime atlas.

## What the tiles mean
North is screen up. Neighbour labels describe adjoining WALL, not floor.
Separate north/east/south/west artwork preserves top-left lighting; do not rotate
finished lit wall art to make another direction. Four-direction end caps,
horizontal/vertical thin walls, elbows, T junctions, cross junction variants,
inside corner combinations, isolated pillar and solid fill are all represented.
Diagonals matter only when both adjacent cardinal neighbours are walls. This
reduces 256 neighbourhoods to 47 wall patterns. Every pattern is indexed in JSON.

## Wall height and the old bottom rim
The old eight-pixel strip is a legacy renderer limitation, not the specification
for a proper south boundary wall. V2 uses a continuous wall cap/silhouette and
an eight-pixel visible face on exposed SOUTH-facing edges. The south boundary
still contains a wall body; it is not just a floating top strip. Side boundaries
have explicit left/right forms, plus caps and inside/outside joins.
All art stays within its 32×32 cell in this proposal. The inset silhouette is a
construction example, not a prescribed final stone texture. Collision continues
to use the full wall cell; drawings do not redefine walking or visibility.

## Layer order proposed
Floor underneath, wall cap/face above, props on their existing layer. Doors,
station sprites, torches and decals are separate assets, not connection tiles.
Lair, manor, dwarf and elf themes use the same slot meanings but different art.
Floor texture variants can follow once the structural set works.

## Professional references
Tiled: https://doc.mapeditor.org/en/stable/manual/terrain/
Godot: https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html
These describe matching corners/sides and neighbour metadata. Our 8×6 order,
wall depth and palette are project proposals, not their mandated atlas layout.

## Check before implementation
Review the room's four boundaries, doorway ends, L turns, T joins, one-cell
partitions and pillars. Then upgrade importer and shared renderer together,
retaining legacy projects. V2 game integration has not been done in this kit.
'''
(OUT/'README.md').write_text(readme)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wall tile drawing guide</title><style>
body{margin:0;background:#f4f0e5;color:#24372e;font:16px/1.5 system-ui}main{max-width:1000px;margin:auto;padding:20px}h1{margin:0}h2{margin-top:28px}p{max-width:80ch}img{max-width:100%;image-rendering:pixelated}.tg-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}.tg-cell{font:inherit;color:inherit;border:1px solid #7d8e80;background:#d9c89c;min-height:44px;padding:3px}.tg-cell img{width:100%;display:block}.tg-cell span{display:block}.tg-cell[aria-pressed=true]{outline:3px solid #355d3d}.tg-detail{display:flex;gap:20px;align-items:center;flex-wrap:wrap;min-height:126px}.tg-detail img{width:96px;background:#d9c89c}.tg-detail p{flex:1;min-width:180px}a{color:#245535}.tg-neighbours{display:grid;grid-template-columns:repeat(3,32px);gap:2px}.tg-neighbours span{text-align:center;background:#d9c89c;font-size:12px;line-height:30px}.tg-neighbours .wall{background:#91a294}.tg-note{border-left:4px solid #9f7334;padding-left:12px}@media(max-width:500px){main{padding:12px}.tg-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
</style><main><h1>Draw walls that actually join</h1><p>Proposed drawing sheet · 32 × 32 tiles · 8 columns × 6 rows</p><p class="tg-note">Expanded format for review. The current game still uses the old five-tile importer.</p>
<h2>1. See the pieces working together</h2><img alt="Assembled room showing full bottom boundary, side walls, doorway caps, thin partitions and pillars" src="SCENE"><p>Same wall pieces throughout: top and bottom boundaries, left and right sides, doorway ends, thin partitions, corners and pillars. This is a construction example, not the current game renderer.</p>
<h2>2. Inspect every drawing slot</h2><div class="tg-detail" aria-live="polite"><img id="tg-selected" alt="Selected wall construction shape"><div id="tg-neighbours" class="tg-neighbours" aria-label="Neighbouring wall cells"></div><p id="tg-description"></p></div><div class="tg-grid">CARDS</div>
<p>Cream shows the floor beneath transparent pixels; green is the wall cap; dark green is the visible face. The neighbour diagram describes surrounding <b>wall</b>, not floor. Its centre is the tile you are drawing.</p>
<h2>3. Draw in this sheet</h2><p>Use an 8 × 6 grid at native size: <b>256 × 192 pixels</b>, with no gaps. Slot 00 is floor; 01–47 are distinct wall connections. Draw on a new layer over the construction sheet, then hide the guide layer. Keep labels out of your exported PNG.</p>
<p><b>Bottom wall:</b> give it a continuous body and cap, rather than the old floating eight-pixel rim. In this proposal exposed south-facing edges have an eight-pixel face. Left and right walls have their own artwork; corner and end pieces complete them. Keep the lighting direction consistent instead of rotating finished wall art.</p>
<p>Use the same layout for the lair and each dungeon theme. Doors, stations, torches and other props stay separate. Extra floor textures can come after the structural set works.</p>
<h2>Reference sheet</h2><img alt="All 48 numbered drawing slots, with connection families" src="SHEET">
<p>Reference approach: <a href="https://doc.mapeditor.org/en/stable/manual/terrain/">Tiled terrain sets</a> and <a href="https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html">Godot terrain neighbours</a>. Their matching-edge and corner principles inform this guide; the 8 × 6 layout is our proposed format.</p></main><script>
const entries=ENTRIES;const buttons=[...document.querySelectorAll('.tg-cell')];function select(id){const e=entries[id];buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.id)===id)));document.getElementById('tg-selected').src=buttons[id].querySelector('img').src;document.getElementById('tg-description').textContent=String(id).padStart(2,'0')+' · '+e.name+(id?' — joins wall at '+(e.joins.join(', ')||'no neighbouring sides')+'. Paint this orientation; keep lighting fixed.':' — opaque repeating floor.');const n=document.getElementById('tg-neighbours');n.replaceChildren();[7,0,1,6,-1,2,5,4,3].forEach(bit=>{const s=document.createElement('span');const wall=id>0&&(bit===-1||Boolean(e.mask&(1<<bit)));s.className=wall?'wall':'';s.textContent=bit===-1?'HERE':wall?'W':'·';n.append(s)});}buttons.forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.id))));select(1);
</script></html>'''.replace('SCENE',uri(OUT/'terrain-v2-assembled-example.png')).replace('SHEET',uri(OUT/'terrain-v2-labelled-guide.png')).replace('CARDS',cards).replace('ENTRIES',json.dumps(entries))
(OUT/'terrain-drawing-guide.html').write_text(html)
deliver=ROOT.parent/'terrain-drawing-guide.html';deliver.write_text(html)
with zipfile.ZipFile(ROOT.parent/'terrain-drawing-kit-v2.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in OUT.iterdir():z.write(p,'terrain-drawing-kit-v2/'+p.name)
print('Built 48-slot guide and kit. All 256 neighbour masks map to 47 wall patterns.')
