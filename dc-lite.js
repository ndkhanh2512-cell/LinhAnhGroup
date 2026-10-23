/* dc-lite: bộ dựng giao diện nhỏ cho các màn hình demo (thay cho runtime của Claude Design) */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch); if (this.__render) this.__render(); }
    forceUpdate() { if (this.__render) this.__render(); }
  }
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let v = scope;
    for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function whole(str) { const m = str.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/); return m ? m[1] : null; }
  function proc(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = lookup(whole(node.getAttribute('list')) || '', scope) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((item, i) => {
        const s = Object.assign(Object.create(scope), { [as]: item, $index: i });
        node.childNodes.forEach((c) => proc(c, s, out));
      });
      return;
    }
    if (tag === 'sc-if') {
      if (lookup(whole(node.getAttribute('value')) || '', scope)) node.childNodes.forEach((c) => proc(c, scope, out));
      return;
    }
    const ns = node.namespaceURI;
    const el = ns && ns !== 'http://www.w3.org/1999/xhtml' ? document.createElementNS(ns, node.tagName) : document.createElement(tag);
    for (const a of Array.from(node.attributes)) {
      const name = a.name, val = a.value;
      if (/^on[a-z]+$/.test(name)) {
        const fn = lookup(whole(val) || '', scope);
        let ev = name.slice(2);
        if (ev === 'change' && (tag === 'input' || tag === 'textarea')) ev = 'input';
        if (typeof fn === 'function') el.addEventListener(ev, (e) => fn(e));
        continue;
      }
      if (name === 'value' && (tag === 'input' || tag === 'textarea')) { el.value = interp(val, scope); el.setAttribute(name, interp(val, scope)); continue; }
      el.setAttribute(name, val.indexOf('{{') >= 0 ? interp(val, scope) : val);
    }
    const kids = node.content ? node.content.childNodes : node.childNodes;
    kids.forEach((c) => proc(c, scope, el));
    out.appendChild(el);
  }
  function mount(Component, tplId, rootId) {
    const tpl = document.getElementById(tplId || 'tpl');
    const root = document.getElementById(rootId || 'app');
    const inst = new Component({});
    inst.__render = function () {
      const act = document.activeElement;
      const keep = act && act.id && root.contains(act) ? { id: act.id, s: act.selectionStart, e: act.selectionEnd } : null;
      const vals = (inst.renderVals ? inst.renderVals() : {}) || {};
      const frag = document.createDocumentFragment();
      tpl.content.childNodes.forEach((c) => proc(c, vals, frag));
      root.replaceChildren(frag);
      if (keep) {
        const el = document.getElementById(keep.id);
        if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (err) {} }
      }
    };
    if (inst.componentDidMount) setTimeout(() => inst.componentDidMount(), 0);
    inst.__render();
  }
  window.DCLogic = DCLogic;
  window.dcMount = mount;
})();
