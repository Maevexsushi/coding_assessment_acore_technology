import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Container, Typography, Box, Grid, Card, CardContent,
  Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, AppBar, Toolbar, Chip, Alert,
  TextField, Divider, Skeleton, Tabs, Tab, Tooltip, IconButton,
} from '@mui/material';
import { ThemeProvider, alpha } from '@mui/material/styles';
import InventoryIcon     from '@mui/icons-material/Inventory';
import WarehouseIcon     from '@mui/icons-material/Warehouse';
import CategoryIcon      from '@mui/icons-material/Category';
import NatureIcon        from '@mui/icons-material/Nature';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon     from '@mui/icons-material/Dashboard';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import ErrorIcon         from '@mui/icons-material/Error';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import InfoIcon          from '@mui/icons-material/Info';
import ShoppingCartIcon  from '@mui/icons-material/ShoppingCart';
import Brightness4Icon   from '@mui/icons-material/Brightness4';
import Brightness7Icon   from '@mui/icons-material/Brightness7';
import FileDownloadIcon  from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon  from '@mui/icons-material/PictureAsPdf';
import { useColorMode }   from '@/lib/colorModeContext';
import { createAppTheme } from '@/lib/theme';

const STATUS_CONFIG = {
  open:         { label: 'Open',         color: 'error',   icon: <ErrorIcon /> },
  acknowledged: { label: 'Acknowledged', color: 'warning', icon: <WarningAmberIcon /> },
  resolved:     { label: 'Resolved',     color: 'success', icon: <CheckCircleIcon /> },
};

const STOCK_STATUS_CONFIG = {
  out_of_stock: { label: 'Out of Stock', color: 'error' },
  critical:     { label: 'Critical',     color: 'error' },
  low:          { label: 'Low Stock',    color: 'warning' },
  adequate:     { label: 'Adequate',     color: 'success' },
  overstocked:  { label: 'Overstocked',  color: 'info' },
};

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

// ─── Alerts Page ──────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const isDark = mode === 'dark';
  const tableHead = isDark ? alpha('#2E7D32', 0.2) : '#F9FBE7';

  const [alerts,         setAlerts]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [leadTime,       setLeadTime]       = useState(7);
  const [inputLeadTime,  setInputLeadTime]  = useState('7');
  const [activeTab,      setActiveTab]      = useState(0);
  const [error,          setError]          = useState('');
  const [updating,       setUpdating]       = useState(null);

  const TAB_FILTERS = [null, 'open', 'acknowledged', 'resolved'];

  const loadAlerts = useCallback(async (lt = leadTime) => {
    setLoading(true);
    try {
      const data = await fetch(`/api/alerts?leadTime=${lt}`).then(r => r.json());
      setAlerts(data);
    } catch { setError('Failed to load alerts.'); }
    finally { setLoading(false); }
  }, [leadTime]);

  useEffect(() => { loadAlerts(); }, []);

  function applyLeadTime() {
    const val = parseInt(inputLeadTime, 10);
    if (isNaN(val) || val < 1) return;
    setLeadTime(val);
    loadAlerts(val);
  }

  async function updateStatus(alertId, status) {
    setUpdating(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok)
        setAlerts(prev => prev.map(a => a.alert?.id === alertId ? { ...a, alert: { ...a.alert, status } } : a));
    } catch { setError('Failed to update alert status.'); }
    finally { setUpdating(null); }
  }

  const alertedItems  = alerts.filter(a => a.alert !== null);
  const counts = {
    open:         alertedItems.filter(a => a.alert.status === 'open').length,
    acknowledged: alertedItems.filter(a => a.alert.status === 'acknowledged').length,
    resolved:     alertedItems.filter(a => a.alert.status === 'resolved').length,
  };

  const filterStatus = TAB_FILTERS[activeTab];
  const visible = filterStatus ? alertedItems.filter(a => a.alert.status === filterStatus) : alertedItems;

  function handleExportCSV() {
    const headers = ['Product', 'SKU', 'Category', 'Current Stock', 'Reorder Point', 'Stock Status', 'Velocity (units/day)', 'Recommended Order', 'Alert Status'];
    const rows = visible.map(i => [
      i.name, i.sku, i.category, i.currentStock, i.reorderPoint,
      STOCK_STATUS_CONFIG[i.stockStatus]?.label || i.stockStatus,
      i.velocity > 0 ? i.velocity.toFixed(2) : '0',
      i.reorderQty > 0 ? `${i.reorderQty} units` : 'No order needed',
      i.alert ? STATUS_CONFIG[i.alert.status]?.label : '—',
    ]);
    exportCSV('greensupply-alerts.csv', headers, rows);
  }

  function handleExportPDF() {
    const headers = ['Product', 'Category', 'Stock', 'Reorder Pt', 'Status', 'Velocity', 'Order Qty', 'Alert'];
    const rows = visible.map(i => [
      i.name, i.category, i.currentStock, i.reorderPoint,
      STOCK_STATUS_CONFIG[i.stockStatus]?.label || i.stockStatus,
      i.velocity > 0 ? i.velocity.toFixed(2) : '0',
      i.reorderQty > 0 ? `${i.reorderQty}` : '—',
      i.alert ? STATUS_CONFIG[i.alert.status]?.label : '—',
    ]);
    exportPDF('greensupply-alerts.pdf', 'Low Stock Alerts', headers, rows);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
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
                { href: '/',           label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> },
                { href: '/products',   label: 'Products',  icon: <CategoryIcon fontSize="small" /> },
                { href: '/warehouses', label: 'Warehouses',icon: <WarehouseIcon fontSize="small" /> },
                { href: '/stock',      label: 'Stock',     icon: <InventoryIcon fontSize="small" /> },
                { href: '/transfers',  label: 'Transfers', icon: <CompareArrowsIcon fontSize="small" /> },
                { href: '/alerts',     label: 'Alerts',    icon: <NotificationsIcon fontSize="small" /> },
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

          {/* ── Header ── */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <NotificationsIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography variant="h4" color="primary.dark">Low Stock Alerts</Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Reorder recommendations based on current stock, transfer velocity, and lead time.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {/* ── Formula Info Card ── */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3, backgroundColor: alpha('#2E7D32', isDark ? 0.08 : 0.04) }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <InfoIcon sx={{ color: 'primary.main', mt: 0.3, flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.dark" gutterBottom>
                    Reorder Quantity Formula
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1, color: 'text.primary' }}>
                    Reorder Qty = max(0, (reorderPoint × 2) − currentStock + ceil(velocity × leadTime))
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Target:</strong> 2× reorder point as a comfortable buffer. &nbsp;
                    <strong>Velocity:</strong> avg units transferred per day over the last 30 days — proxy for redistribution demand. &nbsp;
                    <strong>Safety stock:</strong> velocity × lead time covers demand while the order is in transit. &nbsp;
                    <strong>Zero velocity</strong> (no transfer history): safety stock = 0, order only to reach target.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* ── Lead Time Config + Stats ── */}
          <Grid container spacing={3} sx={{ mb: 3 }} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Lead Time (days)</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField size="small" type="number" value={inputLeadTime}
                      onChange={e => setInputLeadTime(e.target.value)}
                      inputProps={{ min: 1, max: 90 }} sx={{ width: 90 }}
                      onKeyDown={e => e.key === 'Enter' && applyLeadTime()} />
                    <Button variant="contained" size="small" onClick={applyLeadTime} sx={{ borderRadius: 2 }}>Apply</Button>
                    <Typography variant="caption" color="text.secondary">Current: {leadTime}d</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {[
              { label: 'Total Alerts', value: alertedItems.length, color: 'default' },
              { label: 'Open',         value: counts.open,         color: 'error' },
              { label: 'Acknowledged', value: counts.acknowledged, color: 'warning' },
              { label: 'Resolved',     value: counts.resolved,     color: 'success' },
            ].map(s => (
              <Grid item xs={6} sm={3} md={2} key={s.label}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {loading ? <Skeleton height={40} /> : <Typography variant="h4" fontWeight="bold">{s.value}</Typography>}
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* ── Filter Tabs + Export ── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexGrow: 1 }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
                <Tab label={`All (${alertedItems.length})`} />
                <Tab label={`Open (${counts.open})`} />
                <Tab label={`Acknowledged (${counts.acknowledged})`} />
                <Tab label={`Resolved (${counts.resolved})`} />
              </Tabs>
            </Box>
            {!loading && visible.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, ml: 2, pb: 0.5 }}>
                <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
                  onClick={handleExportCSV} sx={{ borderRadius: 2 }}>CSV</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportPDF} sx={{ borderRadius: 2 }}>PDF</Button>
              </Box>
            )}
          </Box>

          {/* ── Alert Table ── */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: tableHead }}>
                    {['Product', 'Category', 'Current Stock', 'Reorder Point', 'Stock Status',
                      'Velocity (units/day)', 'Recommended Order', 'Alert Status', 'Actions'].map(col => (
                      <TableCell key={col} sx={{ fontWeight: 700, color: 'primary.dark', whiteSpace: 'nowrap' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                      </TableRow>
                    ))
                  ) : visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <CheckCircleIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography color="text.secondary" variant="body2">
                          {filterStatus ? `No ${filterStatus} alerts.` : 'No alerts — all products are sufficiently stocked.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map(item => {
                      const stockCfg  = STOCK_STATUS_CONFIG[item.stockStatus] || STOCK_STATUS_CONFIG.adequate;
                      const alertCfg  = item.alert ? STATUS_CONFIG[item.alert.status] : null;
                      const isUpdating = updating === item.alert?.id;
                      return (
                        <TableRow key={item.productId} sx={{
                          backgroundColor:
                            item.stockStatus === 'critical' || item.stockStatus === 'out_of_stock' ? alpha('#D32F2F', 0.06)
                            : item.stockStatus === 'low' ? alpha('#F9A825', 0.06)
                            : 'inherit',
                          '&:hover': { backgroundColor: alpha('#4CAF50', 0.05) },
                        }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary" fontFamily="monospace">{item.sku}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={item.category} size="small" sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}
                              color={item.currentStock === 0 ? 'error.main' : 'text.primary'}>
                              {item.currentStock.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{item.reorderPoint.toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={stockCfg.label} color={stockCfg.color} size="small" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Avg units transferred per day (last 30 days)" arrow>
                              <Typography variant="body2">{item.velocity > 0 ? item.velocity.toFixed(2) : '—'}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {item.reorderQty > 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ShoppingCartIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" fontWeight={700} color="primary.main">
                                  {item.reorderQty.toLocaleString()} units
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">No order needed</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {alertCfg
                              ? <Chip label={alertCfg.label} color={alertCfg.color} size="small" icon={alertCfg.icon} sx={{ fontWeight: 600 }} />
                              : <Typography variant="body2" color="text.secondary">—</Typography>
                            }
                          </TableCell>
                          <TableCell>
                            {item.alert && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {item.alert.status === 'open' && (
                                  <Button size="small" variant="outlined" color="warning" disabled={isUpdating}
                                    onClick={() => updateStatus(item.alert.id, 'acknowledged')}
                                    sx={{ borderRadius: 2, fontSize: '0.7rem', py: 0.3 }}>Acknowledge</Button>
                                )}
                                {item.alert.status === 'acknowledged' && (
                                  <Button size="small" variant="outlined" color="success" disabled={isUpdating}
                                    onClick={() => updateStatus(item.alert.id, 'resolved')}
                                    sx={{ borderRadius: 2, fontSize: '0.7rem', py: 0.3 }}>Resolve</Button>
                                )}
                                {item.alert.status !== 'open' && (
                                  <Button size="small" variant="text" color="error" disabled={isUpdating}
                                    onClick={() => updateStatus(item.alert.id, 'open')}
                                    sx={{ borderRadius: 2, fontSize: '0.7rem', py: 0.3 }}>Re-open</Button>
                                )}
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Box sx={{ mt: 4, py: 2.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              GreenSupply Co — Velocity calculated over last 30 days · Lead time is configurable per session
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
