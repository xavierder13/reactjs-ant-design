import json
vue = json.load(open('vue_out.json')); rct = json.load(open('react_out.json'))
IGNORE_KEYS = {'vuetifyColor', 'isAllTime', 'backgroundColor', 'borderColor', 'borderWidth', 'label', 'fill', 'lineTension', 'pointRadius', 'type', 'yAxisID'}
def norm(v):
    if isinstance(v, dict): return {k: norm(x) for k, x in v.items() if k not in IGNORE_KEYS}
    if isinstance(v, list): return [norm(x) for x in v]
    if isinstance(v, str) and v.startswith('mdi-'): return v[4:]
    return v
total = fails = 0
for sv, sr in zip(vue, rct):
    bad = []
    keys = sorted(set(sv['result']) | set(sr['result']))
    for k in keys:
        total += 1
        if k not in sr['result']: bad.append(f'{k}: missing in React'); continue
        if k not in sv['result']: bad.append(f'{k}: extra in React'); continue
        if norm(sv['result'][k]) != norm(sr['result'][k]): bad.append(f'{k}: DIFFERS\n      vue  : {json.dumps(norm(sv["result"][k]))[:300]}\n      react: {json.dumps(norm(sr["result"][k]))[:300]}')
    for k in sorted(set(sv['charts']) | set(sr['charts'])):
        total += 1
        a, b = sv['charts'].get(k), sr['charts'].get(k)
        if k.endswith('embudoRows'):
            same = norm(a) == norm(b)
        else:
            same = a is not None and b is not None and [ (c['labels'], [d['data'] for d in c['datasets']]) for c in a ] == [ (c['labels'], [d['data'] for d in c['datasets']]) for c in b ]
        if not same: bad.append(f'chart {k}: DIFFERS\n      vue  : {json.dumps(a)[:300]}\n      react: {json.dumps(b)[:300]}')
    fails += len(bad)
    print(f"{'PASS' if not bad else 'FAIL'}  {sv['name']}: {len(keys)} computed values + {len(sv['charts'])} chart datasets compared" + ('' if not bad else '\n    ' + '\n    '.join(bad)))
print(f"\n{total - fails}/{total} comparisons identical")
