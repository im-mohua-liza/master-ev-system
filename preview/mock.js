/* Local preview only: fakes Google Sheets in the browser (localStorage) so the
   real Code.gs runs unchanged. Not used in the Google deployment. */
var MOCK_KEY = 'masterev-preview-v1';
var MOCK_DB = (function () { try { return JSON.parse(localStorage.getItem(MOCK_KEY)) || {}; } catch (e) { return {}; } })();
function mockSave() { try { localStorage.setItem(MOCK_KEY, JSON.stringify(MOCK_DB)); } catch (e) {} }
function mockSheet(name) {
  var rows = MOCK_DB[name];
  var self;
  function range(r, c, nr, nc) {
    var rg = {
      getValues: function () {
        var out = [];
        for (var i = 0; i < nr; i++) { var row = []; for (var j = 0; j < nc; j++) { var src = rows[r - 1 + i]; row.push(src && src[c - 1 + j] !== undefined ? src[c - 1 + j] : ''); } out.push(row); }
        return out;
      },
      setValues: function (vals) {
        vals.forEach(function (row, i) { var tr = rows[r - 1 + i] || (rows[r - 1 + i] = []); row.forEach(function (v, j) { tr[c - 1 + j] = v; }); });
        for (var k = 0; k < rows.length; k++) if (!rows[k]) rows[k] = [];
        mockSave(); return rg;
      },
      setFontWeight: function () { return rg; }, setBackground: function () { return rg; },
      setFontColor: function () { return rg; }, setNumberFormat: function () { return rg; }
    };
    return rg;
  }
  self = {
    getRange: function (r, c, nr, nc) { return range(r, c, nr || 1, nc || 1); },
    getDataRange: function () { var w = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 0); return range(1, 1, rows.length, w); },
    appendRow: function (row) { rows.push(row.slice()); mockSave(); },
    getLastRow: function () { return rows.length; },
    getMaxRows: function () { return 1000; },
    setFrozenRows: function () {}
  };
  return self;
}
var SpreadsheetApp = {
  getActiveSpreadsheet: function () {
    return {
      getSheetByName: function (n) { return MOCK_DB[n] ? mockSheet(n) : null; },
      insertSheet: function (n) { MOCK_DB[n] = []; mockSave(); return mockSheet(n); },
      getSheets: function () { return Object.keys(MOCK_DB); },
      deleteSheet: function () {},
      getSpreadsheetTimeZone: function () { return 'local'; }
    };
  },
  getUi: function () { throw new Error('no ui in preview'); }
};
var Session = { getScriptTimeZone: function () { return 'local'; } };
var LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
var ScriptApp = { getService: function () { return { getUrl: function () { return ''; } }; } };
var Utilities = {
  formatDate: function (d, tz, fmt) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return fmt.replace('yyyy', d.getFullYear()).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate()))
      .replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes()));
  }
};
