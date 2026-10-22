from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
p=Path(__file__).resolve().parent/'templates'
Image.new('RGBA',(128,64)).save(p/'tileset-blank-128x64.png')
ref=Image.open(p.parent.parent/'assets/human/GreenTeam-tileset.png').convert('RGBA')
ref.save(p/'tileset-example-128x64.png')
# Diagnostic colours preserve the original alpha silhouettes exactly. This
# exposes flipped/cropped pieces without introducing a different wall shape.
diagnostic=Image.new('RGBA',(128,64))
palette=['#28cfa4','#f18a35','#dc58bd','#579bfa','#f4df55']
for i,color in enumerate(palette):
 x,y=i%4*32,i//4*32
 tile=Image.new('RGBA',(32,32),color);t=ImageDraw.Draw(tile)
 for yy in range(0,32,8):
  for xx in range(0,32,8):
   if (xx+yy)//8%2==0:t.rectangle((xx,yy,xx+3,yy+3),fill='#ffffff')
 # The stripe is always at the source tile's right edge; a left-edge stripe
 # in the preview therefore identifies a mirrored piece.
 t.rectangle((29,0,31,31),fill='#17222b')
 t.text((12,0 if i==4 else 12),str(i+1),font=ImageFont.load_default(),fill='#111923')
 tile.putalpha(ref.crop((x,y,x+32,y+32)).getchannel('A'))
 diagnostic.paste(tile,(x,y))
diagnostic.save(p/'tileset-test-128x64.png')
im=Image.new('RGB',(960,570),'#e8e5d3');d=ImageDraw.Draw(im)
f='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try: title=ImageFont.truetype(f,26);font=ImageFont.truetype(f,18);tiny=ImageFont.truetype(f,15)
except: title=font=tiny=ImageFont.load_default()
d.text((26,18),'TERRAIN SHEET · 128 × 64 px · five 32 × 32 tiles',font=title,fill='#283c2e')
labels=['1  Floor','2  Top wall','3  Side wall','4  Corner','5  Bottom rim','Unused','Unused','Unused']
for i,label in enumerate(labels):
 col=i%4;row=i//4;x=26+col*230;y=76+row*220
 for yy in range(0,160,16):
  for xx in range(0,160,16):d.rectangle((x+xx,y+yy,x+xx+15,y+yy+15),fill='#bec3b6' if (xx+yy)//16%2 else '#d8dccc')
 if i<5:
  tile=ref.crop((col*32,row*32,col*32+32,row*32+32)).resize((160,160),Image.Resampling.NEAREST)
  im.paste(tile,(x,y),tile)
 d.rectangle((x,y,x+159,y+159),outline='#516448',width=2)
 d.text((x,y+168),label,font=font,fill='#283c2e')
d.text((26,522),'Paint only the PNG template. These labels and borders are a guide, not game pixels.',font=tiny,fill='#283c2e')
im.save(p/'tileset-drawing-guide.png')
# Exact item footprints are generated from the shared item registry, not guessed.
import json
manifest=p/'item-manifest.json'
if manifest.exists():
 items=p/'items';items.mkdir(exist_ok=True)
 for ident,item in json.loads(manifest.read_text()).items():
  w,h=item['width'],item['height'];Image.new('RGBA',(w,h)).save(items/f'{ident}-blank.png')
  guide=Image.new('RGB',(max(270,w*4+32),h*4+80),'#e8e5d3');g=ImageDraw.Draw(guide)
  g.text((12,6),f"{item['name']} · {w} × {h}",font=tiny,fill='#283c2e')
  for x,y in item['cells']:
   x0,y0=16+x*128,40+y*128;g.rectangle((x0,y0,x0+127,y0+127),fill='#bec3b6',outline='#516448',width=2)
  g.text((12,guide.height-25),'Draw within shaded footprint.',font=tiny,fill='#283c2e')
  guide.save(items/f'{ident}-guide.png')

lair_manifest=p/'lair-manifest.json'
if lair_manifest.exists():
 folder=p/'lair';folder.mkdir(exist_ok=True)
 Image.new('RGBA',(128,64)).save(folder/'terrain-blank.png')
 diagnostic.save(folder/'terrain-test.png');im.save(folder/'terrain-guide.png')
 colors=['#a9cf63','#d4a263','#ed9152','#70b9d6','#a6adbf','#b38ae0','#94a28c']
 for i,(ident,slot) in enumerate(json.loads(lair_manifest.read_text()).items()):
  w,h=slot['width'],slot['height'];ax,ay=slot['anchorX'],slot['anchorY']
  Image.new('RGBA',(w,h)).save(folder/f'{ident}-blank.png')
  sample=Image.new('RGBA',(w,h));s=ImageDraw.Draw(sample)
  s.rounded_rectangle((2,max(2,h//4),w-3,h-3),radius=3,fill=colors[i],outline='#edf0d5',width=2)
  s.line((ax,h//4,ax,h-3),fill='#243a34',width=2)
  s.text((4,h//2),str(i+1),font=ImageFont.load_default(),fill='#243a34')
  sample.save(folder/f'{ident}-test.png')
  guide=Image.new('RGB',(410,h*4+130),'#e8e5d3');g=ImageDraw.Draw(guide)
  g.text((12,8),slot['name'],font=font,fill='#283c2e')
  g.text((12,36),f'{w} × {h} transparent PNG',font=tiny,fill='#283c2e')
  for yy in range(0,h*4,16):
   for xx in range(0,w*4,16):g.rectangle((16+xx,68+yy,31+xx,83+yy),fill='#c0c8b5' if (xx+yy)//16%2 else '#d8dccc')
  for x in range(0,w+1,32):g.line((16+x*4,68,16+x*4,68+h*4),fill='#738967',width=2)
  for y in range(0,h+1,32):g.line((16,68+y*4,16+w*4,68+y*4),fill='#738967',width=2)
  g.line((16+ax*4-12,68+ay*4,16+ax*4+12,68+ay*4),fill='#327baa',width=3)
  g.line((16+ax*4,68+ay*4-12,16+ax*4,68+ay*4+12),fill='#327baa',width=3)
  g.text((12,guide.height-42),'Blue cross = interaction anchor.',font=tiny,fill='#283c2e')
  g.text((12,guide.height-23),'Paint the blank PNG, not this guide.',font=tiny,fill='#283c2e')
  guide.save(folder/f'{ident}-guide.png')
