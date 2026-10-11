#!/usr/bin/env python3
"""Create a deterministic, source-allowlisted ZIP for local DSH installation."""
import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
parser = argparse.ArgumentParser()
parser.add_argument('--require-license', action='store_true', help='Refuse packaging until maintainer has chosen a license')
args = parser.parse_args()

if args.require_license and (not (ROOT / 'LICENSE').is_file() or manifest.get('license') == 'UNLICENSED'):
    raise SystemExit('Refusing public release ZIP: LICENSE and SPDX package metadata required')

files = [
    'package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg',
    'locale/zh.json', 'locale/en.json',
    'README.md', 'README.en.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md',
    'docs/INSTALLATION.md', 'docs/TROUBLESHOOTING.md',
    'docs/PRIVACY.md', 'docs/COMPATIBILITY.md',
]
if (ROOT / 'LICENSE').is_file():
    files.append('LICENSE')

for file in files:
    path = ROOT / file
    if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(ROOT):
        raise SystemExit(f'Unsafe or missing release file: {file}')

out = ROOT / 'dist' / f'dsh-video-wallpaper-{manifest["version"]}.zip'
out.parent.mkdir(exist_ok=True)
with ZipFile(out, 'w') as archive:
    for file in sorted(files):
        info = ZipInfo('dsh-video-wallpaper/' + file, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (ROOT / file).read_bytes())
print(out)
print(f'{len(files)} files; no local wallpaper media included')
