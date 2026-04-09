// pages/api/alerts/[id].js
import fs from 'fs';
import path from 'path';

const alertsPath = path.join(process.cwd(), 'data', 'alerts.json');
const VALID_STATUSES = ['open', 'acknowledged', 'resolved'];

export default function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  const alerts = JSON.parse(fs.readFileSync(alertsPath, 'utf8'));
  const index  = alerts.findIndex(a => a.id === parseInt(id, 10));

  if (index === -1) {
    return res.status(404).json({ message: 'Alert not found.' });
  }

  alerts[index] = { ...alerts[index], status, updatedAt: new Date().toISOString() };
  fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));

  return res.status(200).json(alerts[index]);
}
