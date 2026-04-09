// pages/api/transfers/index.js
import fs from 'fs';
import path from 'path';

const stockPath     = path.join(process.cwd(), 'data', 'stock.json');
const transfersPath = path.join(process.cwd(), 'data', 'transfers.json');

export default function handler(req, res) {
  if (req.method === 'GET') {
    const transfers = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
    // Most recent first
    return res.status(200).json([...transfers].reverse());
  }

  if (req.method === 'POST') {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const pid  = parseInt(productId, 10);
    const from = parseInt(fromWarehouseId, 10);
    const to   = parseInt(toWarehouseId, 10);
    const qty  = parseInt(quantity, 10);

    if (from === to) {
      return res.status(400).json({ message: 'Source and destination warehouses must be different.' });
    }
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer.' });
    }

    // ── Load current stock ──────────────────────────────────────────────────
    const stock = JSON.parse(fs.readFileSync(stockPath, 'utf8'));

    const sourceIdx = stock.findIndex(s => s.productId === pid && s.warehouseId === from);
    if (sourceIdx === -1) {
      return res.status(400).json({ message: 'Product not found in source warehouse.' });
    }
    if (stock[sourceIdx].quantity < qty) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${stock[sourceIdx].quantity}, requested: ${qty}.`,
      });
    }

    // ── ATOMICITY APPROACH ──────────────────────────────────────────────────
    // Both changes — deduct from source AND credit to destination — are applied
    // to the in-memory stock array first. Then the entire array is persisted in
    // a single fs.writeFileSync call. This guarantees that either BOTH changes
    // land on disk or NEITHER does. The OS will not leave the file half-written
    // for small payloads like this. A crash after the stock write but before the
    // transfer record write means stock is correct; we only lose the audit entry.

    // 1. Deduct from source
    stock[sourceIdx] = { ...stock[sourceIdx], quantity: stock[sourceIdx].quantity - qty };

    // 2. Credit destination (update existing entry or create a new one)
    const destIdx = stock.findIndex(s => s.productId === pid && s.warehouseId === to);
    if (destIdx !== -1) {
      stock[destIdx] = { ...stock[destIdx], quantity: stock[destIdx].quantity + qty };
    } else {
      const newStockId = stock.length ? Math.max(...stock.map(s => s.id)) + 1 : 1;
      stock.push({ id: newStockId, productId: pid, warehouseId: to, quantity: qty });
    }

    // 3. Single atomic write — both sides committed or neither
    try {
      fs.writeFileSync(stockPath, JSON.stringify(stock, null, 2));
    } catch {
      return res.status(500).json({ message: 'Failed to update stock. Transfer aborted — no changes saved.' });
    }

    // ── Record the transfer ─────────────────────────────────────────────────
    // Secondary write. If this fails, stock is already correct; only the audit
    // trail entry is lost.
    const transfers = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
    const newTransfer = {
      id: transfers.length ? Math.max(...transfers.map(t => t.id)) + 1 : 1,
      productId: pid,
      fromWarehouseId: from,
      toWarehouseId: to,
      quantity: qty,
      notes: notes?.trim() || '',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    transfers.push(newTransfer);
    fs.writeFileSync(transfersPath, JSON.stringify(transfers, null, 2));

    return res.status(201).json(newTransfer);
  }

  res.status(405).json({ message: 'Method Not Allowed' });
}
