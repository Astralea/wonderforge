"""Read-only distribution inventory. Never emits secret values or local paths."""
from pathlib import Path
from collections import Counter
import gzip
import json
import re

root = Path('dist')
files = [path for path in root.rglob('*') if path.is_file()]
groups = Counter()
for path in files:
    groups[path.relative_to(root).parts[0]] += path.stat().st_size

secrets = []
for env in Path('.').glob('.env*'):
    for line in env.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#') or '=' not in line:
            continue
        name, value = line.split('=', 1)
        value = value.strip().strip('\"\'')
        if len(value) >= 12 and re.search(r'key|secret|token|password|credential', name, re.I):
            secrets.append(value.encode())

patterns = {
    'private-key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'github-token': re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}'),
    'openai-secret': re.compile(rb'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}'),
    'google-api-key': re.compile(rb'AIza[0-9A-Za-z_-]{35}'),
    'aws-access-id': re.compile(rb'AKIA[0-9A-Z]{16}'),
}
hits, local_path_files, source_map_files = [], [], []
for path in files:
    data = path.read_bytes()
    for kind, pattern in patterns.items():
        if pattern.search(data):
            hits.append({'type': kind, 'path': str(path)})
    if any(value in data for value in secrets):
        hits.append({'type': 'exact-local-secret-value', 'path': str(path)})
    if b'/Users/' in data or b'/home/' in data:
        local_path_files.append(str(path))
    if b'sourceMappingURL=' in data:
        source_map_files.append(str(path))

result = {
    'files': len(files),
    'bytes': sum(path.stat().st_size for path in files),
    'groups': dict(groups),
    'largest': [{'path': str(path), 'bytes': path.stat().st_size} for path in sorted(files, key=lambda path: path.stat().st_size, reverse=True)[:25]],
    'maps': [str(path) for path in files if path.suffix == '.map'],
    'privateNamed': [str(path) for path in files if any(part in path.parts for part in ['.git', 'artifacts', 'research', 'specs', 'scripts', 'tests', 'node_modules']) or path.name.startswith('.env') or path.suffix in ['.blend', '.blend1', '.py', '.pem', '.key', '.ts', '.tsx']],
    'symlinks': [str(path) for path in root.rglob('*') if path.is_symlink()],
    'jsGzip': [{'path': str(path), 'bytes': path.stat().st_size, 'gzipBytes': len(gzip.compress(path.read_bytes()))} for path in files if path.suffix == '.js'],
    'sensitivePatternHits': hits,
    'absoluteAuthoringPathFiles': local_path_files,
    'sourceMapMarkerFiles': source_map_files,
}
destination = Path(__file__).parent / 'dist-inventory.json'
destination.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'files': result['files'], 'bytes': result['bytes'], 'sensitivePatternHits': hits, 'report': str(destination)}, indent=2))
