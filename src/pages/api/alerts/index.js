// pages/api/alerts/index.js
import fs from 'fs';
import path from 'path';

const productsPath  = path.join(process.cwd(), 'data', 'products.json');
const stockPath     = path.join(process.cwd(), 'data', 'stock.json');
const transfersPath = path.join(process.cwd(), 'data', 'transfers.json');
const alertsPath    = path.join(process.cwd(), 'data', 'alerts.json');

const DEFAULT_LEAD_TIME  = 7;  // days
const VELOCITY_WINDOW    = 30; // days to look back when computing transfer velocity

// ── Transfer velocity ─────────────────────────────────────────────────────────
// Velocity = total units transferred for this product in the last VELOCITY_WINDOW
// days, divided by VELOCITY_WINDOW. This gives an average units-per-day figure
// that represents how quickly stock is redistributed across warehouses.
//
// Edge cases:
//   - No transfers in window  → velocity = 0 (new product or stagnant stock)
//   - All transfers are old   → velocity = 0, treated same as above
function computeVelocity(productId, transfers) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - VELOCITY_WINDOW);

  const recent = transfers.filter(
    t => t.productId === productId && new Date(t.createdAt) >= cutoff
  );
  const totalMoved = recent.reduce((sum, t) => sum + t.quantity, 0);
  return totalMoved / VELOCITY_WINDOW; // units per day
}

// ── Reorder quantity formula ──────────────────────────────────────────────────
// Goal: bring stock back to a comfortable buffer (2× reorder point) AND cover
// the demand that will occur while waiting for the order to arrive.
//
// FORMULA:
//   targetStock  = reorderPoint × 2        (desired buffer level)
//   safetyStock  = ceil(velocity × leadTime) (units consumed during lead time)
//   reorderQty   = max(0, targetStock − currentStock + safetyStock)
//
// Assumptions:
//   - 2× reorder point is a reasonable target buffer for a distribution company.
//   - Transfer velocity is a proxy for consumption/redistribution demand.
//   - When velocity = 0 (no history), safetyStock = 0, so we only order enough
//     to reach the target — a conservative but safe default.
//   - Result is clamped to 0: if stock already exceeds the target, no order needed.
function computeReorderQty(currentStock, reorderPoint, velocity, leadTimeDays) {
  const targetStock = reorderPoint * 2;
  const safetyStock = Math.ceil(velocity * leadTimeDays);
  return Math.max(0, targetStock - currentStock + safetyStock);
}

// ── Stock status categorisation ───────────────────────────────────────────────
function getStockStatus(currentStock, reorderPoint) {
  if (currentStock === 0)                        return 'out_of_stock';
  if (currentStock < reorderPoint * 0.5)         return 'critical';
  if (currentStock < reorderPoint)               return 'low';
  if (currentStock < reorderPoint * 2)           return 'adequate';
  return 'overstocked';
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const products  = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const stock     = JSON.parse(fs.readFileSync(stockPath, 'utf8'));
  const transfers = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
  let   alerts    = JSON.parse(fs.readFileSync(alertsPath, 'utf8'));

  const leadTimeDays = parseInt(req.query.leadTime, 10) || DEFAULT_LEAD_TIME;
  let alertsModified = false;

  const result = products.map(product => {
    // Aggregate stock across all warehouses
    const productStock = stock.filter(s => s.productId === product.id);
    const currentStock = productStock.reduce((sum, s) => sum + s.quantity, 0);

    const stockStatus = getStockStatus(currentStock, product.reorderPoint);
    const velocity    = computeVelocity(product.id, transfers);
    const reorderQty  = computeReorderQty(currentStock, product.reorderPoint, velocity, leadTimeDays);
    const needsAlert  = ['out_of_stock', 'critical', 'low'].includes(stockStatus);

    // Auto-create an alert record for any newly low-stock product
    let alert = alerts.find(a => a.productId === product.id);
    if (needsAlert && !alert) {
      alert = {
        id: alerts.length ? Math.max(...alerts.map(a => a.id)) + 1 : 1,
        productId: product.id,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      alerts.push(alert);
      alertsModified = true;
    }

    return {
      productId:   product.id,
      sku:         product.sku,
      name:        product.name,
      category:    product.category,
      reorderPoint: product.reorderPoint,
      currentStock,
      stockStatus,
      velocity:    parseFloat(velocity.toFixed(2)),
      reorderQty,
      leadTimeDays,
      alert:       alert || null,
    };
  });

  if (alertsModified) {
    fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));
  }

  return res.status(200).json(result);
}
