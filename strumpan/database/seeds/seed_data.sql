
-- Strumpan test data
-- Run schema_strumpan.sql before this file.
-- The password_hash values below are placeholders only. Do not use them in production.

START TRANSACTION;

-- ============================================================================
-- Roles and permissions
-- ============================================================================

INSERT INTO Roles (role_name, roles_description) VALUES
    ('superadmin', 'Full access to the administration system'),
    ('inventory_manager', 'Can manage products and inventory'),
    ('customer_service', 'Can view and manage customer orders');

INSERT INTO Permissions (permissions_name, permissions_description) VALUES
    ('manage_admins', 'Create, update and deactivate administrator accounts'),
    ('manage_products', 'Create and update products and variants'),
    ('manage_inventory', 'Update inventory quantities'),
    ('view_orders', 'View customer orders'),
    ('update_orders', 'Update order and shipment status');

INSERT INTO Role_permissions (role_id, permission_id) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
    (2, 2), (2, 3),
    (3, 4), (3, 5);

INSERT INTO Admins (role_id, admin_name, email, password_hash) VALUES
    (1, 'System Administrator', 'admin@strumpan.test', '$2b$12$testHashOnlyNeverUseInProduction'),
    (2, 'Inventory Manager', 'inventory@strumpan.test', '$2b$12$testHashOnlyNeverUseInProduction'),
    (3, 'Customer Service', 'support@strumpan.test', '$2b$12$testHashOnlyNeverUseInProduction');

INSERT INTO Audit_log (admin_id, handling, table_name, record_id, details) VALUES
    (1, 'INSERT', 'Roles', 1, JSON_OBJECT('role_name', 'superadmin')),
    (2, 'UPDATE', 'Inventory', 1, JSON_OBJECT('quantity', 42, 'reason', 'Initial stock import'));


-- ============================================================================
-- Customers and addresses
-- ============================================================================

INSERT INTO Customers (name, email, phone_nbr, password_hash) VALUES
    ('Anna Svensson', 'anna.svensson@example.test', '+46701234567', '$2b$12$testHashOnlyNeverUseInProduction'),
    ('Erik Larsson', 'erik.larsson@example.test', '+46709876543', '$2b$12$testHashOnlyNeverUseInProduction'),
    ('Maja Nilsson', 'maja.nilsson@example.test', '+46701112233', '$2b$12$testHashOnlyNeverUseInProduction');

INSERT INTO Addresses (customer_id, street, postal_code, city, country, type) VALUES
    (1, 'Storgatan 12', '111 22', 'Stockholm', 'Sweden', 'delivery'),
    (1, 'Storgatan 12', '111 22', 'Stockholm', 'Sweden', 'invoice'),
    (2, 'Kustvägen 8', '211 18', 'Malmö', 'Sweden', 'delivery'),
    (2, 'Kustvägen 8', '211 18', 'Malmö', 'Sweden', 'invoice'),
    (3, 'Lundagatan 4', '222 20', 'Lund', 'Sweden', 'delivery'),
    (3, 'Lundagatan 4', '222 20', 'Lund', 'Sweden', 'invoice');


-- ============================================================================
-- Product catalog and inventory
-- ============================================================================

INSERT INTO Categories (category_name, category_description) VALUES
    ('Everyday socks', 'Comfortable socks for everyday use'),
    ('Compression socks', 'Supportive compression socks'),
    ('Sports socks', 'Durable socks for training and sports');

INSERT INTO Products (category_id, product_name, product_description, price, picture_url) VALUES
    (1, 'Classic Cotton Sock', 'Soft cotton socks made in Spain.', 89.00, 'https://example.test/images/classic-cotton-sock.jpg'),
    (2, 'Compression Sock Pro', 'Compression socks for long workdays and recovery.', 149.00, 'https://example.test/images/compression-sock-pro.jpg'),
    (3, 'Active Sport Sock', 'Breathable sports socks with reinforced heel and toe.', 109.00, 'https://example.test/images/active-sport-sock.jpg');

INSERT INTO Product_variants (product_id, product_variant_size, color, sku) VALUES
    (1, '37-39', 'Black', 'CCS-BLK-37-39'),
    (1, '40-42', 'Black', 'CCS-BLK-40-42'),
    (1, '43-45', 'White', 'CCS-WHT-43-45'),
    (2, '37-39', 'Navy', 'CSP-NVY-37-39'),
    (2, '40-42', 'Navy', 'CSP-NVY-40-42'),
    (3, '40-42', 'Grey', 'ASS-GRY-40-42');

INSERT INTO Inventory (variant_id, quantity) VALUES
    (1, 42),
    (2, 35),
    (3, 18),
    (4, 12),
    (5, 9),
    (6, 27);


-- ============================================================================
-- Orders, payments and shipments
-- ============================================================================

INSERT INTO Orders (
    customer_id,
    delivery_address_id,
    invoice_address_id,
    order_status,
    total_cost
) VALUES
    (1, 1, 2, 'delivered', 267.00),
    (2, 3, 4, 'paid', 258.00),
    (3, 5, 6, 'created', 89.00);

INSERT INTO Order_items (order_id, variant_id, quantity, unit_price) VALUES
    (1, 1, 3, 89.00),
    (2, 4, 1, 149.00),
    (2, 6, 1, 109.00),
    (3, 2, 1, 89.00);

INSERT INTO Payments (order_id, payment_method, total_amount, payment_status, transaction_id) VALUES
    (1, 'klarna', 267.00, 'paid', 'TEST-KLARNA-0001'),
    (2, 'stripe', 258.00, 'paid', 'TEST-STRIPE-0002'),
    (3, 'swish', 89.00, 'pending', 'TEST-SWISH-0003');

INSERT INTO Shipments (order_id, carrier, tracking_number, status, shipped_date, delivered_date) VALUES
    (1, 'PostNord', 'TEST-PN-0001', 'delivered', '2026-09-22 09:30:00', '2026-09-24 14:15:00'),
    (2, 'DHL', 'TEST-DHL-0002', 'packed', NULL, NULL);

INSERT INTO Shipment_items (shipment_id, order_item_id, quantity) VALUES
    (1, 1, 3),
    (2, 2, 1),
    (2, 3, 1);

COMMIT;