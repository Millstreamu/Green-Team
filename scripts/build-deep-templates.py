"""Reproducible layered masonry sample and a small drawing sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random,json
out=Path(__file__).resolve().parents[1]/'workshop/templates/deep-walls'
out.mkdir(parents=True,exist_ok=True)
names=['floor','cap','face','edge_n','edge_e','edge_s','edge_w','inner_nw','inner_ne','inner_se','inner_sw','face_left','face_right']
labels=['Floor','Wall cap','Tall face','North trim','East trim','South trim','West trim','Inside NW','Inside NE','Inside SE','Inside SW','Face left end','Face right end','Spare','Spare','Spare']
tiles=[]
for i,name in enumerate(names):
    im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im);rng=random.Random(73+i)
    if name in ['floor','cap','face']:
        color={'floor':(163,151,114),'cap':(106,117,99),'face':(61,75,66)}[name]
        im.paste(color+(255,),(0,0,32,32));d=ImageDraw.Draw(im)
        for y in range(32):
            for x in range(32):
                delta=rng.choice([-5,-2,0,0,2,4]);d.point((x,y),fill=tuple(c+delta for c in color)+(255,))
        if name=='floor':
            d.line((0,0,31,0),fill='#bdaf85');d.line((0,31,31,31),fill='#746e53');d.line((31,0,31,31),fill='#746e53')
        if name=='face':
            for y in [0,8,16,24,31]:d.line((0,y,31,y),fill='#293a32');d.line((0,y+1,31,y+1),fill='#526052')
            for row in range(4):
                for x in ([0,16] if row%2==0 else [8,24]):d.line((x,row*8,x,row*8+7),fill='#293a32')
        if name=='cap':
            d.line((0,0,31,0),fill='#8c997e');d.line((0,31,31,31),fill='#56624f')
    elif name.startswith('edge_'):
        if name=='edge_n':d.rectangle((0,0,31,2),fill='#c7c7a1');d.line((0,3,31,3),fill='#919e7f')
        if name=='edge_s':d.rectangle((0,29,31,31),fill='#303f35');d.line((0,28,31,28),fill='#7f8d70')
        if name=='edge_w':d.rectangle((0,0,2,31),fill='#b6bf95');d.line((3,0,3,31),fill='#8d9b7c')
        if name=='edge_e':d.rectangle((29,0,31,31),fill='#394a3a');d.line((28,0,28,31),fill='#7e8d71')
    elif name.startswith('inner_'):
        east=name[-1]=='e';south=name[-2]=='s';x=26 if east else 0;y=26 if south else 0
        d.rectangle((x,y,x+5,y+5),fill='#34493a');d.line((x,y,x+5,y),fill='#acb58d')
    else:
        x=0 if name=='face_left' else 29;d.rectangle((x,0,x+2,31),fill='#9eaa85' if x==0 else '#293b30')
    tiles.append(im)
atlas=Image.new('RGBA',(128,128))
for i,t in enumerate(tiles):atlas.paste(t,(i%4*32,i//4*32))
atlas.save(out/'deep-walls-example-128x128.png')
Image.new('RGBA',(128,128)).save(out/'deep-walls-blank-128x128.png')
# Same geometry, brighter colours help see exactly which component was used.
test=atlas.copy()
for i,t in enumerate(tiles):
    tint=Image.new('RGBA',(32,32),['#b8bd78','#929a8a','#526653','#e8c080'][i%4]);tint.putalpha(t.getchannel('A'));test.paste(tint,(i%4*32,i//4*32))
test.save(out/'deep-walls-test-128x128.png')
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
guide=Image.new('RGB',(960,950),'#f1ecdd');g=ImageDraw.Draw(guide)
g.text((24,18),'DEEP WALLS · SMALL DRAWING SHEET',fill='#273c30',font=font(26))
g.text((24,58),'128 × 128 PNG · 4 × 4 cells · 32px per cell · 13 pieces + 3 spare',fill='#273c30',font=font(18))
for i in range(16):
    x=24+i%4*234;y=110+i//4*185
    for yy in range(0,128,16):
        for xx in range(0,128,16):g.rectangle((x+xx,y+yy,x+xx+15,y+yy+15),fill='#ddd7c5' if (xx+yy)//16%2 else '#c5c9b9')
    if i<len(tiles):
        t=tiles[i].resize((128,128),Image.Resampling.NEAREST);guide.paste(t,(x,y),t)
    g.rectangle((x,y,x+127,y+127),outline='#7b8b78')
    g.text((x,y+132),f'{i:02}  {labels[i]}',fill='#273c30',font=font(18))
g.text((24,855),'Full 32px face below cap. Trims and joins are transparent overlays.',fill='#273c30',font=font(19))
g.text((24,888),'Caps cut away over walkable floor; no extra drawing pieces needed.',fill='#273c30',font=font(18))
g.text((24,919),'The renderer combines these pieces into walls, corners, ends and pillars.',fill='#273c30',font=font(18))
guide.save(out/'deep-walls-drawing-guide.png')
(out/'deep-walls-layout.json').write_text(json.dumps({'tileSize':32,'width':128,'height':128,'columns':4,'wallFaceHeight':32,'capOffsetY':-32,'foregroundCutawayHeight':6,'pieces':[{'index':i,'name':n,'x':i%4*32,'y':i//4*32,'overlay':i>=3} for i,n in enumerate(names)]},indent=2))
print('Built deep-wall example, blank, diagnostic PNG, labelled guide and slot metadata.')
