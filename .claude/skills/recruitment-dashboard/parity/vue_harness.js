// Runs vueportal's REAL Dashboard.vue computed + component chart methods on the fixture.
const fs = require('fs'); const Module = require('module'); const path = require('path');
const VP = '/var/www/html/resources/js/views/dashboard';
const captured = [];
class ChartStub { constructor(ctx, config) { captured.push(config); this.config = config; } destroy() {} }
function loadVue(file) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.slice(src.indexOf('<script>') + 8, src.indexOf('</script>'));
  src = src.replace(/^import .*$/gm, (line) => {
    if (/import moment/.test(line)) return 'const moment = require("/var/www/html/node_modules/moment");';
    if (/import Chart/.test(line)) return 'const Chart = __ChartStub;';
    const named = line.match(/import\s*\{\s*([^}]+)\}/);
    if (named) return named[1].split(',').map((n) => `const ${n.trim()} = () => {};`).join(' ');
    const def = line.match(/import\s+(\w+)/);
    return def ? `const ${def[1]} = {};` : '';
  });
  src = src.replace('export default {', 'module.exports.def = {');
  src += '\nmodule.exports.helpers = { normalizeApiApplicantRow: typeof normalizeApiApplicantRow !== "undefined" ? normalizeApiApplicantRow : null };';
  const m = new Module(file); m.paths = Module._nodeModulePaths('/var/www/html');
  global.__ChartStub = ChartStub;
  m._compile(src, file);
  return m.exports;
}
const dash = loadVue(`${VP}/Dashboard.vue`).def;
const comps = Object.fromEntries(['ApplicantDistribution', 'SourcingMetrics', 'RecruitmentFunnel'].map((c) => [c, loadVue(`${VP}/components/${c}.vue`).def]));
const fixture = JSON.parse(fs.readFileSync('fixture.json', 'utf8'));
const scenarios = JSON.parse(fs.readFileSync('scenarios.json', 'utf8'));

function makeCtx(def, data) {
  const ctx = Object.assign({ $nextTick: () => {}, $refs: {}, $emit: () => {} }, data);
  for (const [name, fn] of Object.entries(def.computed || {})) {
    if (typeof fn !== 'function') continue; // mapState/mapGetters
    Object.defineProperty(ctx, name, { get: () => fn.call(ctx), configurable: true });
  }
  for (const [name, fn] of Object.entries(def.methods || {})) ctx[name] = fn.bind(ctx);
  return ctx;
}
const fakeCanvas = () => ({ getContext: () => ({}), height: 0 });

const out = [];
for (const sc of scenarios) {
  const data = dash.data();
  const ctx = makeCtx(dash, data);
  ctx.loadApplicantData(fixture.job_applicants);
  ctx.positions = fixture.positions; ctx.branches = fixture.branches;
  ctx.applicantFilters = sc.filters;
  if (sc.range !== 'default') ctx.analyticsDateRange = sc.range;
  const names = Object.keys(dash.computed).filter((n) => typeof dash.computed[n] === 'function');
  const result = {};
  for (const n of names) result[n] = ctx[n];
  // components: capture the chart data their render methods build
  const charts = {};
  const run = (name, props, methods) => {
    const c = makeCtx(comps[name], Object.assign(comps[name].data ? comps[name].data() : {}, props));
    new Proxy({}, {});
    c.$refs = new Proxy({}, { get: () => fakeCanvas() });
    for (const m of methods) { captured.length = 0; c[m](); charts[`${name}.${m}`] = captured.map((cfg) => cfg.data); }
    return c;
  };
  run('ApplicantDistribution', { dateFilteredApplicants: result.dateFilteredApplicants, hiredApplicants: result.hiredApplicants }, ['renderMonthlyTrendChart', 'renderAgeGroupChart']);
  run('SourcingMetrics', { dateFilteredApplicants: result.dateFilteredApplicants, hiredApplicants: result.hiredApplicants, sourcingChannelEfficiency: result.sourcingChannelEfficiency }, ['renderSrcAppChart', 'renderSrcHireChart', 'renderSrcEfficiencyChart']);
  const f = run('RecruitmentFunnel', { recruitmentStageAnalysisRows: result.recruitmentStageAnalysisRows, avgDaysPerStage: result.avgDaysPerStage, recruitmentFunnelRows: result.recruitmentFunnelRows, totalHiredAllTime: result.totalHiredAllTime }, []);
  charts['RecruitmentFunnel.embudoRows'] = f.embudoRows;
  out.push({ name: sc.name, dateRange: ctx.analyticsDateRange, result, charts });
}
fs.writeFileSync('vue_out.json', JSON.stringify(out));
console.log('vue harness ok:', out.map((o) => `${o.name}: ${o.result.dateFilteredApplicants.length} applicants`).join(' | '));
