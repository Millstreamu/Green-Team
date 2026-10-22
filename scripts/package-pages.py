from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
project=Path(__file__).resolve().parent.parent
site=project/'docs'
(site/'downloads').mkdir(exist_ok=True)
output=site/'downloads/drawing-templates.zip'
with ZipFile(output,'w',ZIP_DEFLATED) as z:
 for p in sorted((project/'workshop/templates').rglob('*')):
  if p.is_file() and 'terrain-v2' not in p.parts:z.write(p,str(p.relative_to(project/'workshop/templates')))
with ZipFile(output) as z:
 assert z.testzip() is None
print(f'Packaged {output.name}: {output.stat().st_size:,} bytes')
