// ESLint rule: flag AntD props the INSTALLED antd version marks deprecated
// (`/** @deprecated … */` on a `<Component>Props` interface in its .d.ts
// files), e.g. `<Tag bordered={false}>` → `variant="filled"` on antd 6.
// The list is read from node_modules/antd at lint time, so an antd upgrade
// brings its new deprecations into `npm run lint` with no change here.
// Covers `<Tag>`, renamed imports (`import { Tag as T }`) and members
// (`<Typography.Text>`, `<Form.Item>`, `<Tag.CheckableTag>`). Not covered:
// spread props, components pulled out by destructuring
// (`const { Text } = Typography`), and whole-component deprecations, which
// antd only warns about at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let cache = null;

// Matching `}` for the `{` at `open` (type bodies have nested braces).
const closeBrace = (src, open) => {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i;
  }
  return src.length;
};

// Only the interface's own members: nested object types are skipped.
const topLevel = (body) => {
  let depth = 0;
  let out = '';
  for (const ch of body) {
    if (ch === '{') depth++;
    if (depth === 0) out += ch;
    if (ch === '}') depth--;
  }
  return out;
};

const load = () => {
  if (cache) return cache;
  const pkgPath = require.resolve('antd/package.json');
  const root = path.join(path.dirname(pkgPath), 'es');
  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  // name → { folder, extends: [names], props: { prop: message } }
  const interfaces = new Map();

  const walk = (dir, folder) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, folder || entry.name); continue; }
      if (!entry.name.endsWith('.d.ts')) continue;
      const src = fs.readFileSync(full, 'utf8');
      const re = /interface\s+(\w+Props)\b(?:<[^{]*?>)?([^{]*)\{/g;
      let m;
      while ((m = re.exec(src))) {
        const open = m.index + m[0].length - 1;
        const body = topLevel(src.slice(open + 1, closeBrace(src, open)));
        const props = {};
        const dep = /\/\*\*((?:(?!\*\/)[\s\S])*?@deprecated((?:(?!\*\/)[\s\S])*?))\*\/\s*(?:readonly\s+)?['"]?(\w+)['"]?\??\s*:/g;
        let d;
        while ((d = dep.exec(body))) {
          props[d[3]] = d[2].replace(/\s*\*\s*/g, ' ').replace(/\s+/g, ' ').trim();
        }
        const ext = /extends\s+([\s\S]*)/.exec(m[2]);
        const bases = ext ? [...ext[1].matchAll(/\b(\w+Props)\b/g)].map((x) => x[1]) : [];
        const prev = interfaces.get(m[1]);
        // keep the component folder's own interface over a same-named helper
        if (!prev || (!Object.keys(prev.props).length && Object.keys(props).length)) {
          interfaces.set(m[1], { folder, bases, props });
        }
      }
    }
  };
  walk(root, '');

  const resolved = new Map();
  const resolve = (name, seen = new Set()) => {
    if (resolved.has(name)) return resolved.get(name);
    const it = interfaces.get(name);
    if (!it || seen.has(name)) return {};
    seen.add(name);
    const all = {};
    for (const base of it.bases) Object.assign(all, resolve(base, seen));
    Object.assign(all, it.props);
    resolved.set(name, all);
    return all;
  };

  cache = { version, deprecatedFor: (component) => resolve(`${component}Props`) };
  return cache;
};

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow props the installed antd version marks @deprecated' },
    schema: [],
  },
  create(context) {
    let antd;
    try { antd = load(); } catch { return {}; }
    const imported = new Map(); // local name → antd export name

    const componentOf = (name) => {
      if (name.type === 'JSXIdentifier') return imported.get(name.name) ? [imported.get(name.name)] : null;
      if (name.type === 'JSXMemberExpression' && name.object.type === 'JSXIdentifier' && imported.has(name.object.name)) {
        const obj = imported.get(name.object.name);
        return [`${obj}${name.property.name}`, name.property.name];
      }
      return null;
    };

    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'antd') return;
        for (const s of node.specifiers) {
          if (s.type === 'ImportSpecifier') imported.set(s.local.name, s.imported.name);
        }
      },
      JSXOpeningElement(node) {
        const candidates = componentOf(node.name);
        if (!candidates) return;
        const component = candidates.find((c) => Object.keys(antd.deprecatedFor(c)).length) || candidates[0];
        const deprecated = antd.deprecatedFor(component);
        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
          const hint = deprecated[attr.name.name];
          if (hint === undefined) continue;
          context.report({
            node: attr,
            message: `antd ${antd.version}: <${context.sourceCode.getText(node.name)}> \`${attr.name.name}\` is deprecated${hint ? ` — ${hint}` : ''}`,
          });
        }
      },
    };
  },
};
