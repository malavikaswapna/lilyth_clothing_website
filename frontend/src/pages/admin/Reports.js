import React, { useState, useEffect } from 'react';
import { 
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Eye
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import './Reports.css';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState('30');
  const [selectedReport, setSelectedReport] = useState('overview');
  
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    topProducts: [],
    salesByCategory: [],
    salesByMonth: [],
    recentTransactions: []
  });

  const [inventoryData, setInventoryData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockValue: 0,
    fastMovingProducts: [],
    slowMovingProducts: [],
    stockAlerts: []
  });

  const [customerData, setCustomerData] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    repeatCustomers: 0,
    customerGrowth: 0,
    topCustomers: [],
    customersByLocation: [],
    acquisitionChannels: []
  });

  useEffect(() => {
    loadReportsData();
  }, [selectedDateRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      const dateParams = {
        days: selectedDateRange
      };

      const [salesResponse, inventoryResponse, customersResponse] = await Promise.all([
        adminAPI.getSalesReport(dateParams),
        adminAPI.getInventoryReport(),
        adminAPI.getCustomersReport(dateParams)
      ]);

      setSalesData(salesResponse.data);
      setInventoryData(inventoryResponse.data);
      setCustomerData(customersResponse.data);
    } catch (error) {
      console.error('Failed to load reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (reportType) => {
    try {
      const response = await adminAPI.exportReport(reportType, {
        days: selectedDateRange
      });
      
      // Create and download file
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${reportType} report exported successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export ${reportType} report`);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString()}`;
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <ArrowUpRight size={16} className="growth-positive" />;
    if (growth < 0) return <ArrowDownRight size={16} className="growth-negative" />;
    return null;
  };

  if (loading) return <Loading size="lg" text="Loading reports..." />;

  return (
    <div className="admin-reports">
      <div className="reports-header">
        <div className="header-content">
          <h1>Reports & Analytics</h1>
          <p>Business insights and performance metrics</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
          <Button variant="outline" onClick={() => loadReportsData()}>
            <RefreshCw size={18} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="report-tabs">
        <button 
          className={`tab ${selectedReport === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedReport('overview')}
        >
          <BarChart3 size={20} />
          Overview
        </button>
        <button 
          className={`tab ${selectedReport === 'sales' ? 'active' : ''}`}
          onClick={() => setSelectedReport('sales')}
        >
          <DollarSign size={20} />
          Sales
        </button>
        <button 
          className={`tab ${selectedReport === 'inventory' ? 'active' : ''}`}
          onClick={() => setSelectedReport('inventory')}
        >
          <Package size={20} />
          Inventory
        </button>
        <button 
          className={`tab ${selectedReport === 'customers' ? 'active' : ''}`}
          onClick={() => setSelectedReport('customers')}
        >
          <Users size={20} />
          Customers
        </button>
      </div>

      {/* Overview Tab */}
      {selectedReport === 'overview' && (
        <div className="report-content">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card revenue">
              <div className="metric-icon">
                <DollarSign size={24} />
              </div>
              <div className="metric-content">
                <h3>{formatCurrency(salesData.totalRevenue)}</h3>
                <p>Total Revenue</p>
                <div className="metric-growth">
                  {getGrowthIcon(salesData.revenueGrowth)}
                  <span>{formatPercentage(Math.abs(salesData.revenueGrowth))}</span>
                </div>
              </div>
            </div>

            <div className="metric-card orders">
              <div className="metric-icon">
                <ShoppingCart size={24} />
              </div>
              <div className="metric-content">
                <h3>{salesData.totalOrders}</h3>
                <p>Total Orders</p>
                <div className="metric-growth">
                  {getGrowthIcon(salesData.ordersGrowth)}
                  <span>{formatPercentage(Math.abs(salesData.ordersGrowth))}</span>
                </div>
              </div>
            </div>

            <div className="metric-card customers">
              <div className="metric-icon">
                <Users size={24} />
              </div>
              <div className="metric-content">
                <h3>{customerData.totalCustomers}</h3>
                <p>Total Customers</p>
                <div className="metric-growth">
                  {getGrowthIcon(customerData.customerGrowth)}
                  <span>{formatPercentage(Math.abs(customerData.customerGrowth))}</span>
                </div>
              </div>
            </div>

            <div className="metric-card products">
              <div className="metric-icon">
                <Package size={24} />
              </div>
              <div className="metric-content">
                <h3>{inventoryData.totalProducts}</h3>
                <p>Total Products</p>
                <div className="metric-secondary">
                  <span>{inventoryData.lowStockItems} low stock</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Average Order Value</span>
              <span className="stat-value">{formatCurrency(salesData.averageOrderValue)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Conversion Rate</span>
              <span className="stat-value">{formatPercentage(salesData.conversionRate)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">New Customers</span>
              <span className="stat-value">{customerData.newCustomers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Stock Value</span>
              <span className="stat-value">{formatCurrency(inventoryData.totalStockValue)}</span>
            </div>
          </div>

          {/* Top Performing Products */}
          <div className="overview-section">
            <div className="section-header">
              <h3>Top Performing Products</h3>
              <Button variant="outline" onClick={() => exportReport('top-products')}>
                <Download size={16} />
                Export
              </Button>
            </div>
            <div className="products-list">
              {salesData.topProducts.slice(0, 5).map((product, index) => (
                <div key={product._id} className="product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <img src={product.image} alt={product.name} />
                  <div className="product-details">
                    <h4>{product.name}</h4>
                    <p>{product.sales} sales • {formatCurrency(product.revenue)}</p>
                  </div>
                  <div className="product-growth">
                    {getGrowthIcon(product.growth)}
                    <span>{formatPercentage(Math.abs(product.growth))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {selectedReport === 'sales' && (
        <div className="report-content">
          <div className="section-actions">
            <Button variant="outline" onClick={() => exportReport('sales')}>
              <Download size={16} />
              Export Sales Report
            </Button>
          </div>

          {/* Sales Summary */}
          <div className="sales-summary">
            <div className="summary-card">
              <h3>Revenue Breakdown</h3>
              <div className="summary-stats">
                <div className="summary-item">
                  <span>Gross Revenue</span>
                  <span>{formatCurrency(salesData.totalRevenue)}</span>
                </div>
                <div className="summary-item">
                  <span>Average Order Value</span>
                  <span>{formatCurrency(salesData.averageOrderValue)}</span>
                </div>
                <div className="summary-item">
                  <span>Total Orders</span>
                  <span>{salesData.totalOrders}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sales by Category */}
          <div className="chart-section">
            <h3>Sales by Category</h3>
            <div className="category-chart">
              {salesData.salesByCategory.map((category, index) => (
                <div key={category._id} className="category-bar">
                  <div className="category-info">
                    <span className="category-name">{category.name}</span>
                    <span className="category-value">{formatCurrency(category.revenue)}</span>
                  </div>
                  <div className="category-progress">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(category.revenue / salesData.totalRevenue) * 100}%`,
                        backgroundColor: `hsl(${index * 45}, 70%, 60%)`
                      }}
                    ></div>
                  </div>
                  <span className="category-percentage">
                    {formatPercentage((category.revenue / salesData.totalRevenue) * 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="transactions-section">
            <h3>Recent High-Value Transactions</h3>
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.recentTransactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td>#{transaction.orderNumber}</td>
                      <td>{transaction.customerName}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${transaction.status}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {selectedReport === 'inventory' && (
        <div className="report-content">
          <div className="section-actions">
            <Button variant="outline" onClick={() => exportReport('inventory')}>
              <Download size={16} />
              Export Inventory Report
            </Button>
          </div>

          {/* Inventory Summary */}
          <div className="inventory-summary">
            <div className="summary-grid">
              <div className="summary-card">
                <h4>Stock Overview</h4>
                <div className="stock-stats">
                  <div className="stock-item">
                    <span>Total Products</span>
                    <span>{inventoryData.totalProducts}</span>
                  </div>
                  <div className="stock-item">
                    <span>Low Stock Items</span>
                    <span className="warning">{inventoryData.lowStockItems}</span>
                  </div>
                  <div className="stock-item">
                    <span>Out of Stock</span>
                    <span className="danger">{inventoryData.outOfStockItems}</span>
                  </div>
                  <div className="stock-item">
                    <span>Total Stock Value</span>
                    <span>{formatCurrency(inventoryData.totalStockValue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="alerts-section">
            <h3>Stock Alerts</h3>
            <div className="alerts-list">
              {inventoryData.stockAlerts.map((alert) => (
                <div key={alert._id} className={`alert-item ${alert.level}`}>
                  <div className="alert-icon">
                    <Package size={20} />
                  </div>
                  <div className="alert-content">
                    <h4>{alert.productName}</h4>
                    <p>{alert.message}</p>
                  </div>
                  <div className="alert-stock">
                    <span>{alert.currentStock} left</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fast & Slow Moving Products */}
          <div className="movement-section">
            <div className="movement-grid">
              <div className="movement-card">
                <h3>Fast Moving Products</h3>
                <div className="products-list">
                  {inventoryData.fastMovingProducts.map((product, index) => (
                    <div key={product._id} className="product-row">
                      <span className="product-name">{product.name}</span>
                      <span className="product-velocity">{product.velocity} sales/day</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="movement-card">
                <h3>Slow Moving Products</h3>
                <div className="products-list">
                  {inventoryData.slowMovingProducts.map((product, index) => (
                    <div key={product._id} className="product-row">
                      <span className="product-name">{product.name}</span>
                      <span className="product-velocity">{product.daysInStock} days in stock</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {selectedReport === 'customers' && (
        <div className="report-content">
          <div className="section-actions">
            <Button variant="outline" onClick={() => exportReport('customers')}>
              <Download size={16} />
              Export Customer Report
            </Button>
          </div>

          {/* Customer Summary */}
          <div className="customer-summary">
            <div className="summary-grid">
              <div className="summary-card">
                <h4>Customer Metrics</h4>
                <div className="customer-stats">
                  <div className="customer-item">
                    <span>Total Customers</span>
                    <span>{customerData.totalCustomers}</span>
                  </div>
                  <div className="customer-item">
                    <span>New Customers</span>
                    <span>{customerData.newCustomers}</span>
                  </div>
                  <div className="customer-item">
                    <span>Repeat Customers</span>
                    <span>{customerData.repeatCustomers}</span>
                  </div>
                  <div className="customer-item">
                    <span>Customer Growth</span>
                    <span className={customerData.customerGrowth >= 0 ? 'positive' : 'negative'}>
                      {formatPercentage(customerData.customerGrowth)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="top-customers-section">
            <h3>Top Customers by Spending</h3>
            <div className="customers-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {customerData.topCustomers.map((customer) => (
                    <tr key={customer._id}>
                      <td>{customer.name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.totalOrders}</td>
                      <td>{formatCurrency(customer.totalSpent)}</td>
                      <td>{new Date(customer.lastOrder).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customers by Location */}
          <div className="location-section">
            <h3>Customers by Location</h3>
            <div className="location-chart">
              {customerData.customersByLocation.map((location, index) => (
                <div key={location._id} className="location-bar">
                  <div className="location-info">
                    <span className="location-name">{location.city}, {location.state}</span>
                    <span className="location-count">{location.count} customers</span>
                  </div>
                  <div className="location-progress">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(location.count / customerData.totalCustomers) * 100}%`,
                        backgroundColor: `hsl(${index * 30}, 60%, 55%)`
                      }}
                    ></div>
                  </div>
                  <span className="location-percentage">
                    {formatPercentage((location.count / customerData.totalCustomers) * 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;