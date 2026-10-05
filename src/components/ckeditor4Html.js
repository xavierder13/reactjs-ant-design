// Rewrites CKEditor 5 output into the exact HTML the careers portal's
// CKEditor 4 (4.17.2 standard-all, default config) saves, so text edited in
// this app and in the portal is byte-identical (and renders the same on the
// careers site). A port of CKEditor 4's htmlwriter formatting rules and its
// entities plugin, plus the CKEditor 5 → 4 element differences:
// - CKEditor 5 adds data-list-item-id to <li>; writes <i> for italic; wraps
//   tables in <figure class="table">; adds rel to links.
// - CKEditor 4 indents/breaks block tags, self-closes <br /> and <hr />,
//   sorts attributes, and encodes characters as named entities.
// Verified against CKEditor 4's own getData() in a real browser on every
// stored position text plus typical edits. No imports: keep it standalone.

// CKEditor 4 dtd groups used by htmlwriter (subset CKEditor 5 can produce).
const BLOCK = ['address', 'blockquote', 'div', 'dl', 'fieldset', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'menu', 'ol', 'p', 'pre', 'table', 'ul'];
const LIST_ITEM = ['li', 'dd', 'dt'];
const TABLE_CONTENT = ['caption', 'col', 'colgroup', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr'];
// Elements whose dtd allows text ('#'): no child indent, no break before close.
const ALLOWS_TEXT = ['address', 'blockquote', 'caption', 'dd', 'div', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'p', 'pre', 'td', 'th', 'fieldset'];
const VOID = ['br', 'hr', 'img', 'col', 'input', 'wbr'];

const RULES = (() => {
  const rules = {};
  [...BLOCK, ...LIST_ITEM, ...TABLE_CONTENT].forEach((tag) => {
    const text = ALLOWS_TEXT.includes(tag);
    rules[tag] = {
      indent: !text,
      breakBeforeOpen: true,
      breakBeforeClose: !text,
      breakAfterClose: true,
      needsSpace: BLOCK.includes(tag) && !LIST_ITEM.includes(tag),
    };
  });
  rules.br = { breakAfterOpen: true };
  rules.pre = { ...rules.pre, breakAfterOpen: true, indent: false };
  return rules;
})();

// CKEditor 4 entities plugin: htmlbase + entities + entities_latin +
// entities_greek, and entities_additional '#39'.
const ENTITY_NAMES = (
  'quot,iexcl,cent,pound,curren,yen,brvbar,sect,uml,copy,ordf,laquo,not,shy,reg,macr,deg,plusmn,sup2,sup3,acute,micro,para,middot,'
  + 'cedil,sup1,ordm,raquo,frac14,frac12,frac34,iquest,times,divide,fnof,bull,hellip,prime,Prime,oline,frasl,weierp,image,real,trade,'
  + 'alefsym,larr,uarr,rarr,darr,harr,crarr,lArr,uArr,rArr,dArr,hArr,forall,part,exist,empty,nabla,isin,notin,ni,prod,sum,minus,lowast,'
  + 'radic,prop,infin,ang,and,or,cap,cup,int,there4,sim,cong,asymp,ne,equiv,le,ge,sub,sup,nsub,sube,supe,oplus,otimes,perp,sdot,lceil,'
  + 'rceil,lfloor,rfloor,lang,rang,loz,spades,clubs,hearts,diams,circ,tilde,ensp,emsp,thinsp,zwnj,zwj,lrm,rlm,ndash,mdash,lsquo,'
  + 'rsquo,sbquo,ldquo,rdquo,bdquo,dagger,Dagger,permil,lsaquo,rsaquo,euro,'
  + 'Agrave,Aacute,Acirc,Atilde,Auml,Aring,AElig,Ccedil,Egrave,Eacute,Ecirc,Euml,Igrave,Iacute,Icirc,Iuml,ETH,Ntilde,Ograve,Oacute,Ocirc,'
  + 'Otilde,Ouml,Oslash,Ugrave,Uacute,Ucirc,Uuml,Yacute,THORN,szlig,agrave,aacute,acirc,atilde,auml,aring,aelig,ccedil,egrave,eacute,'
  + 'ecirc,euml,igrave,iacute,icirc,iuml,eth,ntilde,ograve,oacute,ocirc,otilde,ouml,oslash,ugrave,uacute,ucirc,uuml,yacute,thorn,'
  + 'yuml,OElig,oelig,Scaron,scaron,Yuml,'
  + 'Alpha,Beta,Gamma,Delta,Epsilon,Zeta,Eta,Theta,Iota,Kappa,Lambda,Mu,Nu,Xi,Omicron,Pi,Rho,Sigma,Tau,Upsilon,Phi,Chi,Psi,Omega,alpha,'
  + 'beta,gamma,delta,epsilon,zeta,eta,theta,iota,kappa,lambda,mu,nu,xi,omicron,pi,rho,sigmaf,sigma,tau,upsilon,phi,chi,psi,omega,thetasym,'
  + 'upsih,piv'
).split(',');

let entityByChar = null;
const entityTable = () => {
  if (!entityByChar) {
    entityByChar = { ' ': '&nbsp;', '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;' };
    const decoder = document.createElement('textarea');
    ENTITY_NAMES.forEach((name) => {
      decoder.innerHTML = `&${name};`;
      if (decoder.value.length === 1 && !entityByChar[decoder.value]) entityByChar[decoder.value] = `&${name};`;
    });
  }
  return entityByChar;
};

const encodeText = (text) => {
  const table = entityTable();
  return text.replace(/[\s\S]/g, (ch) => table[ch] || ch);
};

// CKEditor.tools.htmlEncodeAttr
const encodeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// CKEditor 5 → CKEditor 4 element differences, applied to the parsed DOM.
const toCkeditor4Dom = (root) => {
  root.querySelectorAll('[data-list-item-id]').forEach((el) => el.removeAttribute('data-list-item-id'));
  root.querySelectorAll('a[rel]').forEach((el) => el.removeAttribute('rel'));
  root.querySelectorAll('figure.table').forEach((figure) => figure.replaceWith(...figure.childNodes));
  root.querySelectorAll('i').forEach((el) => {
    const em = document.createElement('em');
    [...el.attributes].forEach((attr) => em.setAttribute(attr.name, attr.value));
    em.append(...el.childNodes);
    el.replaceWith(em);
  });
};

// CKEditor 4 htmlwriter (basicwriter + htmlwriter rules).
const write = (root) => {
  const out = [];
  let indentation = '';
  let indent = false;
  let afterCloser = false;
  let needsSpace = false;
  let inPre = false;

  const lineBreak = () => { if (!inPre && out.length) out.push('\n'); indent = true; };
  const doIndent = () => { if (!inPre && indentation) out.push(indentation); indent = false; };

  const openTag = (tag, attrs, selfClose) => {
    const rules = RULES[tag];
    if (afterCloser && rules?.needsSpace && needsSpace) out.push('\n');
    if (indent) doIndent();
    else if (rules?.breakBeforeOpen) { lineBreak(); doIndent(); }
    out.push('<', tag);
    afterCloser = false;
    attrs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .forEach(({ name, value }) => out.push(' ', name, '="', encodeAttr(value), '"'));
    if (selfClose) {
      out.push(' />');
      if (rules?.breakAfterClose) needsSpace = rules.needsSpace;
    } else {
      out.push('>');
      if (rules?.indent) indentation += '\t';
    }
    if (rules?.breakAfterOpen) lineBreak();
    if (tag === 'pre') inPre = true;
  };

  const closeTag = (tag) => {
    const rules = RULES[tag];
    if (rules?.indent) indentation = indentation.slice(1);
    if (indent) doIndent();
    else if (rules?.breakBeforeClose) { lineBreak(); doIndent(); }
    out.push('</', tag, '>');
    if (tag === 'pre') inPre = false;
    if (rules?.breakAfterClose) { lineBreak(); needsSpace = rules.needsSpace; }
    afterCloser = true;
  };

  const text = (value) => {
    let html = encodeText(value);
    if (indent) {
      doIndent();
      if (!inPre) html = html.replace(/^[ \t\n\r]+/, '');
    }
    out.push(html);
  };

  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        // CKEditor 4's parser collapses whitespace outside <pre>.
        const value = inPre ? child.nodeValue : child.nodeValue.replace(/[\t\r\n ]{2,}|[\t\r\n]/g, ' ');
        if (value) text(value);
      } else if (child.nodeType === 1) {
        const tag = child.nodeName.toLowerCase();
        const attrs = [...child.attributes].map((a) => ({ name: a.name, value: a.value }));
        if (VOID.includes(tag)) {
          openTag(tag, attrs, true);
        } else {
          openTag(tag, attrs, false);
          walk(child);
          closeTag(tag);
        }
      }
    });
  };

  walk(root);
  return out.join('');
};

export const toCkeditor4Html = (html) => {
  if (!html) return '';
  const root = document.createElement('div');
  root.innerHTML = html;
  toCkeditor4Dom(root);
  return write(root);
};
