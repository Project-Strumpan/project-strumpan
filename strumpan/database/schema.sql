
SET FOREIGN_KEY_CHECKS = 0;

-- Customers and Addresses

CREATE TABLE Customers (
    customer_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_nbr VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Addresses(
    address_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    street VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    type ENUM('delivery', 'invoice') NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

--Product catalog

CREATE TABLE Categories(
    category_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(255) NOT NULL,
    category_description TEXT
    FOREIGN KEY (parent_id) REFERENCES Categories(category_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Products(
    product_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    picture_url VARCHAR(500),
    origin VARCHAR(100),
    material VARCHAR(255),
    environmental_labels VARCHAR(255),
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Product_variants(
    variant_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    product_variant_size VARCHAR(50) NOT NULL,
    color VARCHAR(100),
    sku VARCHAR(100) NOT NULL UNIQUE,
    FOREIGN KEY(product_id) REFERENCES Products(product_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Inventory(
    inventory_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES Product_variants(variant_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- Orders, order_items and payments

CREATE TABLE Orders (
    order_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    delivery_address_id INT NOT NULL,
    invoice_address_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_status ENUM('created', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'returned') NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL CHECK (total_cost >= 0),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (delivery_address_id) REFERENCES Addresses(address_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (invoice_address_id) REFERENCES Addresses(address_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Order_items (
    order_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    variant_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES Product_variants(variant_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Payments (
    payment_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM('klarna', 'stripe', 'swish') NOT NULL, -- TO BE SET LATER ON
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status ENUM('pending', 'authorized', 'paid', 'failed', 'refunded') NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Shipments

CREATE TABLE Shipments (
    shipment_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    carrier VARCHAR(100),
    tracking_number VARCHAR(255) UNIQUE,
    shipment_status ENUM('pending', 'packed', 'shipped', 'delivered', 'returned') NOT NULL,
    shipped_date TIMESTAMP NULL,
    delivered_date TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Shipment_items (
    shipment_item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    shipment_id INT NOT NULL,
    order_item_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES Shipments(shipment_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES Order_items(order_item_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_shipment_order_item (shipment_id, order_item_id)
);

-- Admin, roles, permissions, audit log

CREATE TABLE Roles (
    role_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    roles_description TEXT
);

CREATE TABLE Permissions (
    permission_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    permissions_name VARCHAR(100) NOT NULL UNIQUE,
    permissions_description TEXT
);

CREATE TABLE Role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES Permissions(permission_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Admins (
    admin_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Audit_log (
    log_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    handling VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    time_stamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSON,
    FOREIGN KEY (admin_id) REFERENCES Admins(admin_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for common queries

CREATE INDEX idx_addresses_customer_id ON Addresses(customer_id);
CREATE INDEX idx_products_category_id ON Products(category_id);
CREATE INDEX idx_product_variants_product_id ON Product_variants(product_id);
CREATE INDEX idx_orders_customer_id ON Orders(customer_id);
CREATE INDEX idx_orders_delivery_address_id ON Orders(delivery_address_id);
CREATE INDEX idx_orders_invoice_address_id ON Orders(invoice_address_id);
CREATE INDEX idx_order_items_order_id ON Order_items(order_id);
CREATE INDEX idx_order_items_variant_id ON Order_items(variant_id);
CREATE INDEX idx_payments_order_id ON Payments(order_id);
CREATE INDEX idx_shipments_order_id ON Shipments(order_id);
CREATE INDEX idx_shipment_items_order_item_id ON Shipment_items(order_item_id);
CREATE INDEX idx_audit_log_admin_id ON Audit_log(admin_id);
CREATE INDEX idx_audit_log_table_record ON Audit_log(table_name, record_id);

SET FOREIGN_KEY_CHECKS = 1;
