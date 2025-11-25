const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '*SaRc1234#',
  database: process.env.DB_NAME || 'gensoft_logistics'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL Database!');
});

// Test Route
app.get('/', (req, res) => {
  res.json({ message: '🚀 Backend API is running!' });
});

// ==================== API ENDPOINTS ====================

// 1. Get Financial Summary
app.get('/api/financial/summary', (req, res) => {
  const query = `
    SELECT 
      SUM(inv_tot) as total_revenue,
      COUNT(*) as total_invoices,
      AVG(inv_tot) as avg_invoice_value
    FROM tbl_invoice
    WHERE inv_cancelled_status = 0
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results[0]);
  });
});

// 2. Get Revenue by Month
app.get('/api/financial/revenue-by-month', (req, res) => {
  const query = `
    SELECT 
      DATE_FORMAT(inv_date, '%Y-%m') as month,
      SUM(inv_tot) as revenue,
      COUNT(*) as invoice_count
    FROM tbl_invoice
    WHERE inv_cancelled_status = 0
    GROUP BY DATE_FORMAT(inv_date, '%Y-%m')
    ORDER BY month DESC
    LIMIT 12
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 3. Get Outstanding Invoices by Aging
app.get('/api/financial/outstanding', (req, res) => {
  const query = `
    SELECT 
      CASE 
        WHEN DATEDIFF(NOW(), inv_date) <= 30 THEN '0-30 days'
        WHEN DATEDIFF(NOW(), inv_date) <= 60 THEN '31-60 days'
        WHEN DATEDIFF(NOW(), inv_date) <= 90 THEN '61-90 days'
        ELSE '90+ days'
      END as aging_category,
      SUM(inv_tot) as amount,
      COUNT(*) as count
    FROM tbl_invoice
    WHERE acc_post = 0 AND inv_cancelled_status = 0
    GROUP BY aging_category
    ORDER BY 
      CASE aging_category
        WHEN '0-30 days' THEN 1
        WHEN '31-60 days' THEN 2
        WHEN '61-90 days' THEN 3
        ELSE 4
      END
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 4. Get Booking Statistics
app.get('/api/operational/bookings', (req, res) => {
  const query = `
    SELECT 
      b_status,
      COUNT(*) as count,
      SUM(bk_chgs_tot_selling) as total_value
    FROM tbl_booking
    GROUP BY b_status
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 5. Get Top Routes
app.get('/api/operational/top-routes', (req, res) => {
  const query = `
    SELECT 
      CONCAT(b_v_load_port, ' → ', b_v_dis_port) as route,
      COUNT(*) as volume,
      SUM(bk_chgs_tot_selling) as value
    FROM tbl_booking
    WHERE b_v_load_port IS NOT NULL AND b_v_dis_port IS NOT NULL
    GROUP BY route
    ORDER BY volume DESC
    LIMIT 10
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 6. Get Top Customers
app.get('/api/customers/top', (req, res) => {
  const query = `
    SELECT 
      client_id,
      inv_name as client_name,
      COUNT(*) as booking_count,
      SUM(inv_tot) as total_revenue
    FROM tbl_invoice
    WHERE inv_cancelled_status = 0
    GROUP BY client_id, inv_name
    ORDER BY total_revenue DESC
    LIMIT 10
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 7. Get Customer Segmentation
app.get('/api/customers/segmentation', (req, res) => {
  const query = `
    SELECT 
      CASE 
        WHEN total_revenue > 1000000 THEN 'VIP (>1M)'
        WHEN total_revenue > 500000 THEN 'Premium (500K-1M)'
        WHEN total_revenue > 100000 THEN 'Standard (100K-500K)'
        ELSE 'New (<100K)'
      END as segment,
      COUNT(*) as customer_count,
      SUM(total_revenue) as segment_revenue
    FROM (
      SELECT 
        client_id,
        SUM(inv_tot) as total_revenue
      FROM tbl_invoice
      WHERE inv_cancelled_status = 0
      GROUP BY client_id
    ) as customer_totals
    GROUP BY segment
    ORDER BY segment_revenue DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// 8. Get Recent Activities
app.get('/api/activities/recent', (req, res) => {
  const query = `
    SELECT 
      activity_module,
      activity_action,
      activity_desc,
      activity_datetime,
      user_id
    FROM tbl_activity_log
    ORDER BY activity_datetime DESC
    LIMIT 20
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API ready to serve data!`);
});
