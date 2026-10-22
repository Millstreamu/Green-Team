"""Package the standalone workshop, drawing templates and reproducible source."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

project = Path(__file__).resolve().parent.parent
output = project / 'build' / 'green-team-workshop-tidy-kit.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    archive.write(project / 'build' / 'green-team-room-layouts-playtest.html', 'green-team-workshop/room-layouts-playtest.html')
    archive.write(project / 'build' / 'green-team-surface-loot-playtest.html', 'green-team-workshop/surface-loot-playtest.html')
    archive.write(project / 'build' / 'green-team-room-types-playtest.html', 'green-team-workshop/room-types-playtest.html')
    archive.write(project / 'build' / 'green-team-door-guard-playtest.html', 'green-team-workshop/door-guard-playtest.html')
    archive.write(project / 'workshop/workshop.html', 'green-team-workshop/workshop.html')
    archive.write(project / 'workshop/README.md', 'green-team-workshop/README.md')
    for path in (project / 'workshop/templates').rglob('*'):
        if path.is_file() and 'terrain-v2' not in path.parts:
            archive.write(path, 'green-team-workshop/templates/' + str(path.relative_to(project / 'workshop/templates')))
    for name in ['index.html', 'play.html', 'admin.html', 'package.json', 'package-lock.json', 'AGENTS.md', 'START-HERE.txt']:
        archive.write(project / name, 'green-team-workshop/source/' + name)
    for folder in ['src', 'server', 'assets', 'scripts', 'docs', 'tests', 'workshop']:
        for path in (project / folder).rglob('*'):
            if path.is_file() and 'terrain-v2' not in path.parts and '__pycache__' not in path.parts and path.name not in ['workshop.html', 'game-bundle.js']:
                archive.write(path, 'green-team-workshop/source/' + str(path.relative_to(project)))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert archive.read('green-team-workshop/workshop.html') == (project / 'workshop/workshop.html').read_bytes()
    assert archive.read('green-team-workshop/templates/tileset-test-128x64.png') == (project / 'workshop/templates/tileset-test-128x64.png').read_bytes()
    assert archive.read('green-team-workshop/templates/lair/potion-blank.png') == (project / 'workshop/templates/lair/potion-blank.png').read_bytes()
    assert archive.read('green-team-workshop/templates/lair/terrain-blank.png') == (project / 'workshop/templates/lair/terrain-blank.png').read_bytes()
    print(f'Verified {len(archive.namelist())} files; {output.stat().st_size:,} bytes: {output.name}')
