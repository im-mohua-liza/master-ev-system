/**
 * Master EV - showroom system (stock, GST billing, normal billing, reports).
 *
 * The Google Sheet this script is attached to IS the database. Every bill,
 * vehicle and stock change is written straight into its tabs, so the sheet
 * always holds the full history.
 */

const SHEETS = {
  Settings:     ['Key', 'Value'],
  Models:       ['ModelId', 'Brand', 'Model', 'Variant', 'HSN', 'GSTRate', 'CostPrice', 'SalePrice', 'Active', 'CreatedAt'],
  Stock:        ['StockId', 'ModelId', 'ModelName', 'Color', 'ChassisNo', 'MotorNo', 'BatteryNo', 'ChargerNo', 'Supplier',
                 'PurchaseInvoiceNo', 'PurchaseDate', 'CostPrice', 'Status', 'SoldInvoiceNo', 'SoldDate', 'Notes', 'CreatedAt'],
  Accessories:  ['ItemId', 'Name', 'HSN', 'GSTRate', 'Qty', 'CostPrice', 'SalePrice', 'CreatedAt', 'UpdatedAt'],
  StockLog:     ['Time', 'Kind', 'Ref', 'Change', 'Note'],
  Customers:    ['Phone', 'Name', 'Address', 'GSTIN', 'State', 'StateCode', 'FirstSeen', 'LastInvoiceNo'],
  Invoices:     ['InvoiceNo', 'BillType', 'Date', 'CustomerName', 'Phone', 'Address', 'CustomerGSTIN', 'PlaceOfSupply',
                 'StateCode', 'Taxable', 'CGST', 'SGST', 'IGST', 'RoundOff', 'Total', 'PaymentMode', 'AmountPaid',
                 'Balance', 'Status', 'Notes', 'CreatedAt'],
  InvoiceItems: ['InvoiceNo', 'Line', 'ItemType', 'RefId', 'Description', 'ChassisNo', 'MotorNo', 'BatteryNo', 'HSN',
                 'Qty', 'UnitPrice', 'GSTRate', 'Taxable', 'CGST', 'SGST', 'IGST', 'LineTotal']
};

// Columns kept as plain text so Sheets never turns them into numbers or dates.
const TEXT_COLS = {
  Settings: ['Value'],
  Stock: ['StockId', 'ModelId', 'ChassisNo', 'MotorNo', 'BatteryNo', 'ChargerNo', 'PurchaseInvoiceNo', 'SoldInvoiceNo'],
  Customers: ['Phone', 'GSTIN', 'StateCode', 'LastInvoiceNo'],
  Invoices: ['InvoiceNo', 'Phone', 'CustomerGSTIN', 'StateCode'],
  InvoiceItems: ['InvoiceNo', 'RefId', 'ChassisNo', 'MotorNo', 'BatteryNo', 'HSN'],
  Models: ['ModelId', 'HSN'],
  Accessories: ['ItemId', 'HSN']
};

const DEFAULT_SETTINGS = [
  ['ShopName', 'Master EV'],
  ['Tagline', 'Authorised Zelio Electric Scooter Dealer'],
  ['Address', 'Showroom address, City, PIN'],
  ['Phone', ''],
  ['Email', ''],
  ['GSTIN', ''],
  ['State', ''],
  ['StateCode', ''],
  ['GSTPrefix', 'MEV/GST/'],
  ['NormalPrefix', 'MEV/B/'],
  ['PricesIncludeGST', 'YES'],
  ['DefaultVehicleHSN', '8711'],
  ['DefaultVehicleGSTRate', '5'],
  ['BankDetails', ''],
  ['Terms', 'Goods once sold will not be taken back. Warranty as per manufacturer terms. Subject to local jurisdiction.']
];

/* ------------------------------------------------------------------ */
/* Entry points                                                         */
/* ------------------------------------------------------------------ */

function doGet() {
  ensureSetup_();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Master EV')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Master EV')
    .addItem('1. Set up sheets', 'setup')
    .addItem('2. Load Zelio models (optional)', 'loadZelioModels')
    .addItem('Show app link', 'showAppLink')
    .addToUi();
}

function setup() {
  ensureSetup_();
  try { SpreadsheetApp.getUi().alert('Master EV sheets are ready.'); } catch (e) { /* run from editor */ }
}

function showAppLink() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Open the app here:\n\n' + url
    : 'The app is not deployed yet. In Extensions > Apps Script, click Deploy > New deployment > Web app.');
}

/* ------------------------------------------------------------------ */
/* Sheet helpers                                                        */
/* ------------------------------------------------------------------ */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSetup_() {
  const ss = ss_();
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    const head = SHEETS[name];
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold')
        .setBackground('#0b0b0b').setFontColor('#c6ff00');
      sh.setFrozenRows(1);
      (TEXT_COLS[name] || []).forEach(col => {
        sh.getRange(2, head.indexOf(col) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
      });
    }
  });
  const sh = ss.getSheetByName('Settings');
  if (sh.getLastRow() < 2) sh.getRange(2, 1, DEFAULT_SETTINGS.length, 2).setValues(DEFAULT_SETTINGS);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

function sheet_(name) { return ss_().getSheetByName(name); }

function tz_() { return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }

function clean_(v) {
  if (v instanceof Date) {
    const hasTime = Utilities.formatDate(v, tz_(), 'HH:mm') !== '00:00';
    return Utilities.formatDate(v, tz_(), hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  return v;
}

/** All rows of a tab as objects; each has _row (sheet row number). */
function readTable_(name) {
  const vals = sheet_(name).getDataRange().getValues();
  const head = vals.shift() || [];
  const out = [];
  vals.forEach((r, i) => {
    if (!r.some(v => v !== '')) return;
    const o = { _row: i + 2 };
    head.forEach((h, j) => { o[h] = clean_(r[j]); });
    out.push(o);
  });
  return out;
}

function append_(name, obj) {
  const head = SHEETS[name];
  sheet_(name).appendRow(head.map(h => (obj[h] === undefined || obj[h] === null) ? '' : obj[h]));
}

function appendMany_(name, objs) {
  if (!objs.length) return;
  const head = SHEETS[name];
  const sh = sheet_(name);
  const rows = objs.map(o => head.map(h => (o[h] === undefined || o[h] === null) ? '' : o[h]));
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
}

function update_(name, rowNum, patch) {
  const head = SHEETS[name];
  const rng = sheet_(name).getRange(rowNum, 1, 1, head.length);
  const row = rng.getValues()[0];
  Object.keys(patch).forEach(k => {
    const i = head.indexOf(k);
    if (i >= 0) row[i] = patch[k];
  });
  rng.setValues([row]);
}

function now_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
function today_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function id_(prefix) { return prefix + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 36).toString(36).toUpperCase(); }
function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function r2_(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function str_(v) { return String(v === undefined || v === null ? '' : v).trim(); }

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ------------------------------------------------------------------ */
/* Settings                                                             */
/* ------------------------------------------------------------------ */

function getSettings_() {
  const s = {};
  readTable_('Settings').forEach(r => { s[r.Key] = str_(r.Value); });
  return s;
}

function setSetting_(key, value) {
  const row = readTable_('Settings').find(r => r.Key === key);
  if (row) update_('Settings', row._row, { Value: String(value) });
  else append_('Settings', { Key: key, Value: String(value) });
}

function saveSettings(obj) {
  return withLock_(() => {
    DEFAULT_SETTINGS.forEach(([k]) => { if (k in obj) setSetting_(k, str_(obj[k])); });
    return getSettings_();
  });
}

/** Indian financial year label for a yyyy-MM-dd date, e.g. 2026-27. */
function fy_(dateStr) {
  const y = Number(dateStr.slice(0, 4)), m = Number(dateStr.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return start + '-' + String((start + 1) % 100).padStart(2, '0');
}

/** Next invoice number. Each bill type has its own series that restarts every financial year. */
function nextInvoiceNo_(billType, dateStr, settings) {
  const fy = fy_(dateStr);
  const key = 'Counter_' + billType + '_' + fy;
  const n = num_(settings[key]) + 1;
  setSetting_(key, n);
  const prefix = billType === 'GST' ? (settings.GSTPrefix || 'MEV/GST/') : (settings.NormalPrefix || 'MEV/B/');
  return prefix + fy + '/' + String(n).padStart(4, '0');
}

/* ------------------------------------------------------------------ */
/* App data                                                             */
/* ------------------------------------------------------------------ */

function getBootstrap() {
  ensureSetup_();
  const strip = rows => rows.map(r => { delete r._row; return r; });
  return {
    settings: getSettings_(),
    models: strip(readTable_('Models')),
    stock: strip(readTable_('Stock')),
    accessories: strip(readTable_('Accessories')),
    dashboard: getDashboard_()
  };
}

function getDashboard_() {
  const stock = readTable_('Stock');
  const inStock = stock.filter(s => s.Status === 'In Stock');
  const byModel = {};
  inStock.forEach(s => { byModel[s.ModelName] = (byModel[s.ModelName] || 0) + 1; });
  const acc = readTable_('Accessories');
  const inv = readTable_('Invoices').filter(i => i.Status !== 'Cancelled');
  const t = today_(), m = t.slice(0, 7);
  const sum = (rows, f) => r2_(rows.reduce((a, r) => a + num_(r[f]), 0));
  const todays = inv.filter(i => String(i.Date).slice(0, 10) === t);
  const month = inv.filter(i => String(i.Date).slice(0, 7) === m);
  return {
    vehiclesInStock: inStock.length,
    stockValue: sum(inStock, 'CostPrice'),
    byModel: Object.keys(byModel).sort().map(k => ({ model: k, count: byModel[k] })),
    lowAccessories: acc.filter(a => num_(a.Qty) <= 2).map(a => ({ name: a.Name, qty: num_(a.Qty) })),
    todaySales: sum(todays, 'Total'), todayBills: todays.length,
    monthSales: sum(month, 'Total'), monthBills: month.length,
    monthGST: r2_(sum(month, 'CGST') + sum(month, 'SGST') + sum(month, 'IGST')),
    monthVehiclesSold: stock.filter(s => s.Status === 'Sold' && String(s.SoldDate).slice(0, 7) === m).length,
    pendingBalance: sum(inv.filter(i => num_(i.Balance) > 0), 'Balance'),
    recent: inv.slice(-8).reverse().map(i => ({ no: i.InvoiceNo, type: i.BillType, date: i.Date, name: i.CustomerName, total: num_(i.Total), balance: num_(i.Balance) }))
  };
}

/* ------------------------------------------------------------------ */
/* Models, vehicles, accessories                                        */
/* ------------------------------------------------------------------ */

function modelName_(m) { return [m.Brand, m.Model, m.Variant].map(str_).filter(Boolean).join(' '); }

function addModel(m) {
  return withLock_(() => {
    if (!str_(m.Model)) throw new Error('Model name is required.');
    const s = getSettings_();
    const row = {
      ModelId: id_('M'), Brand: str_(m.Brand), Model: str_(m.Model), Variant: str_(m.Variant),
      HSN: str_(m.HSN) || s.DefaultVehicleHSN || '8711',
      GSTRate: m.GSTRate === '' || m.GSTRate === undefined ? num_(s.DefaultVehicleGSTRate || 5) : num_(m.GSTRate),
      CostPrice: num_(m.CostPrice), SalePrice: num_(m.SalePrice), Active: 'YES', CreatedAt: now_()
    };
    append_('Models', row);
    return row;
  });
}

function updateModel(m) {
  return withLock_(() => {
    const row = readTable_('Models').find(r => r.ModelId === m.ModelId);
    if (!row) throw new Error('Model not found.');
    const patch = {};
    ['Brand', 'Model', 'Variant', 'HSN', 'Active'].forEach(k => { if (k in m) patch[k] = str_(m[k]); });
    ['GSTRate', 'CostPrice', 'SalePrice'].forEach(k => { if (k in m) patch[k] = num_(m[k]); });
    update_('Models', row._row, patch);
    return true;
  });
}

function addVehicle(v) {
  return withLock_(() => {
    const chassis = str_(v.ChassisNo).toUpperCase();
    if (!chassis) throw new Error('Chassis number is required.');
    const model = readTable_('Models').find(m => m.ModelId === v.ModelId);
    if (!model) throw new Error('Pick a model first.');
    if (readTable_('Stock').some(s => str_(s.ChassisNo).toUpperCase() === chassis)) {
      throw new Error('Chassis number ' + chassis + ' is already in the system.');
    }
    const row = {
      StockId: id_('V'), ModelId: model.ModelId, ModelName: modelName_(model), Color: str_(v.Color),
      ChassisNo: chassis, MotorNo: str_(v.MotorNo).toUpperCase(), BatteryNo: str_(v.BatteryNo).toUpperCase(),
      ChargerNo: str_(v.ChargerNo).toUpperCase(), Supplier: str_(v.Supplier), PurchaseInvoiceNo: str_(v.PurchaseInvoiceNo),
      PurchaseDate: str_(v.PurchaseDate) || today_(), CostPrice: v.CostPrice === '' ? num_(model.CostPrice) : num_(v.CostPrice),
      Status: 'In Stock', SoldInvoiceNo: '', SoldDate: '', Notes: str_(v.Notes), CreatedAt: now_()
    };
    append_('Stock', row);
    append_('StockLog', { Time: now_(), Kind: 'Vehicle in', Ref: chassis, Change: 1, Note: row.ModelName });
    return row;
  });
}

function addAccessory(a) {
  return withLock_(() => {
    if (!str_(a.Name)) throw new Error('Item name is required.');
    const row = {
      ItemId: id_('A'), Name: str_(a.Name), HSN: str_(a.HSN), GSTRate: num_(a.GSTRate), Qty: num_(a.Qty),
      CostPrice: num_(a.CostPrice), SalePrice: num_(a.SalePrice), CreatedAt: now_(), UpdatedAt: now_()
    };
    append_('Accessories', row);
    append_('StockLog', { Time: now_(), Kind: 'Item in', Ref: row.Name, Change: row.Qty, Note: 'New item' });
    return row;
  });
}

function adjustAccessory(itemId, change, note) {
  return withLock_(() => {
    const row = readTable_('Accessories').find(r => r.ItemId === itemId);
    if (!row) throw new Error('Item not found.');
    const qty = num_(row.Qty) + num_(change);
    if (qty < 0) throw new Error('Stock cannot go below zero.');
    update_('Accessories', row._row, { Qty: qty, UpdatedAt: now_() });
    append_('StockLog', { Time: now_(), Kind: num_(change) >= 0 ? 'Item in' : 'Item out', Ref: row.Name, Change: num_(change), Note: str_(note) || 'Manual adjustment' });
    return qty;
  });
}

function findCustomer(phone) {
  const p = str_(phone);
  if (!p) return null;
  const c = readTable_('Customers').find(r => str_(r.Phone) === p);
  if (c) delete c._row;
  return c || null;
}

/* ------------------------------------------------------------------ */
/* Billing                                                              */
/* ------------------------------------------------------------------ */

/** Same maths as calc() in Index.html. The server result is what gets saved. */
function calc_(items, billType, inclusive, interState) {
  const t = { taxable: 0, cgst: 0, sgst: 0, igst: 0, lines: [] };
  items.forEach(it => {
    const qty = num_(it.qty), price = num_(it.unitPrice);
    const gross = r2_(qty * price);
    const rate = billType === 'GST' ? num_(it.gstRate) : 0;
    const taxable = rate && inclusive ? r2_(gross / (1 + rate / 100)) : gross;
    const tax = r2_(taxable * rate / 100);
    let c = 0, s = 0, i = 0;
    if (interState) i = tax; else { c = r2_(tax / 2); s = r2_(tax - c); }
    t.lines.push(Object.assign({}, it, { qty: qty, unitPrice: price, gstRate: rate, taxable: taxable, cgst: c, sgst: s, igst: i, lineTotal: r2_(taxable + tax) }));
    t.taxable += taxable; t.cgst += c; t.sgst += s; t.igst += i;
  });
  ['taxable', 'cgst', 'sgst', 'igst'].forEach(k => { t[k] = r2_(t[k]); });
  const exact = r2_(t.taxable + t.cgst + t.sgst + t.igst);
  t.total = Math.round(exact);
  t.roundOff = r2_(t.total - exact);
  return t;
}

function createInvoice(p) {
  return withLock_(() => {
    const billType = p.billType === 'GST' ? 'GST' : 'NORMAL';
    const s = getSettings_();
    const date = str_(p.date) || today_();
    const cust = p.customer || {};
    if (!str_(cust.name)) throw new Error('Customer name is required.');
    if (!p.items || !p.items.length) throw new Error('Add at least one item to the bill.');
    if (billType === 'GST' && !s.GSTIN) throw new Error('Add your shop GSTIN in Settings before making a GST bill.');

    const stock = readTable_('Stock');
    const acc = readTable_('Accessories');
    const items = p.items.map(it => {
      const o = {
        itemType: it.itemType, refId: str_(it.refId), description: str_(it.description), hsn: str_(it.hsn),
        qty: num_(it.qty), unitPrice: num_(it.unitPrice), gstRate: num_(it.gstRate), chassisNo: '', motorNo: '', batteryNo: ''
      };
      if (!o.description) throw new Error('Every line needs a description.');
      if (o.qty <= 0) throw new Error('Quantity must be more than zero for ' + o.description + '.');
      if (o.itemType === 'VEHICLE') {
        const v = stock.find(x => x.StockId === o.refId);
        if (!v) throw new Error('Vehicle not found in stock.');
        if (v.Status !== 'In Stock') throw new Error('Vehicle ' + v.ChassisNo + ' is already sold.');
        o.qty = 1; o.chassisNo = v.ChassisNo; o.motorNo = v.MotorNo; o.batteryNo = v.BatteryNo; o._row = v._row;
      }
      if (o.itemType === 'ACCESSORY') {
        const a = acc.find(x => x.ItemId === o.refId);
        if (!a) throw new Error('Item ' + o.description + ' not found.');
        if (num_(a.Qty) < o.qty) throw new Error('Only ' + num_(a.Qty) + ' of ' + a.Name + ' in stock.');
        o._row = a._row; o._have = num_(a.Qty);
      }
      return o;
    });
    const seen = {};
    items.forEach(o => {
      if (o.itemType === 'VEHICLE') { if (seen[o.refId]) throw new Error('Same vehicle added twice.'); seen[o.refId] = 1; }
    });
    const accUse = {};
    items.filter(o => o.itemType === 'ACCESSORY').forEach(o => { accUse[o.refId] = (accUse[o.refId] || 0) + o.qty; });
    items.filter(o => o.itemType === 'ACCESSORY').forEach(o => {
      if (accUse[o.refId] > o._have) throw new Error('Not enough ' + o.description + ' in stock.');
    });

    const custCode = str_(cust.stateCode);
    const interState = billType === 'GST' && !!custCode && !!s.StateCode && custCode !== s.StateCode;
    const inclusive = p.pricesIncludeGST !== false;
    const t = calc_(items, billType, inclusive, interState);

    const invNo = nextInvoiceNo_(billType, date, s);
    const paid = p.amountPaid === '' || p.amountPaid === undefined || p.amountPaid === null ? t.total : num_(p.amountPaid);
    const inv = {
      InvoiceNo: invNo, BillType: billType, Date: date, CustomerName: str_(cust.name), Phone: str_(cust.phone),
      Address: str_(cust.address), CustomerGSTIN: billType === 'GST' ? str_(cust.gstin).toUpperCase() : '',
      PlaceOfSupply: billType === 'GST' ? (str_(cust.state) || s.State) : '', StateCode: billType === 'GST' ? (custCode || s.StateCode) : '',
      Taxable: t.taxable, CGST: t.cgst, SGST: t.sgst, IGST: t.igst, RoundOff: t.roundOff, Total: t.total,
      PaymentMode: str_(p.paymentMode) || 'Cash', AmountPaid: paid, Balance: r2_(t.total - paid),
      Status: 'Active', Notes: str_(p.notes), CreatedAt: now_()
    };
    append_('Invoices', inv);
    appendMany_('InvoiceItems', t.lines.map((l, i) => ({
      InvoiceNo: invNo, Line: i + 1, ItemType: l.itemType, RefId: l.refId, Description: l.description,
      ChassisNo: l.chassisNo, MotorNo: l.motorNo, BatteryNo: l.batteryNo, HSN: l.hsn, Qty: l.qty, UnitPrice: l.unitPrice,
      GSTRate: l.gstRate, Taxable: l.taxable, CGST: l.cgst, SGST: l.sgst, IGST: l.igst, LineTotal: l.lineTotal
    })));

    items.forEach(o => {
      if (o.itemType === 'VEHICLE') {
        update_('Stock', o._row, { Status: 'Sold', SoldInvoiceNo: invNo, SoldDate: date });
        append_('StockLog', { Time: now_(), Kind: 'Vehicle sold', Ref: o.chassisNo, Change: -1, Note: invNo });
      }
    });
    Object.keys(accUse).forEach(id => {
      const a = items.find(o => o.refId === id);
      update_('Accessories', a._row, { Qty: a._have - accUse[id], UpdatedAt: now_() });
      append_('StockLog', { Time: now_(), Kind: 'Item sold', Ref: a.description, Change: -accUse[id], Note: invNo });
    });

    if (inv.Phone) {
      const c = readTable_('Customers').find(r => str_(r.Phone) === inv.Phone);
      const crow = { Phone: inv.Phone, Name: inv.CustomerName, Address: inv.Address, GSTIN: str_(cust.gstin).toUpperCase(),
        State: str_(cust.state), StateCode: custCode, LastInvoiceNo: invNo };
      if (c) update_('Customers', c._row, crow);
      else append_('Customers', Object.assign(crow, { FirstSeen: date }));
    }
    return getInvoice(invNo);
  });
}

function getInvoice(invNo) {
  const inv = readTable_('Invoices').find(r => r.InvoiceNo === invNo);
  if (!inv) throw new Error('Invoice ' + invNo + ' not found.');
  delete inv._row;
  const items = readTable_('InvoiceItems').filter(r => r.InvoiceNo === invNo).map(r => { delete r._row; return r; });
  return { invoice: inv, items: items, settings: getSettings_() };
}

function listInvoices(f) {
  f = f || {};
  const q = str_(f.q).toLowerCase();
  let rows = readTable_('Invoices');
  if (f.type) rows = rows.filter(r => r.BillType === f.type);
  if (f.month) rows = rows.filter(r => String(r.Date).slice(0, 7) === f.month);
  if (q) {
    const chassisHits = {};
    readTable_('InvoiceItems').forEach(it => {
      if ((str_(it.ChassisNo) + ' ' + str_(it.MotorNo) + ' ' + str_(it.BatteryNo)).toLowerCase().indexOf(q) >= 0) chassisHits[it.InvoiceNo] = 1;
    });
    rows = rows.filter(r => chassisHits[r.InvoiceNo] ||
      [r.InvoiceNo, r.CustomerName, r.Phone, r.CustomerGSTIN].join(' ').toLowerCase().indexOf(q) >= 0);
  }
  return rows.reverse().slice(0, 500).map(r => { delete r._row; return r; });
}

function recordPayment(invNo, amount, mode) {
  return withLock_(() => {
    const inv = readTable_('Invoices').find(r => r.InvoiceNo === invNo);
    if (!inv) throw new Error('Invoice not found.');
    if (inv.Status === 'Cancelled') throw new Error('This bill is cancelled.');
    const amt = num_(amount);
    if (amt <= 0) throw new Error('Enter an amount.');
    const paid = r2_(num_(inv.AmountPaid) + amt);
    const mode2 = str_(mode) && str_(mode) !== str_(inv.PaymentMode) ? str_(inv.PaymentMode) + ' + ' + str_(mode) : inv.PaymentMode;
    update_('Invoices', inv._row, { AmountPaid: paid, Balance: r2_(num_(inv.Total) - paid), PaymentMode: mode2 });
    return getInvoice(invNo);
  });
}

function cancelInvoice(invNo, reason) {
  return withLock_(() => {
    const inv = readTable_('Invoices').find(r => r.InvoiceNo === invNo);
    if (!inv) throw new Error('Invoice not found.');
    if (inv.Status === 'Cancelled') throw new Error('Already cancelled.');
    update_('Invoices', inv._row, { Status: 'Cancelled', Notes: (str_(inv.Notes) + ' | Cancelled ' + now_() + ': ' + str_(reason)).replace(/^ \| /, '') });
    const items = readTable_('InvoiceItems').filter(r => r.InvoiceNo === invNo);
    const stock = readTable_('Stock');
    const acc = readTable_('Accessories');
    items.forEach(it => {
      if (it.ItemType === 'VEHICLE') {
        const v = stock.find(s => s.StockId === it.RefId);
        if (v && v.SoldInvoiceNo === invNo) {
          update_('Stock', v._row, { Status: 'In Stock', SoldInvoiceNo: '', SoldDate: '' });
          append_('StockLog', { Time: now_(), Kind: 'Vehicle returned', Ref: v.ChassisNo, Change: 1, Note: 'Cancelled ' + invNo });
        }
      }
      if (it.ItemType === 'ACCESSORY') {
        const a = acc.find(x => x.ItemId === it.RefId);
        if (a) {
          a.Qty = num_(a.Qty) + num_(it.Qty);
          update_('Accessories', a._row, { Qty: a.Qty, UpdatedAt: now_() });
          append_('StockLog', { Time: now_(), Kind: 'Item returned', Ref: a.Name, Change: num_(it.Qty), Note: 'Cancelled ' + invNo });
        }
      }
    });
    return getInvoice(invNo);
  });
}

/* ------------------------------------------------------------------ */
/* Reports                                                              */
/* ------------------------------------------------------------------ */

function getMonthReport(month) {
  const m = str_(month) || today_().slice(0, 7);
  const all = readTable_('Invoices').filter(r => String(r.Date).slice(0, 7) === m);
  const active = all.filter(r => r.Status !== 'Cancelled');
  const nos = {};
  active.forEach(r => { nos[r.InvoiceNo] = r; });
  const sum = (rows, f) => r2_(rows.reduce((a, r) => a + num_(r[f]), 0));
  const byType = type => {
    const rows = active.filter(r => r.BillType === type);
    return { bills: rows.length, taxable: sum(rows, 'Taxable'), cgst: sum(rows, 'CGST'), sgst: sum(rows, 'SGST'), igst: sum(rows, 'IGST'), total: sum(rows, 'Total') };
  };
  const hsn = {};
  readTable_('InvoiceItems').forEach(it => {
    const inv = nos[it.InvoiceNo];
    if (!inv || inv.BillType !== 'GST') return;
    const k = str_(it.HSN) + '|' + num_(it.GSTRate);
    const h = hsn[k] || (hsn[k] = { hsn: str_(it.HSN), rate: num_(it.GSTRate), qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
    h.qty += num_(it.Qty); h.taxable += num_(it.Taxable); h.cgst += num_(it.CGST); h.sgst += num_(it.SGST); h.igst += num_(it.IGST); h.total += num_(it.LineTotal);
  });
  const gstRows = active.filter(r => r.BillType === 'GST');
  return {
    month: m,
    gst: byType('GST'),
    normal: byType('NORMAL'),
    cancelled: all.length - active.length,
    b2b: gstRows.filter(r => str_(r.CustomerGSTIN)).map(r => ({ no: r.InvoiceNo, date: r.Date, name: r.CustomerName, gstin: r.CustomerGSTIN, taxable: num_(r.Taxable), tax: r2_(num_(r.CGST) + num_(r.SGST) + num_(r.IGST)), total: num_(r.Total) })),
    b2cCount: gstRows.filter(r => !str_(r.CustomerGSTIN)).length,
    hsn: Object.keys(hsn).sort().map(k => { const h = hsn[k]; ['taxable', 'cgst', 'sgst', 'igst', 'total'].forEach(f => { h[f] = r2_(h[f]); }); return h; }),
    payments: (() => {
      const p = {};
      active.forEach(r => { const k = str_(r.PaymentMode) || 'Cash'; p[k] = r2_((p[k] || 0) + num_(r.AmountPaid)); });
      return Object.keys(p).map(k => ({ mode: k, amount: p[k] }));
    })()
  };
}

/* ------------------------------------------------------------------ */
/* AI scooter scan: photo of the scooter (+ optional photo of the       */
/* chassis plate) -> model, colour and numbers, for adding to stock.   */
/* Needs an Anthropic API key in Project Settings > Script properties  */
/* under the name ANTHROPIC_API_KEY. The key never goes in the code.   */
/* ------------------------------------------------------------------ */

const AI_MODEL = 'claude-opus-5-5';

function identifyScooter(photos) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('AI scan is not switched on yet. In Apps Script open Project Settings > Script properties and add ANTHROPIC_API_KEY (see README).');
  photos = (photos || []).filter(p => p && p.data).slice(0, 2);
  if (!photos.length) throw new Error('Take a photo of the scooter first.');

  const models = readTable_('Models').filter(m => String(m.Active).toUpperCase() !== 'NO');
  const names = [];
  models.forEach(m => { const n = str_(m.Model); if (n && names.indexOf(n) < 0) names.push(n); });
  if (!names.length) throw new Error('Add models first (Models tab, or the sheet menu Master EV > Load Zelio models).');
  const choices = names.concat(['UNKNOWN']);

  const content = [];
  photos.forEach(p => {
    content.push({ type: 'image', source: { type: 'base64', media_type: p.mediaType || 'image/jpeg', data: String(p.data).replace(/^data:[^,]+,/, '') } });
  });
  content.push({ type: 'text', text:
    'You are helping an electric scooter showroom add one scooter to its stock list.\n' +
    'Photo 1 shows the scooter.' + (photos.length > 1 ? ' Photo 2 shows a number plate or sticker on the same scooter.' : '') + '\n\n' +
    'Pick the model from this list only (these are the models the showroom sells): ' + names.join(', ') + '.\n' +
    'Several of them look alike (for example the Gracy, Eeva, Legender and X Men families). Give your best match, ' +
    'say how sure you are, and list close look-alikes as alternatives. If the photo does not show a scooter from this list, answer UNKNOWN.\n' +
    'Give the main body colour in plain words (for example White, Charcoal Black, Crimson Red).\n' +
    'Copy the chassis/VIN, motor, battery and charger numbers exactly as printed, but only when you can read every character clearly. ' +
    'If a number is not visible or any character is unclear, return an empty string for it. Never guess characters.\n' +
    'In notes, say in one short sentence anything the staff should check by eye.' });

  const schema = {
    type: 'object', additionalProperties: false,
    required: ['model', 'confidence', 'alternatives', 'color', 'chassisNo', 'motorNo', 'batteryNo', 'chargerNo', 'notes'],
    properties: {
      model: { type: 'string', enum: choices },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      alternatives: { type: 'array', items: { type: 'string', enum: choices } },
      color: { type: 'string' }, chassisNo: { type: 'string' }, motorNo: { type: 'string' },
      batteryNo: { type: 'string' }, chargerNo: { type: 'string' }, notes: { type: 'string' }
    }
  };

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2026-10-21', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify({
      model: AI_MODEL, max_tokens: 16000, fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: schema } },
      messages: [{ role: 'user', content: content }]
    })
  });
  const code = res.getResponseCode();
  let body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) {}
  if (code === 401) throw new Error('The AI key was rejected. Check ANTHROPIC_API_KEY in Script properties.');
  if (code === 429 || code >= 500) throw new Error('The AI service is busy. Please try again in a minute.');
  if (code !== 200) throw new Error('AI scan failed (' + code + '): ' + ((body.error && body.error.message) || 'unknown error'));
  if (body.stop_reason === 'refusal') throw new Error('The AI could not process this photo. Please try another photo.');
  const textBlock = (body.content || []).filter(b => b.type === 'text').pop();
  let out;
  try { out = JSON.parse(textBlock.text); } catch (e) { throw new Error('The AI reply could not be read. Please try again.'); }

  const pick = n => models.filter(m => str_(m.Model) === n).map(m => ({ ModelId: m.ModelId, name: modelName_(m), SalePrice: num_(m.SalePrice) }));
  out.candidates = out.model === 'UNKNOWN' ? [] : pick(out.model);
  out.altCandidates = [];
  (out.alternatives || []).forEach(n => { if (n !== out.model && n !== 'UNKNOWN') out.altCandidates = out.altCandidates.concat(pick(n)); });
  ['chassisNo', 'motorNo', 'batteryNo', 'chargerNo'].forEach(k => { out[k] = str_(out[k]).toUpperCase().replace(/\s+/g, ''); });
  out.duplicate = !!out.chassisNo && readTable_('Stock').some(s => str_(s.ChassisNo).toUpperCase() === out.chassisNo);
  return out;
}
