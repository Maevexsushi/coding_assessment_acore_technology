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
import { useColorMode }   from '@/lib/colorModeContext';
import { createAppTheme } from '@/lib/theme';

export default function Stock() {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const isDark = mode === 'dark';

  const [stock,          setStock]          = useState([]);
  const [products,       setProducts]       = useState([]);
  const [warehouses,     setWarehouses]     = useState([]);
  const [open,           setOpen]           = useState(false);
  const [selectedStockId,setSelectedStockId]= useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = () => {
    Promise.all([
      fetch('/api/stock').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
    ]).then(([s, p, w]) => { setStock(s); setProducts(p); setWarehouses(w); });
  };

  const getProductName  = id => { const p = products.find(p => p.id === id);   return p ? `${p.name} (${p.sku})` : 'Unknown'; };
  const getWarehouseName= id => { const w = warehouses.find(w => w.id === id); return w ? `${w.name} (${w.code})` : 'Unknown'; };

  const handleClickOpen = (id) => { setSelectedStockId(id); setOpen(true); };
  const handleClose     = () =>    { setOpen(false); setSelectedStockId(null); };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/stock/${selectedStockId}`, { method: 'DELETE' });
      if (res.ok) { setStock(stock.filter(item => item.id !== selectedStockId)); handleClose(); }
    } catch (error) { console.error('Error deleting stock:', error); }
  };

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
            <Typography variant="h4" component="h1">Stock Levels</Typography>
            <Button variant="contained" color="primary" component={Link} href="/stock/add">
              Add Stock Record
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: tableHead }}>
                  <TableCell><strong>Product</strong></TableCell>
                  <TableCell><strong>Warehouse</strong></TableCell>
                  <TableCell align="right"><strong>Quantity</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stock.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{getProductName(item.productId)}</TableCell>
                    <TableCell>{getWarehouseName(item.warehouseId)}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>
                      <IconButton color="primary" component={Link} href={`/stock/edit/${item.id}`} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleClickOpen(item.id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {stock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No stock records available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Delete Stock Record</DialogTitle>
            <DialogContent>
              <DialogContentText>Are you sure you want to delete this stock record? This action cannot be undone.</DialogContentText>
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
