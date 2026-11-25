/**
 * Optional: loads the Zelio range into the Models tab (menu: Master EV > Load Zelio models).
 * Prices are the ex-showroom prices shown on zelioebikes.com on 10 Nov 2026.
 * Check them against your dealer price list and edit the Models tab as needed.
 * Cost price is left at 0; fill in your purchase price per model.
 */
const ZELIO_MODELS = [
  ["Gracy","60V/32AH LEAD ACID",68109],
  ["Gracy","72V/32AH LEAD ACID",70983],
  ["Gracy","60V/42AH LEAD ACID",75009],
  ["Gracy","72v/42AH LEAD ACID",79264],
  ["Gracy","60v/32AH Li-ion",84784],
  ["Gracy","74v/32AH Li-ion",90534],
  ["Mystery","74v/32AH Li-ion",88234],
  ["X Men 2.0","60V/32AH Lead Acid",79034],
  ["X Men 2.0","72V/32AH Lead Acid",81909],
  ["X Men 2.0","60V42AH LEAD ACID",85934],
  ["X Men 2.0","72v/42AH LEAD ACID",90189],
  ["X Men 2.0","60v/32AH Li-ion",95709],
  ["X Men 2.0","74v/32AH Li-ion",101459],
  ["LOGIX","60V/32AH LEAD ACID",65234],
  ["LOGIX","72V/32AH LEAD ACID",68109],
  ["LOGIX","60V/42AH LEAD ACID",72134],
  ["LOGIX","72v/42AH LEAD ACID",76389],
  ["LOGIX","60v/32AH Li-ion",81909],
  ["LOGIX","74v/32AH Li-ion",87659],
  ["Logix Loader","60V/32AH LEAD ACID",70409],
  ["Logix Loader","72V/32AH LEAD ACID",73284],
  ["Logix Loader","60V/42AH LEAD ACID",77309],
  ["Logix Loader","72v/42AH LEAD ACID",81564],
  ["Logix Loader","60v/32AH Li-ion",87084],
  ["Logix Loader","74v/32AH Li-ion",92834],
  ["X Men+","60V/32AH LEAD ACID",70409],
  ["X Men+","72V/32AH LEAD ACID",73284],
  ["X Men+","60V/42AH LEAD ACID",77309],
  ["X Men+","72v/42AH LEAD ACID",81564],
  ["X Men+","60v/32AH Li-ion",87084],
  ["X Men+","74v/32AH Li-ion",92834],
  ["Legender+ Premium","60V/32AH Lead Acid",68134],
  ["Legender+ Premium","72V/32AH LEAD ACID",71009],
  ["Legender+ Premium","60V/42AH LEAD ACID",75034],
  ["Legender+ Premium","72v/42AH LEAD ACID",79289],
  ["Legender+ Premium","60v/32AH Li-ion",84809],
  ["Legender+ Premium","74v/32AH Li-ion",90559],
  ["Legender+","60V/32AH LEAD ACID",65259],
  ["Legender+","72V/32AH LEAD ACID",68134],
  ["Legender+","60V/42AH LEAD ACID",72159],
  ["Legender+","72v/42AH LEAD ACID",76414],
  ["Legender+","60v/32AH Li-ion",81934],
  ["Legender+","74v/32AH Li-ion",87684],
  ["Legender","",71559],
  ["Gracy Pro","60V/32AH LEAD ACID",78459],
  ["Gracy Pro","72V/32AH LEAD ACID",81334],
  ["Gracy Pro","60v/32AH Li-ion",95134],
  ["Gracy Pro","74v/32AH Li-ion",100884],
  ["Gracy+","60V/32AH LEAD ACID",63534],
  ["Gracy+","72V/32AH LEAD ACID",66409],
  ["Gracy+","60V/42AH LEAD ACID",70434],
  ["Gracy+","72v/42AH LEAD ACID",74689],
  ["Gracy+","60v/32AH Li-ion",80209],
  ["Gracy+","74v/32AH Li-ion",85959],
  ["Gracyi","60V/32AH LEAD ACID",62384],
  ["Gracyi","72V/32AH LEAD ACID",65259],
  ["Gracyi","60V/42AH LEAD ACID",69284],
  ["Gracyi","72v/42AH LEAD ACID",73539],
  ["Gracyi","60v/32AH Li-ion",79059],
  ["Gracyi","74v/32AH Li-ion",84809],
  ["Little Gracy","48V/32AH LEAD ACID",54884],
  ["Little Gracy","60V/32AH LEAD ACID",57759],
  ["Little Gracy","60v/32AH Li-ion",74434],
  ["Eeva Eco ZX","48V/32AH LEAD ACID",54309],
  ["Eeva Eco ZX","60V/32AH LEAD ACID",57184],
  ["Eeva Eco ZX","60v/42AH LEAD ACID",64084],
  ["Eeva Eco ZX","60v/32AH Li-ion",73859],
  ["Eeva Eco LX","48V/32AH LEAD ACID",52009],
  ["Eeva Eco LX","60V/32AH LEAD ACID",54884],
  ["Eeva Eco LX","60v/32AH Li-ion",71559],
  ["Eeva Eco","60V/32AH LEAD ACID",56034],
  ["Eeva Eco","60V/42AH LEAD ACID",62934],
  ["Eeva Eco","60v/32AH Li-ion",72709],
  ["Eeva Eco","48V/32AH LEAD ACID",53159],
  ["EEVA ZX+","60V/32AH LEAD ACID",71559],
  ["EEVA ZX+","72V/32AH LEAD ACID",74435],
  ["EEVA ZX+","60V/42AH LEAD ACID",78459],
  ["EEVA ZX+","72v/42AH LEAD ACID",82714],
  ["EEVA ZX+","60v/32AH Li-ion",88234],
  ["EEVA ZX+","74v/32AH Li-ion",93984],
  ["EEVA (N)","60V/32AH LEAD ACID",60059],
  ["EEVA (N)","72V/32AH LEAD ACID",62934],
  ["EEVA (N)","60V/42AH LEAD ACID",66959],
  ["EEVA (N)","72v/42AH LEAD ACID",71214],
  ["EEVA (N)","60v/32AH Li-ion",76734],
  ["EEVA (N)","74v/32AH Li-ion",82484],
  ["EEVA ZX","60V/32AH LEAD ACID",70409],
  ["EEVA ZX","72V/32AH LEAD ACID",73284],
  ["EEVA ZX","60V/42AH LEAD ACID",77309],
  ["EEVA ZX","72v/42AH LEAD ACID",81564],
  ["EEVA ZX","60v/32AH Li-ion",87084],
  ["EEVA ZX","74v/32AH Li-ion",92834]
];

function loadZelioModels() {
  ensureSetup_();
  const s = getSettings_();
  const have = {};
  readTable_("Models").forEach(m => { have[(m.Brand + "|" + m.Model + "|" + m.Variant).toLowerCase()] = 1; });
  const rows = [];
  ZELIO_MODELS.forEach(([model, variant, price], i) => {
    if (have[("Zelio|" + model + "|" + variant).toLowerCase()]) return;
    rows.push({ ModelId: "Z" + String(i + 1).padStart(3, "0"), Brand: "Zelio", Model: model, Variant: variant,
      HSN: s.DefaultVehicleHSN || "8711", GSTRate: Number(s.DefaultVehicleGSTRate || 5),
      CostPrice: 0, SalePrice: price, Active: "YES", CreatedAt: now_() });
  });
  appendMany_("Models", rows);
  try { SpreadsheetApp.getUi().alert(rows.length + " Zelio models added."); } catch (e) {}
}
