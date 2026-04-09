import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AppBar,
  Toolbar,
  Chip,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import NatureIcon from '@mui/icons-material/Nature';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DashboardIcon from '@mui/icons-material/Dashboard';

// ─── Theme (matches dashboard) ────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    primary: { main: '#2E7D32', light: '#4CAF50', dark: '#1B5E20' },
    secondary: { main: '#8BC34A' },
    warning: { main: '#F9A825' },
    error: { main: '#D32F2F' },
    success: { main: '#388E3C' },
    background: { default: '#F1F8E9' },
  },
  shape: { borderRadius: 12 },
  typography: {
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
});

const EMPTY_FORM = { productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', notes: '' };

// ─── Transfers Page ───────────────────────────────────────────────────────────
export default function Transfers() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [p, w, s, t] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/warehouses').then(r => r.json()),
        fetch('/api/stock').then(r => r.json()),
        fetch('/api/transfers').then(r => r.json()),
      ]);
      setProducts(p);
      setWarehouses(w);
      setStock(s);
      setTransfers(t);
    } catch {
      // non-fatal — page will show empty states
    } finally {
      setLoading(false);
    }
  }

  // Available quantity at source
  const availableQty = (() => {
    if (!form.productId || !form.fromWarehouseId) return null;
    const entry = stock.find(
      s => s.productId === parseInt(form.productId) && s.warehouseId === parseInt(form.fromWarehouseId)
    );
    return entry ? entry.quantity : 0;
  })();

  // Per-warehouse stock for selected product (for the info panel)
  const productDistribution = form.productId
    ? warehouses.map(w => {
        const s = stock.find(s => s.productId === parseInt(form.productId) && s.warehouseId === w.id);
        return { ...w, quantity: s ? s.quantity : 0 };
      })
    : [];

  function handleChange(field) {
    return (e) => {
      const val = e.target.value;
      setFormError('');
      setSuccessMsg('');
      if (field === 'productId') {
        // Reset warehouse selections when product changes
        setForm(prev => ({ ...prev, productId: val, fromWarehouseId: '', toWarehouseId: '', quantity: '' }));
      } else if (field === 'fromWarehouseId') {
        // Reset destination when source changes
        setForm(prev => ({ ...prev, fromWarehouseId: val, toWarehouseId: '', quantity: '' }));
      } else {
        setForm(prev => ({ ...prev, [field]: val }));
      }
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const { productId, fromWarehouseId, toWarehouseId, quantity } = form;
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return setFormError('Please fill in all required fields.');
    }
    if (fromWarehouseId === toWarehouseId) {
      return setFormError('Source and destination warehouses must be different.');
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return setFormError('Quantity must be a positive whole number.');
    }
    if (availableQty !== null && qty > availableQty) {
      return setFormError(`Insufficient stock. Only ${availableQty.toLocaleString()} units available at source.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, fromWarehouseId, toWarehouseId, quantity: qty, notes: form.notes }),
      });
      const data = await res.json();
      if (res.ok) {
        const product = products.find(p => p.id === parseInt(productId));
        const fromW = warehouses.find(w => w.id === parseInt(fromWarehouseId));
        const toW = warehouses.find(w => w.id === parseInt(toWarehouseId));
        setSuccessMsg(
          `${qty.toLocaleString()} units of "${product?.name}" transferred from ${fromW?.code} → ${toW?.code}.`
        );
        setForm(EMPTY_FORM);
        await loadData(); // Refresh stock and history
      } else {
        setFormError(data.message || 'Transfer failed. Please try again.');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function productName(id) {
    const p = products.find(p => p.id === id);
    return p ? p.name : '—';
  }
  function warehouseName(id) {
    const w = warehouses.find(w => w.id === id);
    return w ? `${w.name} (${w.code})` : '—';
  }
  function warehouseCode(id) {
    const w = warehouses.find(w => w.id === id);
    return w ? w.code : '—';
  }
  function formatDate(iso) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>

        {/* ── AppBar ── */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{ backgroundColor: 'primary.dark', borderBottom: '2px solid', borderColor: 'primary.main' }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
            <NatureIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mr: 1, letterSpacing: 0.5 }}>
              GreenSupply
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 2, borderColor: alpha('#fff', 0.3) }} />
            <Typography variant="body2" sx={{ flexGrow: 1, opacity: 0.75 }}>
              Inventory Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[
                { href: '/', label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> },
                { href: '/products', label: 'Products', icon: <CategoryIcon fontSize="small" /> },
                { href: '/warehouses', label: 'Warehouses', icon: <WarehouseIcon fontSize="small" /> },
                { href: '/stock', label: 'Stock', icon: <InventoryIcon fontSize="small" /> },
              ].map(({ href, label, icon }) => (
                <Button
                  key={href}
                  color="inherit"
                  component={Link}
                  href={href}
                  startIcon={icon}
                  sx={{
                    borderRadius: 2,
                    px: { xs: 1, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    '&:hover': { backgroundColor: alpha('#fff', 0.12) },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {label}
                  </Box>
                </Button>
              ))}
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>

          {/* ── Page Header ── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <CompareArrowsIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography variant="h4" color="primary.dark">
                Stock Transfers
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Move inventory between warehouses with full audit history
            </Typography>
          </Box>

          {/* ── Form + Info Panel ── */}
          <Grid container spacing={3} sx={{ mb: 4 }}>

            {/* Transfer Form */}
            <Grid item xs={12} md={5}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.100', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    New Transfer
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Select a product and warehouses to initiate a stock transfer.
                  </Typography>

                  {successMsg && (
                    <Alert
                      severity="success"
                      icon={<CheckCircleIcon />}
                      sx={{ mb: 2, borderRadius: 2 }}
                      onClose={() => setSuccessMsg('')}
                    >
                      {successMsg}
                    </Alert>
                  )}
                  {formError && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setFormError('')}>
                      {formError}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit} noValidate>
                    {/* Product */}
                    <FormControl fullWidth sx={{ mb: 2 }} size="small">
                      <InputLabel>Product *</InputLabel>
                      <Select
                        value={form.productId}
                        label="Product *"
                        onChange={handleChange('productId')}
                        disabled={loading}
                      >
                        {products.map(p => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({p.sku})
                            </Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* From → To warehouses */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>From *</InputLabel>
                        <Select
                          value={form.fromWarehouseId}
                          label="From *"
                          onChange={handleChange('fromWarehouseId')}
                          disabled={!form.productId || loading}
                        >
                          {warehouses.map(w => (
                            <MenuItem key={w.id} value={w.id}>
                              {w.code}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <SwapHorizIcon sx={{ color: 'primary.main', flexShrink: 0 }} />

                      <FormControl fullWidth size="small">
                        <InputLabel>To *</InputLabel>
                        <Select
                          value={form.toWarehouseId}
                          label="To *"
                          onChange={handleChange('toWarehouseId')}
                          disabled={!form.fromWarehouseId || loading}
                        >
                          {warehouses
                            .filter(w => w.id !== parseInt(form.fromWarehouseId))
                            .map(w => (
                              <MenuItem key={w.id} value={w.id}>
                                {w.code}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Available stock hint */}
                    {availableQty !== null && (
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          size="small"
                          icon={<InventoryIcon />}
                          label={`Available at source: ${availableQty.toLocaleString()} units`}
                          color={availableQty === 0 ? 'error' : availableQty < 50 ? 'warning' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                    )}

                    {/* Quantity */}
                    <TextField
                      fullWidth
                      size="small"
                      label="Quantity *"
                      type="number"
                      value={form.quantity}
                      onChange={handleChange('quantity')}
                      disabled={!form.fromWarehouseId || loading}
                      inputProps={{ min: 1, max: availableQty ?? undefined }}
                      helperText={
                        availableQty !== null && form.quantity
                          ? parseInt(form.quantity) > availableQty
                            ? `Exceeds available stock (${availableQty})`
                            : ''
                          : ''
                      }
                      error={
                        availableQty !== null &&
                        !!form.quantity &&
                        parseInt(form.quantity) > availableQty
                      }
                      sx={{ mb: 2 }}
                    />

                    {/* Notes */}
                    <TextField
                      fullWidth
                      size="small"
                      label="Notes (optional)"
                      value={form.notes}
                      onChange={handleChange('notes')}
                      multiline
                      rows={2}
                      placeholder="Reason for transfer, reference number, etc."
                      sx={{ mb: 3 }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={submitting || loading}
                      startIcon={
                        submitting
                          ? <CircularProgress size={18} color="inherit" />
                          : <LocalShippingIcon />
                      }
                      sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
                    >
                      {submitting ? 'Processing…' : 'Initiate Transfer'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Stock Distribution Panel */}
            <Grid item xs={12} md={7}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.100', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {form.productId
                      ? `Stock Distribution — ${productName(parseInt(form.productId))}`
                      : 'Stock Distribution'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {form.productId
                      ? 'Current stock levels across all warehouses for the selected product.'
                      : 'Select a product to see its current stock across all warehouses.'}
                  </Typography>

                  {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {[1, 2, 3].map(i => <Skeleton key={i} height={48} sx={{ borderRadius: 1 }} />)}
                    </Box>
                  ) : !form.productId ? (
                    <Box
                      sx={{
                        textAlign: 'center',
                        py: 6,
                        border: '2px dashed',
                        borderColor: 'grey.200',
                        borderRadius: 3,
                      }}
                    >
                      <CompareArrowsIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                      <Typography color="text.secondary" variant="body2">
                        Select a product from the form to view its warehouse distribution.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#F9FBE7' }}>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>Warehouse</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>Location</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                              Available Units
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productDistribution.map(w => (
                            <TableRow
                              key={w.id}
                              sx={{
                                backgroundColor:
                                  w.id === parseInt(form.fromWarehouseId)
                                    ? alpha('#2E7D32', 0.06)
                                    : w.id === parseInt(form.toWarehouseId)
                                    ? alpha('#1565C0', 0.06)
                                    : 'inherit',
                                '&:hover': { backgroundColor: alpha('#4CAF50', 0.04) },
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {w.code}
                                  </Typography>
                                  {w.id === parseInt(form.fromWarehouseId) && (
                                    <Chip label="FROM" size="small" color="success" sx={{ fontSize: '0.6rem', height: 18 }} />
                                  )}
                                  {w.id === parseInt(form.toWarehouseId) && (
                                    <Chip label="TO" size="small" color="primary" sx={{ fontSize: '0.6rem', height: 18 }} />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary">{w.name}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">{w.location}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  color={w.quantity === 0 ? 'error.main' : 'text.primary'}
                                >
                                  {w.quantity.toLocaleString()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Transfer History ── */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Transfer History</Typography>
            {!loading && (
              <Chip
                label={`${transfers.length} transfer${transfers.length !== 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.100', overflow: 'hidden', mb: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F9FBE7' }}>
                    {['Date & Time', 'Product', 'Route', 'Quantity', 'Notes', 'Status'].map(col => (
                      <TableCell key={col} sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <LocalShippingIcon sx={{ fontSize: 40, color: 'grey.300', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography color="text.secondary" variant="body2">
                          No transfers yet. Use the form above to move stock between warehouses.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map(t => (
                      <TableRow
                        key={t.id}
                        sx={{ '&:hover': { backgroundColor: alpha('#4CAF50', 0.04) } }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(t.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {productName(t.productId)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={warehouseCode(t.fromWarehouseId)}
                              size="small"
                              sx={{ backgroundColor: alpha('#2E7D32', 0.1), color: 'primary.dark', fontWeight: 600, fontSize: '0.7rem' }}
                            />
                            <SwapHorizIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                            <Chip
                              label={warehouseCode(t.toWarehouseId)}
                              size="small"
                              sx={{ backgroundColor: alpha('#1565C0', 0.1), color: '#1565C0', fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {t.quantity.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {t.notes || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Completed"
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* ── Footer ── */}
          <Box sx={{ mt: 4, py: 2.5, borderTop: '1px solid', borderColor: 'grey.200', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              GreenSupply Co — Sustainable Distribution Management · Stock updates are applied atomically
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
