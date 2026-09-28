
-- Strumpan test queries
-- Run schema_strumpan.sql and seed_data.sql before this file.

-- ============================================================================
-- 1. Show all orders for a specific customer (by email)
-- ============================================================================

SELECT
    o.order_id,
    o.order_date,
    o.order_status,
    o.total_cost,
    c.name AS customer_name,
    c.email AS customer_email
FROM Orders o
JOIN Customers c ON o.customer_id = c.customer_id
WHERE c.email = 'anna.svensson@example.test'
ORDER BY o.order_date DESC;


-- ============================================================================
-- 2. Show inventory status per product variant
-- ============================================================================

SELECT
    p.product_name,
    pv.product_variant_size,
    pv.color,
    pv.sku,
    i.quantity AS stock_quantity,
    i.last_updated
FROM Product_variants pv
JOIN Products p ON pv.product_id = p.product_id
JOIN Inventory i ON pv.variant_id = i.variant_id
ORDER BY p.product_name, pv.product_variant_size;


-- ============================================================================
-- 3. Show revenue per category this month
-- ============================================================================

SELECT
    cat.category_name,
    SUM(oi.quantity * oi.unit_price) AS revenue_this_month
FROM Order_items oi
JOIN Product_variants pv ON oi.variant_id = pv.variant_id
JOIN Products p ON pv.product_id = p.product_id
JOIN Categories cat ON p.category_id = cat.category_id
JOIN Orders o ON oi.order_id = o.order_id
WHERE o.order_status NOT IN ('cancelled', 'returned')
  AND o.order_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
GROUP BY cat.category_name
ORDER BY revenue_this_month DESC;


-- ============================================================================
-- 4. Show all admins and their roles
-- ============================================================================

SELECT
    a.admin_id,
    a.admin_name,
    a.email,
    r.role_name,
    r.roles_description
FROM Admins a
JOIN Roles r ON a.role_id = r.role_id
ORDER BY a.admin_id;


-- ============================================================================
-- 5. Show order details with items, payments and shipments
-- ============================================================================

SELECT
    o.order_id,
    o.order_date,
    o.order_status,
    o.total_cost,
    c.name AS customer_name,
    oi.quantity AS item_quantity,
    p.product_name,
    pv.product_variant_size,
    pv.color,
    pv.sku,
    oi.unit_price,
    pay.payment_method,
    pay.payment_status,
    pay.transaction_id,
    sh.tracking_number,
    sh.status AS shipment_status
FROM Orders o
JOIN Customers c ON o.customer_id = c.customer_id
JOIN Order_items oi ON o.order_id = oi.order_id
JOIN Product_variants pv ON oi.variant_id = pv.variant_id
JOIN Products p ON pv.product_id = p.product_id
LEFT JOIN Payments pay ON o.order_id = pay.order_id
LEFT JOIN Shipments sh ON o.order_id = sh.order_id
WHERE o.order_id = 2
ORDER BY oi.order_item_id;


-- ============================================================================
-- 6. Show low stock variants (quantity < 15)
-- ============================================================================

SELECT
    p.product_name,
    pv.product_variant_size,
    pv.color,
    pv.sku,
    i.quantity AS stock_quantity
FROM Inventory i
JOIN Product_variants pv ON i.variant_id = pv.variant_id
JOIN Products p ON pv.product_id = p.product_id
WHERE i.quantity < 15
ORDER BY i.quantity ASC;


-- ============================================================================
-- 7. Show audit log with admin names
-- ============================================================================

SELECT
    al.log_id,
    al.time_stamp,
    al.handling,
    al.table_name,
    al.record_id,
    al.details,
    a.admin_name,
    a.email AS admin_email
FROM Audit_log al
JOIN Admins a ON al.admin_id = a.admin_id
ORDER BY al.time_stamp DESC;


-- ============================================================================
-- 8. Show customers with their addresses
-- ============================================================================

SELECT
    c.customer_id,
    c.name AS customer_name,
    c.email,
    a.type AS address_type,
    a.street,
    a.postal_code,
    a.city,
    a.country
FROM Customers c
JOIN Addresses a ON c.customer_id = a.customer_id
ORDER BY c.customer_id, a.type;


-- ============================================================================
-- 9. Show total orders and revenue per customer
-- ============================================================================

SELECT
    c.customer_id,
    c.name AS customer_name,
    c.email,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total_cost) AS total_revenue
FROM Customers c
LEFT JOIN Orders o ON c.customer_id = o.customer_id
WHERE o.order_status NOT IN ('cancelled', 'returned') OR o.order_id IS NULL
GROUP BY c.customer_id, c.name, c.email
ORDER BY total_revenue DESC;


-- ============================================================================
-- 10. Show shipment status per order
-- ============================================================================

SELECT
    o.order_id,
    o.order_status,
    sh.shipment_id,
    sh.carrier,
    sh.tracking_number,
    sh.status AS shipment_status,
    sh.shipped_date,
    sh.delivered_date
FROM Orders o
LEFT JOIN Shipments sh ON o.order_id = sh.order_id
ORDER BY o.order_id, sh.shipment_id;