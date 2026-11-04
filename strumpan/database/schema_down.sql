-- ============================================================================
-- Strumpan Schema Rollback Script (schema_down.sql)
-- Drops all tables and objects in reverse dependency order.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Administration & Security
DROP TABLE IF EXISTS Audit_log;
DROP TABLE IF EXISTS Admins;
DROP TABLE IF EXISTS Role_permissions;
DROP TABLE IF EXISTS Permissions;
DROP TABLE IF EXISTS Roles;

-- Shipments & Orders
DROP TABLE IF EXISTS Shipment_items;
DROP TABLE IF EXISTS Shipments;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Order_items;
DROP TABLE IF EXISTS Orders;

-- Catalog & Inventory
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Product_variants;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Categories;

-- Customers & Addresses
DROP TABLE IF EXISTS Addresses;
DROP TABLE IF EXISTS Customers;

SET FOREIGN_KEY_CHECKS = 1;
