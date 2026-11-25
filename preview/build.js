// Builds preview/preview.html: the real Index.html + Code.gs + Seed.gs, with a fake
// Google Sheet in browser storage. Run: node preview/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const server = read('Code.gs') + '\n' + read('Seed.gs');
const fns = ['getBootstrap', 'saveSettings', 'addModel', 'updateModel', 'addVehicle', 'addAccessory', 'adjustAccessory',
  'findCustomer', 'createInvoice', 'getInvoice', 'listInvoices', 'recordPayment', 'cancelInvoice', 'getMonthReport'];
const inject = `<script>
${read('preview/mock.js')}
var SERVER = (function () {
${server}
return { ${fns.join(', ')}, loadZelioModels: loadZelioModels, ensureSetup_: ensureSetup_, append_: append_, now_: now_ };
})();
(function seed() {
  if (MOCK_DB.Models && MOCK_DB.Models.length > 1) return;
  SERVER.ensureSetup_(); SERVER.loadZelioModels();
  [['Z007', 'Charcoal Black', 'DEMO-CH-0001', 'DEMO-MT-0001', 'DEMO-BT-0001'],
   ['Z007', 'Crimson Red', 'DEMO-CH-0002', 'DEMO-MT-0002', 'DEMO-BT-0002'],
   ['Z005', 'White', 'DEMO-CH-0003', 'DEMO-MT-0003', 'DEMO-BT-0003']].forEach(function (v) {
    SERVER.addVehicle({ ModelId: v[0], Color: v[1], ChassisNo: v[2], MotorNo: v[3], BatteryNo: v[4], Supplier: 'Demo supplier', CostPrice: '', Notes: 'Demo vehicle' });
  });
  SERVER.addAccessory({ Name: 'Helmet (demo)', HSN: '6506', GSTRate: 18, Qty: 10, CostPrice: 600, SalePrice: 1180 });
})();
var google = { script: { get run() {
  var ok = function () {}, bad = function (e) { console.error(e); };
  var p = new Proxy({}, { get: function (_, k) {
    if (k === 'withSuccessHandler') return function (f) { ok = f; return p; };
    if (k === 'withFailureHandler') return function (f) { bad = f; return p; };
    return function () { var a = arguments; setTimeout(function () {
      try { ok(JSON.parse(JSON.stringify(SERVER[k].apply(null, a)))); } catch (e) { bad(e); }
    }, 60); };
  } });
  return p;
} } };
</script>
<div style="background:#c6ff00;color:#0b0b0b;text-align:center;font:600 12px system-ui;padding:6px">
PREVIEW: data stays in this browser only. The real system saves to Google Sheets.
<a href="#" onclick="localStorage.removeItem(MOCK_KEY);location.reload();return false" style="color:#0b0b0b">Reset preview</a></div>
`;
const html = read('Index.html').replace('<body>', '<body>\n' + inject);
fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
// GitHub Pages serves docs/. Kept in its own folder: on Windows "index.html" and the
// app's "Index.html" are the same file, so never write index.html at the repo root.
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'index.html'), html);
console.log('wrote preview/preview.html and docs/index.html');
