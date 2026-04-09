import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Container, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, AppBar, Toolbar, Box, Divider, Tooltip,
} from '@mui/material';
import { ThemeProvider, alpha } from '@mui/material/styles';
import DeleteIcon        from '@mui/icons-material/Delete';
import EditIcon          from '@mui/icons-material/Edit';
import InventoryIcon     from '@mui/icons-material/Inventory';
import WarehouseIcon     from '@mui/icons-material/Warehouse';
import CategoryIcon      from '@mui/icons-material/Category';
import NatureIcon        from '@mui/icons-material/Nature';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DashboardIcon     from '@mui/icons-material/Dashboard';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon   from '@mui/icons-material/Brightness4';
import Brightness7Icon   from '@mui/icons-material/Brightness7';
import FileDownloadIcon  from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon  from '@mui/icons-material/PictureAsPdf';
import { useColorMode }   from '@/lib/colorModeContext';
import { createAppTheme } from '@/lib/theme';

function exportCSV(filename, headers, rows) {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
}

async function exportPDF(filename, title, headers, rows) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text(title, 14, 15);
  doc.setFontSize(9);  doc.text(`GreenSupply Co — ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 22);
  autoTable(doc, { head: [headers], body: rows, startY: 28, headStyles: { fillColor: [46, 125, 50] } });
  doc.save(filename);
}

export default function Products() {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const isDark = mode === 'dark';

  const [products,           setProducts]           = useState([]);
  const [open,               setOpen]               = useState(false);
  const [selectedProductId,  setSelectedProductId]  = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = () => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  };

  const handleClickOpen = (id) => { setSelectedProductId(id); setOpen(true); };
  const handleClose     = () =>    { setOpen(false); setSelectedProductId(null); };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${selectedProductId}`, { method: 'DELETE' });
      if (res.ok) { setProducts(products.filter(p => p.id !== selectedProductId)); handleClose(); }
    } catch (error) { console.error('Error deleting product:', error); }
  };

  function handleExportCSV() {
    const headers = ['SKU', 'Name', 'Category', 'Unit Cost', 'Reorder Point'];
    const rows = products.map(p => [p.sku, p.name, p.category, `$${p.unitCost.toFixed(2)}`, p.reorderPoint]);
    exportCSV('greensupply-products.csv', headers, rows);
  }

  function handleExportPDF() {
    const headers = ['SKU', 'Name', 'Category', 'Unit Cost', 'Reorder Point'];
    const rows = products.map(p => [p.sku, p.name, p.category, `$${p.unitCost.toFixed(2)}`, p.reorderPoint]);
    exportPDF('greensupply-products.pdf', 'Products Catalog', headers, rows);
  }

  const tableHead = isDark ? alpha('#2E7D32', 0.2) : undefined;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
        <AppBar position="sticky" elevation={0}
          sx={{ backgroundColor: 'primary.dark', borderBottom: '2px solid', borderColor: 'primary.main' }}>
          <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
            <NatureIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mr: 1, letterSpacing: 0.5 }}>GreenSupply</Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 2, borderColor: alpha('#fff', 0.3) }} />
            <Typography variant="body2" sx={{ flexGrow: 1, opacity: 0.75 }}>Inventory Management</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {[
                { href: '/',           label: 'Dashboard',    icon: <DashboardIcon fontSize="small" /> },
                { href: '/products',   label: 'Products',     icon: <CategoryIcon fontSize="small" /> },
                { href: '/warehouses', label: 'Warehouses',   icon: <WarehouseIcon fontSize="small" /> },
                { href: '/stock',      label: 'Stock Levels', icon: <InventoryIcon fontSize="small" /> },
                { href: '/transfers',  label: 'Transfers',    icon: <CompareArrowsIcon fontSize="small" /> },
                { href: '/alerts',     label: 'Alerts',       icon: <NotificationsIcon fontSize="small" /> },
              ].map(({ href, label, icon }) => (
                <Button key={href} color="inherit" component={Link} href={href} startIcon={icon}
                  sx={{ borderRadius: 2, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    '&:hover': { backgroundColor: alpha('#fff', 0.12) } }}>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{label}</Box>
                </Button>
              ))}
              <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                <IconButton color="inherit" onClick={toggleColorMode} sx={{ ml: 0.5 }}>
                  {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Container sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">Products</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
                onClick={handleExportCSV} sx={{ borderRadius: 2 }}>CSV</Button>
              <Button size="small" variant="outlined" color="error" startIcon={<PictureAsPdfIcon />}
                onClick={handleExportPDF} sx={{ borderRadius: 2 }}>PDF</Button>
              <Button variant="contained" color="primary" component={Link} href="/products/add">
                Add Product
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: tableHead }}>
                  <TableCell><strong>SKU</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell align="right"><strong>Unit Cost</strong></TableCell>
                  <TableCell align="right"><strong>Reorder Point</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">${product.unitCost.toFixed(2)}</TableCell>
                    <TableCell align="right">{product.reorderPoint}</TableCell>
                    <TableCell>
                      <IconButton color="primary" component={Link} href={`/products/edit/${product.id}`} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleClickOpen(product.id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No products available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogContent>
              <DialogContentText>Are you sure you want to delete this product? This action cannot be undone.</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">Cancel</Button>
              <Button onClick={handleDelete} color="error" autoFocus>Delete</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
