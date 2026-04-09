import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Container, Typography, Box, Grid, Card, CardContent,
  Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, AppBar, Toolbar, Chip, Alert,
  Divider, Skeleton, IconButton, Tooltip,
} from '@mui/material';
import { ThemeProvider, alpha, useTheme } from '@mui/material/styles';
import InventoryIcon        from '@mui/icons-material/Inventory';
import WarehouseIcon        from '@mui/icons-material/Warehouse';
import CategoryIcon         from '@mui/icons-material/Category';
import AttachMoneyIcon      from '@mui/icons-material/AttachMoney';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import ErrorIcon            from '@mui/icons-material/Error';
import NatureIcon           from '@mui/icons-material/Nature';
import LocalShippingIcon    from '@mui/icons-material/LocalShipping';
import CompareArrowsIcon    from '@mui/icons-material/CompareArrows';
import DashboardIcon        from '@mui/icons-material/Dashboard';
import NotificationsIcon    from '@mui/icons-material/Notifications';
import Brightness4Icon      from '@mui/icons-material/Brightness4';
import Brightness7Icon      from '@mui/icons-material/Brightness7';
import FileDownloadIcon     from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon     from '@mui/icons-material/PictureAsPdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useColorMode }   from '@/lib/colorModeContext';
import { createAppTheme } from '@/lib/theme';

const PIE_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
const CATEGORY_COLORS = { Utensils: '#4CAF50', Packaging: '#2196F3', Cups: '#FF9800' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStockStatus(quantity, reorderPoint) {
  if (quantity === 0)                    return { label: 'Out of Stock', color: 'error' };
  if (quantity < reorderPoint * 0.5)    return { label: 'Critical',     color: 'error' };
  if (quantity < reorderPoint)           return { label: 'Low Stock',    color: 'warning' };
  if (quantity < reorderPoint * 2)       return { label: 'Adequate',     color: 'success' };
  return                                        { label: 'Well Stocked', color: 'info' };
}

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
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`GreenSupply Co — ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 22);
  autoTable(doc, { head: [headers], body: rows, startY: 28, headStyles: { fillColor: [46, 125, 50] } });
  doc.save(filename);
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ icon, title, value, subtitle, accentColor, loading }) {
  const theme = useTheme();
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        background: `linear-gradient(135deg, ${alpha(accentColor, 0.08)} 0%, ${theme.palette.background.paper} 60%)`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          backgroundColor: alpha(accentColor, 0.14),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor, mb: 2,
        }}>
          {icon}
        </Box>
        {loading
          ? <Skeleton variant="text" width="55%" height={52} />
          : <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mb: 0.5 }}>{value}</Typography>
        }
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: accentColor, fontWeight: 600 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Home() {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const isDark = mode === 'dark';

  const [products,   setProducts]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock,      setStock]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
      fetch('/api/stock').then(r => r.json()),
    ])
      .then(([p, w, s]) => { setProducts(p); setWarehouses(w); setStock(s); setLoading(false); })
      .catch(() => { setError('Failed to load dashboard data. Please refresh the page.'); setLoading(false); });
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalValue = stock.reduce((sum, item) => {
    const p = products.find(p => p.id === item.productId);
    return sum + (p ? p.unitCost * item.quantity : 0);
  }, 0);

  const inventoryOverview = products.map(product => {
    const ps = stock.filter(s => s.productId === product.id);
    const totalQuantity = ps.reduce((sum, s) => sum + s.quantity, 0);
    return { ...product, totalQuantity, status: getStockStatus(totalQuantity, product.reorderPoint) };
  });

  const lowStockCount = inventoryOverview.filter(i => i.totalQuantity < i.reorderPoint).length;

  const stockChartData = inventoryOverview.map(p => ({
    name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
    stock: p.totalQuantity,
    reorder: p.reorderPoint,
  }));

  const categoryValueMap = {};
  inventoryOverview.forEach(p => {
    categoryValueMap[p.category] = (categoryValueMap[p.category] || 0) + p.totalQuantity * p.unitCost;
  });
  const categoryChartData = Object.entries(categoryValueMap).map(([name, value]) => ({
    name, value: parseFloat(value.toFixed(2)),
  }));

  const warehouseStats = warehouses.map(w => {
    const ws = stock.filter(s => s.warehouseId === w.id);
    const totalItems = ws.reduce((sum, s) => sum + s.quantity, 0);
    const totalVal   = ws.reduce((sum, s) => {
      const p = products.find(p => p.id === s.productId);
      return sum + (p ? p.unitCost * s.quantity : 0);
    }, 0);
    return { ...w, totalItems, totalVal, skuCount: ws.length };
  });

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExportCSV() {
    const headers = ['SKU', 'Product Name', 'Category', 'Unit Cost', 'Total Stock', 'Reorder Point', 'Status'];
    const rows = inventoryOverview.map(i => [
      i.sku, i.name, i.category, `$${i.unitCost.toFixed(2)}`,
      i.totalQuantity, i.reorderPoint, i.status.label,
    ]);
    exportCSV('greensupply-inventory.csv', headers, rows);
  }

  function handleExportPDF() {
    const headers = ['SKU', 'Product', 'Category', 'Unit Cost', 'Stock', 'Reorder Pt', 'Status'];
    const rows = inventoryOverview.map(i => [
      i.sku, i.name, i.category, `$${i.unitCost.toFixed(2)}`,
      i.totalQuantity, i.reorderPoint, i.status.label,
    ]);
    exportPDF('greensupply-inventory.pdf', 'Inventory Overview', headers, rows);
  }

  // ── Chart axis colors ────────────────────────────────────────────────────────
  const axisColor  = isDark ? '#aaa' : '#666';
  const gridColor  = isDark ? '#333' : '#f0f0f0';
  const ttStyle    = { borderRadius: 8, border: `1px solid ${isDark ? '#444' : '#e0e0e0'}`, backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary };
  const tableHead  = isDark ? alpha('#2E7D32', 0.2) : '#F9FBE7';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>

        {/* ── AppBar ── */}
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

        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          {/* ── Page Header ── */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" color="primary.dark" gutterBottom>Operations Dashboard</Typography>
            <Typography variant="body1" color="text.secondary">
              Real-time inventory overview across all GreenSupply warehouse locations
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          {/* ── KPI Cards ── */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<CategoryIcon />} title="Total Products"
                value={loading ? null : products.length} subtitle="Active SKUs in catalog"
                accentColor="#2E7D32" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<WarehouseIcon />} title="Active Warehouses"
                value={loading ? null : warehouses.length} subtitle="Across North America"
                accentColor="#1565C0" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<AttachMoneyIcon />} title="Total Inventory Value"
                value={loading ? null : `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Across all warehouses" accentColor="#6A1B9A" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Box component={Link} href="/alerts" sx={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <MetricCard icon={<WarningAmberIcon />} title="Low Stock Alerts"
                  value={loading ? null : lowStockCount}
                  subtitle={loading ? null : lowStockCount > 0 ? `${lowStockCount} product(s) — click to manage` : 'All products well-stocked'}
                  accentColor={lowStockCount > 0 ? '#E65100' : '#2E7D32'} loading={loading} />
              </Box>
            </Grid>
          </Grid>

          {/* ── Charts ── */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} lg={7}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Stock Levels by Product</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Current quantity vs. reorder threshold
                </Typography>
                {loading ? <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stockChartData} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                      <RechartsTooltip contentStyle={ttStyle}
                        formatter={(v, n) => [v.toLocaleString(), n === 'stock' ? 'Current Stock' : 'Reorder Point']} />
                      <Legend verticalAlign="top" align="right" formatter={v => v === 'stock' ? 'Current Stock' : 'Reorder Point'} />
                      <Bar dataKey="stock" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reorder" fill="#FFCC02" radius={[4, 4, 0, 0]} opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Inventory Value by Category</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Distribution of total value across product categories
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                    <Skeleton variant="circular" width={220} height={220} />
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryChartData} cx="50%" cy="45%" outerRadius={95} innerRadius={52}
                        dataKey="value" paddingAngle={3}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {categoryChartData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={v => [`$${v.toFixed(2)}`, 'Inventory Value']} contentStyle={ttStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Grid>
          </Grid>

          {/* ── Warehouse Cards ── */}
          <Typography variant="h5" sx={{ mb: 2 }}>Warehouse Overview</Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {loading
              ? [1, 2, 3].map(i => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))
              : warehouseStats.map((w, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={w.id}>
                    <Card elevation={0} sx={{
                      border: '1px solid', borderColor: 'divider',
                      borderLeft: '4px solid', borderLeftColor: PIE_COLORS[idx % PIE_COLORS.length],
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                    }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                            <Typography variant="h6">{w.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              <LocalShippingIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'middle' }} />
                              {w.location} · {w.code}
                            </Typography>
                          </Box>
                          <WarehouseIcon sx={{ color: PIE_COLORS[idx % PIE_COLORS.length], fontSize: 30 }} />
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Grid container spacing={1} textAlign="center">
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" display="block">SKUs</Typography>
                            <Typography variant="h6">{w.skuCount}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Total Units</Typography>
                            <Typography variant="h6">{w.totalItems.toLocaleString()}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Value</Typography>
                            <Typography variant="h6">${w.totalVal.toFixed(0)}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
            }
          </Grid>

          {/* ── Inventory Table ── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5">Inventory Overview</Typography>
              {!loading && lowStockCount > 0 && (
                <Chip icon={<WarningAmberIcon />}
                  label={`${lowStockCount} item${lowStockCount !== 1 ? 's' : ''} need attention`}
                  color="warning" variant="outlined" />
              )}
            </Box>
            {!loading && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
                  onClick={handleExportCSV} sx={{ borderRadius: 2 }}>
                  CSV
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportPDF} sx={{ borderRadius: 2 }}>
                  PDF
                </Button>
              </Box>
            )}
          </Box>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: tableHead }}>
                    {['SKU', 'Product Name', 'Category', 'Unit Cost', 'Total Stock', 'Reorder Point', 'Status'].map((col, i) => (
                      <TableCell key={col} align={i >= 3 && i <= 5 ? 'right' : 'left'}
                        sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                        </TableRow>
                      ))
                    : inventoryOverview.map(item => (
                        <TableRow key={item.id} sx={{
                          backgroundColor:
                            item.totalQuantity < item.reorderPoint * 0.5 ? alpha('#D32F2F', 0.06)
                            : item.totalQuantity < item.reorderPoint ? alpha('#F9A825', 0.06)
                            : 'inherit',
                          '&:hover': { backgroundColor: alpha('#4CAF50', 0.06) },
                        }}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="primary.main">
                              {item.sku}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant="body2" fontWeight={500}>{item.name}</Typography></TableCell>
                          <TableCell>
                            <Chip label={item.category} size="small" sx={{
                              backgroundColor: alpha(CATEGORY_COLORS[item.category] || '#9C27B0', 0.12),
                              color: CATEGORY_COLORS[item.category] || '#9C27B0',
                              fontWeight: 600, fontSize: '0.7rem',
                            }} />
                          </TableCell>
                          <TableCell align="right"><Typography variant="body2">${item.unitCost.toFixed(2)}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={600}>{item.totalQuantity.toLocaleString()}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" color="text.secondary">{item.reorderPoint.toLocaleString()}</Typography></TableCell>
                          <TableCell>
                            <Chip label={item.status.label} color={item.status.color} size="small"
                              icon={item.status.color === 'error' ? <ErrorIcon /> : item.status.color === 'warning' ? <WarningAmberIcon /> : <CheckCircleIcon />}
                              sx={{ fontWeight: 600 }} />
                          </TableCell>
                        </TableRow>
                      ))
                  }
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* ── Footer ── */}
          <Box sx={{ mt: 5, py: 2.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              GreenSupply Co — Sustainable Distribution Management · Data refreshes on page load
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
