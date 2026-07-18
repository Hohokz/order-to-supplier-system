-- Users Table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    line_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL, -- 'APPROVER', 'OBSERVER'
    company_name VARCHAR(255),
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMP,
    lasted_login_date TIMESTAMP
);

-- Units Table
CREATE TABLE units (
    id VARCHAR(255) PRIMARY KEY,
    unit_name VARCHAR(255) NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Suppliers Table
CREATE TABLE suppliers (
    id VARCHAR(255) PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contract_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'ACTIVE', 'CHANGED', 'INACTIVE'
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_date TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Inventories Table
CREATE TABLE inventories (
    id VARCHAR(255) PRIMARY KEY,
    inventory_name VARCHAR(255) NOT NULL,
    inventory_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- 'ACTIVE', 'CHANGED', 'OUTSTOCK', 'DELAY', 'INACTIVE'
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_date TIMESTAMP,
    updated_by VARCHAR(255),
    supplier_id VARCHAR(255) NOT NULL,
    unit_id VARCHAR(255) NOT NULL,
    safety_quantity INTEGER NOT NULL DEFAULT 0,
    seq INTEGER,
    remark TEXT,
    CONSTRAINT fk_inventories_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventories_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT
);

-- Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    signature TEXT,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    order_date TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE order_items (
    id VARCHAR(255) PRIMARY KEY,
    inventory_id VARCHAR(255) NOT NULL,
    order_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    order_quantity INTEGER NOT NULL DEFAULT 0,
    supplier_id VARCHAR(255) NOT NULL,
    approve_status VARCHAR(50), -- 'PENDING', 'APPROVED', etc.
    approve_by VARCHAR(255),
    approve_date TIMESTAMP,
    remark TEXT,
    delivery_when VARCHAR(255),
    order_unit VARCHAR(255),
    quantity_unit VARCHAR(255),
    supplier_remark TEXT,
    order_seq INTEGER,
    CONSTRAINT fk_order_items_inventory FOREIGN KEY (inventory_id) REFERENCES inventories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE RESTRICT
);

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
