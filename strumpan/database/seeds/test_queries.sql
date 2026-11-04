-- Strumpan test queries
-- Run schema_strumpan.sql and seed_data.sql before this file.
-- Each test has an EXPECTED comment describing the correct result.


-- ############################################################################
-- PART 1: SIMPLE TESTS
-- ############################################################################

-- S1. Row count per table
-- EXPECTED (table -> rows):
--   Roles 3, Permissions 5, Role_permissions 9, Admins 3, Audit_log 2,
--   Customers 3, Addresses 6, Categories 3, Products 3, Product_variants 6,
--   Inventory 6, Orders 3, Order_items 4, Payments 3, Shipments 2, Shipment_items 3
SELECT 'Roles' AS tbl, COUNT(*) AS cnt FROM Roles
UNION ALL SELECT 'Permissions', COUNT(*) FROM Permissions
UNION ALL SELECT 'Role_permissions', COUNT(*) FROM Role_permissions
UNION ALL SELECT 'Admins', COUNT(*) FROM Admins
UNION ALL SELECT 'Audit_log', COUNT(*) FROM Audit_log
UNION ALL SELECT 'Customers', COUNT(*) FROM Customers
UNION ALL SELECT 'Addresses', COUNT(*) FROM Addresses
UNION ALL SELECT 'Categories', COUNT(*) FROM Categories
UNION ALL SELECT 'Products', COUNT(*) FROM Products
UNION ALL SELECT 'Product_variants', COUNT(*) FROM Product_variants
UNION ALL SELECT 'Inventory', COUNT(*) FROM Inventory
UNION ALL SELECT 'Orders', COUNT(*) FROM Orders
UNION ALL SELECT 'Order_items', COUNT(*) FROM Order_items
UNION ALL SELECT 'Payments', COUNT(*) FROM Payments
UNION ALL SELECT 'Shipments', COUNT(*) FROM Shipments
UNION ALL SELECT 'Shipment_items', COUNT(*) FROM Shipment_items;


-- S2. IDs start at 1 (verifies TRUNCATE reset the AUTO_INCREMENT)
-- EXPECTED: one row: first_order = 1, last_order = 3, first_customer = 1, last_customer = 3
SELECT
    (SELECT MIN(order_id)    FROM Orders)    AS first_order,
    (SELECT MAX(order_id)    FROM Orders)    AS last_order,
    (SELECT MIN(customer_id) FROM Customers) AS first_customer,
    (SELECT MAX(customer_id) FROM Customers) AS last_customer;


-- S3. All products with price
-- EXPECTED: 3 rows
--   1 | Classic Cotton Sock   | 89.00  | Spain
--   2 | Compression Sock Pro  | 149.00 | Portugal
--   3 | Active Sport Sock     | 109.00 | Sweden
SELECT product_id, product_name, price, origin
FROM Products
ORDER BY product_id;


-- S4. Categories (top-level categories reference themselves)
-- EXPECTED: 3 rows
--   1 | 1 | Everyday socks
--   2 | 2 | Compression socks
--   3 | 3 | Sports socks
SELECT category_id, parent_id, category_name
FROM Categories
ORDER BY category_id;


-- S5. Number of variants per product
-- EXPECTED: 3 rows
--   Classic Cotton Sock  | 3
--   Compression Sock Pro | 2
--   Active Sport Sock    | 1
SELECT p.product_name, COUNT(pv.variant_id) AS variant_count
FROM Products p
JOIN Product_variants pv ON pv.product_id = p.product_id
GROUP BY p.product_id, p.product_name
ORDER BY p.product_id;


-- S6. Number of permissions per role
-- EXPECTED: 3 rows
--   superadmin        | 5
--   inventory_manager | 2
--   customer_service  | 2
SELECT r.role_name, COUNT(rp.permission_id) AS permission_count
FROM Roles r
JOIN Role_permissions rp ON rp.role_id = r.role_id
GROUP BY r.role_id, r.role_name
ORDER BY r.role_id;


-- ############################################################################
-- PART 2: MEDIUM TESTS (the original 10 queries)
-- ############################################################################

-- 1. All orders for a customer (by email)
-- EXPECTED: 1 row
--   order_id 1 | order_date = (time you ran the seed) | delivered | 267.00 | Anna Svensson | anna.svensson@example.test
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


-- 2. Inventory status per product variant
-- EXPECTED: 6 rows, sorted by product name then size
--   Active Sport Sock    | 40-42 | Grey  | ASS-GRY-40-42 | 27
--   Classic Cotton Sock  | 37-39 | Black | CCS-BLK-37-39 | 42
--   Classic Cotton Sock  | 40-42 | Black | CCS-BLK-40-42 | 35
--   Classic Cotton Sock  | 43-45 | White | CCS-WHT-43-45 | 18
--   Compression Sock Pro | 37-39 | Navy  | CSP-NVY-37-39 | 12
--   Compression Sock Pro | 40-42 | Navy  | CSP-NVY-40-42 | 9
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


-- 3. Revenue per category this month
-- (Orders get order_date = NOW() from the seed, so they always land in the current month)
-- EXPECTED: 3 rows, highest first
--   Everyday socks    | 356.00   (order 1: 3 x 89 = 267, plus order 3: 1 x 89 = 89)
--   Compression socks | 149.00
--   Sports socks      | 109.00
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


-- 4. All admins and their roles
-- EXPECTED: 3 rows
--   1 | System Administrator | admin@strumpan.test     | superadmin        | Full access to the administration system
--   2 | Inventory Manager    | inventory@strumpan.test | inventory_manager | Can manage products and inventory
--   3 | Customer Service     | support@strumpan.test   | customer_service  | Can view and manage customer orders
SELECT
    a.admin_id,
    a.admin_name,
    a.email,
    r.role_name,
    r.roles_description
FROM Admins a
JOIN Roles r ON a.role_id = r.role_id
ORDER BY a.admin_id;


-- 5. Order details with items, payments and shipments (order 2)
-- EXPECTED: 2 rows (one per order item), both for Erik Larsson, order 2, status 'paid', total 258.00
--   Row 1: qty 1 | Compression Sock Pro | 37-39 | Navy | CSP-NVY-37-39 | 149.00
--   Row 2: qty 1 | Active Sport Sock    | 40-42 | Grey | ASS-GRY-40-42 | 109.00
--   Both rows: stripe | paid | TEST-STRIPE-0002 | TEST-DHL-0002 | packed
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
    sh.shipment_status
FROM Orders o
JOIN Customers c ON o.customer_id = c.customer_id
JOIN Order_items oi ON o.order_id = oi.order_id
JOIN Product_variants pv ON oi.variant_id = pv.variant_id
JOIN Products p ON pv.product_id = p.product_id
LEFT JOIN Payments pay ON o.order_id = pay.order_id
LEFT JOIN Shipments sh ON o.order_id = sh.order_id
WHERE o.order_id = 2
ORDER BY oi.order_item_id;


-- 6. Low stock variants (quantity < 15)
-- EXPECTED: 2 rows, lowest first
--   Compression Sock Pro | 40-42 | Navy | CSP-NVY-40-42 | 9
--   Compression Sock Pro | 37-39 | Navy | CSP-NVY-37-39 | 12
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


-- 7. Audit log with admin names
-- EXPECTED: 2 rows (both have the same time_stamp, so log_id DESC decides the order)
--   log 2 | UPDATE | Inventory | record 1 | details has quantity 42 and reason 'Initial stock import' | Inventory Manager    | inventory@strumpan.test
--   log 1 | INSERT | Roles     | record 1 | details has role_name 'superadmin'                         | System Administrator | admin@strumpan.test
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
ORDER BY al.time_stamp DESC, al.log_id DESC;


-- 8. Customers with their addresses
-- EXPECTED: 6 rows (delivery first, then invoice, per customer)
--   1 | Anna Svensson | delivery + invoice | Storgatan 12 | 111 22 | Stockholm | Sweden
--   2 | Erik Larsson  | delivery + invoice | Kustvägen 8  | 211 18 | Malmö     | Sweden
--   3 | Maja Nilsson  | delivery + invoice | Lundagatan 4 | 222 20 | Lund      | Sweden
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


-- 9. Total orders and revenue per customer
-- EXPECTED: 3 rows, highest revenue first
--   1 | Anna Svensson | 1 order | 267.00
--   2 | Erik Larsson  | 1 order | 258.00
--   3 | Maja Nilsson  | 1 order | 89.00
SELECT
    c.customer_id,
    c.name AS customer_name,
    c.email,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_cost), 0) AS total_revenue
FROM Customers c
LEFT JOIN Orders o
       ON c.customer_id = o.customer_id
      AND o.order_status NOT IN ('cancelled', 'returned')
GROUP BY c.customer_id, c.name, c.email
ORDER BY total_revenue DESC;


-- 10. Shipment status per order
-- EXPECTED: 3 rows
--   order 1 | delivered | shipment 1 | PostNord | TEST-PN-0001  | delivered | 2026-09-22 09:30:00 | 2026-09-24 14:15:00
--   order 2 | paid      | shipment 2 | DHL      | TEST-DHL-0002 | packed    | NULL                | NULL
--   order 3 | created   | NULL       | NULL     | NULL          | NULL      | NULL                | NULL  (no shipment yet)
SELECT
    o.order_id,
    o.order_status,
    sh.shipment_id,
    sh.carrier,
    sh.tracking_number,
    sh.shipment_status,
    sh.shipped_date,
    sh.delivered_date
FROM Orders o
LEFT JOIN Shipments sh ON o.order_id = sh.order_id
ORDER BY o.order_id, sh.shipment_id;


-- ############################################################################
-- PART 3: HARDER TESTS
-- ############################################################################

-- H1. Ordered vs shipped quantity per order item
-- EXPECTED: 4 rows
--   order_item 1 | order 1 | ordered 3 | shipped 3
--   order_item 2 | order 2 | ordered 1 | shipped 1
--   order_item 3 | order 2 | ordered 1 | shipped 1
--   order_item 4 | order 3 | ordered 1 | shipped 0  (order 3 has no shipment)
SELECT
    oi.order_item_id,
    oi.order_id,
    oi.quantity AS ordered_qty,
    COALESCE(SUM(si.quantity), 0) AS shipped_qty
FROM Order_items oi
LEFT JOIN Shipment_items si ON si.order_item_id = oi.order_item_id
GROUP BY oi.order_item_id, oi.order_id, oi.quantity
ORDER BY oi.order_item_id;


-- H2. Orders where total_cost does not match the sum of the order items
-- EXPECTED: 0 rows (all totals are correct: 267, 258, 89)
SELECT o.order_id, o.total_cost, SUM(oi.quantity * oi.unit_price) AS items_sum
FROM Orders o
JOIN Order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.total_cost
HAVING o.total_cost <> items_sum;


-- H3. Payments where the amount does not match the order total
-- EXPECTED: 0 rows
SELECT pay.payment_id, pay.order_id, pay.total_amount, o.total_cost
FROM Payments pay
JOIN Orders o ON o.order_id = pay.order_id
WHERE pay.total_amount <> o.total_cost;


-- H4. Which permissions does each admin have?
-- EXPECTED: 3 rows
--   System Administrator | manage_admins, manage_products, manage_inventory, view_orders, update_orders
--   Inventory Manager    | manage_products, manage_inventory
--   Customer Service     | view_orders, update_orders
SELECT
    a.admin_name,
    GROUP_CONCAT(p.permissions_name ORDER BY p.permission_id SEPARATOR ', ') AS permissions
FROM Admins a
JOIN Role_permissions rp ON rp.role_id = a.role_id
JOIN Permissions p ON p.permission_id = rp.permission_id
GROUP BY a.admin_id, a.admin_name
ORDER BY a.admin_id;


-- H5. Best-selling variants (units sold, excluding cancelled/returned orders)
-- EXPECTED: 4 rows
--   CCS-BLK-37-39 | 3
--   ASS-GRY-40-42 | 1
--   CCS-BLK-40-42 | 1
--   CSP-NVY-37-39 | 1
SELECT pv.sku, SUM(oi.quantity) AS units_sold
FROM Order_items oi
JOIN Orders o ON o.order_id = oi.order_id
JOIN Product_variants pv ON pv.variant_id = oi.variant_id
WHERE o.order_status NOT IN ('cancelled', 'returned')
GROUP BY pv.variant_id, pv.sku
ORDER BY units_sold DESC, pv.sku;


-- H6. Variants that have never been ordered
-- EXPECTED: 2 rows
--   CCS-WHT-43-45 | Classic Cotton Sock
--   CSP-NVY-40-42 | Compression Sock Pro
SELECT pv.sku, p.product_name
FROM Product_variants pv
JOIN Products p ON p.product_id = pv.product_id
LEFT JOIN Order_items oi ON oi.variant_id = pv.variant_id
WHERE oi.order_item_id IS NULL
ORDER BY pv.sku;


-- H7. Orders whose payment is not completed
-- EXPECTED: 1 row
--   order 3 | created | swish | pending | TEST-SWISH-0003
SELECT o.order_id, o.order_status, pay.payment_method, pay.payment_status, pay.transaction_id
FROM Orders o
JOIN Payments pay ON pay.order_id = o.order_id
WHERE pay.payment_status <> 'paid';


-- H8. Delivery and invoice address of each order belong to the right customer
-- EXPECTED: 3 rows, delivery_city = invoice_city for each, and both match the customer's city
--   order 1 | Anna Svensson | Stockholm | Stockholm
--   order 2 | Erik Larsson  | Malmö     | Malmö
--   order 3 | Maja Nilsson  | Lund      | Lund
SELECT
    o.order_id,
    c.name AS customer_name,
    da.city AS delivery_city,
    ia.city AS invoice_city
FROM Orders o
JOIN Customers c  ON c.customer_id = o.customer_id
JOIN Addresses da ON da.address_id = o.delivery_address_id
                 AND da.customer_id = o.customer_id AND da.type = 'delivery'
JOIN Addresses ia ON ia.address_id = o.invoice_address_id
                 AND ia.customer_id = o.customer_id AND ia.type = 'invoice'
ORDER BY o.order_id;


-- H9. Cascade delete: deleting order 2 should remove its items, payment and shipments
-- Runs inside a transaction and is rolled back, so the data is untouched afterwards.
-- Run all statements below together.
-- EXPECTED result of the SELECT (inside the transaction, after the delete):
--   orders 2 | order_items 2 | payments 2 | shipments 1 | shipment_items 1
START TRANSACTION;
DELETE FROM Orders WHERE order_id = 2;
SELECT
    (SELECT COUNT(*) FROM Orders)         AS orders,
    (SELECT COUNT(*) FROM Order_items)    AS order_items,
    (SELECT COUNT(*) FROM Payments)       AS payments,
    (SELECT COUNT(*) FROM Shipments)      AS shipments,
    (SELECT COUNT(*) FROM Shipment_items) AS shipment_items;
ROLLBACK;
-- After ROLLBACK, run S1 again: counts should be back to 3 / 4 / 3 / 2 / 3.


-- ############################################################################
-- PART 4: CONSTRAINT TESTS (each one SHOULD FAIL)
-- Run ONE statement at a time. A failed insert changes no data.
-- ############################################################################

-- C1. Duplicate customer email
-- EXPECTED: ERROR 1062 Duplicate entry 'anna.svensson@example.test' for key 'email'
-- INSERT INTO Customers (name, email, password_hash)
-- VALUES ('Fake Anna', 'anna.svensson@example.test', 'x');

-- C2. Order for a customer that does not exist
-- EXPECTED: ERROR 1452 Cannot add or update a child row: a foreign key constraint fails
-- INSERT INTO Orders (customer_id, delivery_address_id, invoice_address_id, order_status, total_cost)
-- VALUES (99, 1, 2, 'created', 10.00);

-- C3. Invalid order status
-- EXPECTED: error (ENUM): Data truncated for column 'order_status' (strict mode) or an empty value saved
-- INSERT INTO Orders (customer_id, delivery_address_id, invoice_address_id, order_status, total_cost)
-- VALUES (1, 1, 2, 'banana', 10.00);

-- C4. Negative price
-- EXPECTED: ERROR 3819 Check constraint violated (MySQL 8.0.16+; MariaDB uses another code)
-- INSERT INTO Products (category_id, product_name, price) VALUES (1, 'Bad Sock', -5.00);

-- C5. Duplicate SKU
-- EXPECTED: ERROR 1062 Duplicate entry 'CCS-BLK-37-39' for key 'sku'
-- INSERT INTO Product_variants (product_id, product_variant_size, color, sku)
-- VALUES (1, '37-39', 'Black', 'CCS-BLK-37-39');

-- C6. Second inventory row for the same variant
-- EXPECTED: ERROR 1062 Duplicate entry '1' for key 'variant_id'
-- INSERT INTO Inventory (variant_id, quantity) VALUES (1, 5);