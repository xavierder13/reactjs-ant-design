// ESLint rule: every antd <Modal> and <Drawer> is persistent — it closes
// only by its close icon, Cancel or its own buttons. Clicking outside is off
// app-wide (App.jsx ConfigProvider modal / drawer mask.closable), so one must
// not turn it back on (maskClosable / mask={{ closable: true }}); Esc can't
// be set app-wide, so each needs keyboard={false}. A Drawer with
// closable={false} must render its own close button.
const isFalse = (attr) => attr.value?.type === 'JSXExpressionContainer'
  && attr.value.expression.type === 'Literal' && attr.value.expression.value === false;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'antd Modals / Drawers close only by their close icon / Cancel (keyboard={false}, no mask closing)' },
    schema: [],
  },
  create(context) {
    const modals = new Map(); // local name → 'Modal' | 'Drawer' (antd)
    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'antd') return;
        for (const s of node.specifiers) {
          if (s.type === 'ImportSpecifier' && ['Modal', 'Drawer'].includes(s.imported.name)) modals.set(s.local.name, s.imported.name);
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || !modals.has(node.name.name)) return;
        const attrs = node.attributes.filter((a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier');
        const find = (name) => attrs.find((a) => a.name.name === name);
        const keyboard = find('keyboard');
        if (!keyboard || !isFalse(keyboard)) {
          context.report({ node, message: `<${modals.get(node.name.name)}> must have keyboard={false} — it closes only by its close icon or Cancel` });
        }
        const maskClosable = find('maskClosable');
        if (maskClosable && !isFalse(maskClosable)) {
          context.report({ node: maskClosable, message: 'Modals and drawers don\'t close on an outside click — remove maskClosable' });
        }
        const mask = find('mask');
        const closable = mask?.value?.expression?.properties?.find((p) => p.key?.name === 'closable');
        if (closable && !(closable.value.type === 'Literal' && closable.value.value === false)) {
          context.report({ node: mask, message: 'Modals and drawers don\'t close on an outside click — mask closable must stay false' });
        }
      },
    };
  },
};
