// pages/api/transfers/[id].js
import fs from 'fs';
import path from 'path';

const transfersPath = path.join(process.cwd(), 'data', 'transfers.json');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;
  const transfers = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
  const transfer = transfers.find(t => t.id === parseInt(id, 10));

  if (!transfer) {
    return res.status(404).json({ message: 'Transfer not found.' });
  }

  return res.status(200).json(transfer);
}
