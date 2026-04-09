// pages/api/products/[id].js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { id } = req.query;
  const filePath = path.join(process.cwd(), 'data', 'products.json');
  const jsonData = fs.readFileSync(filePath);
  let products = JSON.parse(jsonData);

  if (req.method === 'GET') {
    const product = products.find((p) => p.id === parseInt(id));
    if (product) {
      res.status(200).json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } else if (req.method === 'PUT') {
    const index = products.findIndex((p) => p.id === parseInt(id));
    if (index !== -1) {
      // BUG FIX: previously used parseInt() for ALL numeric fields, which
      // truncated unitCost decimals (e.g. 0.85 → 0, 2.50 → 2) on every save.
      // This caused inventory values on the dashboard to silently drift lower
      // each time a product was edited. Fix: use parseFloat for unitCost and
      // parseInt only for reorderPoint, which is always a whole number.
      products[index] = {
        ...products[index],
        ...req.body,
        id: parseInt(id),
        unitCost: parseFloat(req.body.unitCost),
        reorderPoint: parseInt(req.body.reorderPoint),
      };
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
      res.status(200).json(products[index]);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } else if (req.method === 'DELETE') {
    const index = products.findIndex((p) => p.id === parseInt(id));
    if (index !== -1) {
      products.splice(index, 1);
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
      res.status(204).end();
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}

