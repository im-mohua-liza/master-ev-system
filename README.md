# Master EV showroom system

Stock, GST billing, normal billing and monthly reports for the Master EV
showroom. It runs on Google Apps Script. The Google Sheet it is attached to
is the database, so every vehicle, bill and payment is saved straight into
the sheet and all past records stay there.

## Files
- `Code.gs`: server side (sheet structure, stock, billing, numbering, reports)
- `Seed.gs`: optional Zelio model list with prices (from zelioebikes.com, 10 Nov 2026)
- `Index.html`: the app screen

## Set up (about 10 minutes, one time)
1. Create a new Google Sheet in the showroom's Google account. Name it `Master EV`.
2. In the sheet, open **Extensions > Apps Script**.
3. Delete what is in `Code.gs` and paste in this folder's `Code.gs`.
4. Click **+ > Script**, name it `Seed`, and paste in `Seed.gs`.
5. Click **+ > HTML**, name it `Index` (exactly), and paste in `Index.html`.
6. Click Save, choose the `setup` function at the top and click **Run**. Approve
   the permission prompt (it asks to edit this spreadsheet only).
7. Click **Deploy > New deployment > type: Web app**.
   - Execute as: **Me**
   - Who has access: **Only myself** (or **Anyone with a Google account**
     if staff use their own logins and you share the sheet with them)
   - Copy the web app link and bookmark it on the showroom computer and phone.
8. Back in the sheet, reload it. A **Master EV** menu appears. Use
   **Load Zelio models** to fill in the whole Zelio range in one go.
9. Open the app, go to **Settings**, and enter the shop name, address, phone,
   GSTIN, state and bank details.

After a code change: **Deploy > Manage deployments > Edit > Version: New version**.

## Switch on the AI scooter scan (optional)
Scanner > **Scan scooter** identifies a scooter from a photo (model and colour)
and reads the chassis number from a photo of the plate. It uses Claude, an AI
by Anthropic, and needs an API key:
1. Create a key at console.anthropic.com (add a payment method there).
2. In Apps Script, open **Project Settings > Script properties > Add script property**.
   Name: `ANTHROPIC_API_KEY`, value: the key. Save.
3. The first scan asks for one more permission (connecting to an external service). Allow it.

The key stays in the script's settings, never in the code or on GitHub.
Cost is roughly ₹3 to ₹5 per scooter scanned. The AI only suggests: staff pick the
battery variant (a photo cannot show it), check the chassis number against the
plate, and tap **Mark as stock**.

## What it does
- **Models**: price list (HSN 8711, GST 5% by default for electric scooters).
- **Vehicles**: each scooter by chassis, motor, battery and charger number.
  It blocks duplicate chassis numbers. A vehicle is marked Sold as soon as it is billed.
- **Accessories**: helmets, chargers, spares with quantity. Stock goes down
  when an item is billed.
- **New Bill**: switch between **GST bill** (tax invoice with HSN, CGST+SGST,
  or IGST for out-of-state buyers, chosen automatically from the state or
  GSTIN) and **Normal bill** (plain bill, no tax breakup). Finds returning
  customers by phone. Supports part payment and records the balance due.
- **Bill numbers**: separate series, restart every 1 April, e.g.
  `MEV/GST/2026-27/0001` and `MEV/B/2026-27/0001`.
- **Invoices**: search by bill no., name, phone, GSTIN or chassis no.;
  reprint, record a later payment, or cancel (the stock goes back).
- **Reports**: monthly GST totals, HSN summary and B2B list (for GSTR-1),
  normal-bill totals, money received by payment mode.

## Sheet tabs
Settings, Models, Stock, Accessories, StockLog, Customers, Invoices, InvoiceItems.
You can read and filter them freely. Do not rename tabs or header cells.
Old records from before can be pasted into the matching columns.

## Checks before real use
- Confirm GST rates and HSN codes with the shop's accountant.
- Make one test GST bill and one test normal bill, check the print,
  then cancel both.
