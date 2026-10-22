from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re
site=Path(__file__).resolve().parent.parent/'docs'
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:
   assert a['id'] not in self.ids,('duplicate id',a['id']);self.ids.add(a['id'])
  for key in ['href','src']:
   if a.get(key):self.links.append((tag,a[key]))
count=0
for path in site.rglob('*.html'):
 p=Page();p.feed(path.read_text())
 for tag,ref in p.links:
  u=urlsplit(ref)
  if u.scheme or u.netloc or not u.path:continue
  assert not u.path.startswith('/'),('root-absolute link breaks project Pages',path,ref)
  dest=(path.parent/unquote(u.path)).resolve()
  assert dest.is_relative_to(site.resolve()),('outside site',path,ref)
  assert dest.exists(),('missing link',path,ref)
  if u.fragment and dest.suffix=='.html':
   target=Page();target.feed(dest.read_text());assert u.fragment in target.ids,('missing fragment',path,ref)
  count+=1
 for script in re.findall(r'<script[^>]*>([\s\S]*?)</script>',path.read_text()):
  if 'new WebSocket(' in script:raise AssertionError('Static page includes active multiplayer client: '+str(path))
assert (site/'.nojekyll').exists()
assert not (site/'server').exists() and not (site/'data').exists()
print(f'Checked {count} local asset/navigation references, project-relative paths, IDs and static-only entrypoints.')
