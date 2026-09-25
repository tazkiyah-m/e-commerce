-- Buat tabel-tabel utama
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category_id INTEGER REFERENCES categories(id),
    prep_time VARCHAR(50),
    rating NUMERIC(2,1) DEFAULT 4.5,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id),
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    UNIQUE(cart_id, menu_item_id)
);

-- Hapus isi tabel sebelum di-seed (jika diperlukan)
TRUNCATE TABLE cart_items, carts, menu_items, categories, users CASCADE;

-- Insert data dummy Categories
INSERT INTO categories (name, slug, icon) VALUES 
('Burger', 'burger', 'lunch_dining'),
('Pizza', 'pizza', 'local_pizza'),
('Sushi', 'sushi', 'restaurant_menu'),
('Coffee', 'coffee', 'coffee'),
('Drinks', 'drinks', 'local_bar'),
('Snacks', 'snacks', 'cookie');

-- Insert data dummy Menu Items
INSERT INTO menu_items (name, description, price, image_url, category_id, prep_time, rating, is_popular) VALUES 
('Special GGS Burger', 'Premium beef, melted swiss cheese, and artisanal pickles', 45000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFkE2GsInXbSRyQX8DHveCDwAukMS3nEMuSPS6F9aQTyebbHtYnTycZfeE6J3ws7oRVN12qqKViYDzca5j_xRhvUL5mX0wUT_ydIwCHpwahz3Am1ybD6LTUdg9gxfr7NZ6Rt-BXqp642nzhQ18F3nUwQ6AYi4T7FeU34iItnXqGtQUXOJyaPzxw2z7P1MXALWpDattd9P6bBqDTAsXVQiT0MkInmLi1oP3XV1y6eZkxUnMGY7BiIdW', 1, '20-30 min', 4.9, true),
('Truffle Wagyu Burger', 'Premium Wagyu Beef with melted truffle cheese', 125000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB56K1h7DIdcTM03RtklMV77Sd-z_jexhHbZWwCBglMYyTyQt7Kn1nOqxWfmPKYihPGHkVtoHOcJWcgiUG9V6tWPch2XySXpcWH-glt-f2ggA6HanhVDiAlY62UWbwO4kH1UcZS_6Vz6ZS7W3NJIFrbLdm2_75uyXRZXOddg_2WivcGCeqMBOu5m5NW1ttnNT7_O6_MFu7TGfqr2I5bEeTMNVNgrRxDNFmadn766CrnASTkS6YeSYFd', 1, '25-35 min', 5.0, true),
('Truffle Fungi Pizza', 'Wood-fired Truffle Mushroom Pizza', 120000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUo_HUA_eaTqfCrBTskbDEkxiSBaGSDjU6yxlscbWbhxLQ6XjDd6HVttCtkRdvmtZcgN2SpQlEySsajtemI_m-tJFOkJFRdtTS_ZFdQLBv_ipg4aa-ivWaYZghYqq47BzNqJtApkmWuYEUUDv5FY-VT6FI4kfksEKsjaLi-y8faNhE_2tdyqGI08FTNZvfEDeLkkOoDDkgy8vIMkWvf26HlSsQQVeU09Womgnp9QzxUtk1KTYq5BQK', 2, '30-40 min', 4.7, true),
('Salmon Bliss Bowl', 'Fresh Salmon Poke Bowl', 68000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB82tjS-njKx_iLaC5Sj4gO1OFeFhxxAngepgY7iIXjz-aECfWokVP3M4yn377uIgxvzkPKbrTS6Knn8m87ZXWpnfGC0vZ2aKBIIcKymHw10tkxHr3VDOeJL1t7IEYUSkCtFMby24uYWorrVUJDo577IUntWTTpHDVqi4uxAP1haO74B75iAB303mtaaXSL-xvDvHnsGqXSR4JqRTOnU3DK37WVM-Ns6BFAK5IUe9R0xSMyLVnwcafH', 3, '15-25 min', 4.8, true),
('Signature Cold Brew', 'Artisanal iced coffee with layered creamy foam', 45000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ-6uTG0s1L48yWDuDUTnsPUG3qoFWsSn9IHiuvAlgmU_EOHbjMFNqpZQ34P_VVhb5XWgG-3HOBK5WY4dyILsSFo7KGW_tQHNv2q40OJQFMtSj6yWY6stK2rIZ6cGqqPtVQLe-jqO3FqxMErcXtHojkmg4BUAJtGbtQI0jqLoBRAp59G7gPsWJpBQikgiqWcoLpTwfaAPFjN4i32m_f0w7m9cnhWCs2agNkORiXnKR6XlmTN3N0FvW', 4, '5-10 min', 4.9, false);

-- Insert data dummy User (Password hanya contoh)
INSERT INTO users (id, email, password_hash, full_name, role) VALUES 
(1, 'test@ggswell.com', 'password123', 'Test User', 'user');

-- Inisialisasi keranjang kosong untuk Test User
INSERT INTO carts (user_id) VALUES (1);

-- Tabel Promo
CREATE TABLE IF NOT EXISTS promos (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
    discount_value NUMERIC(10, 2) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Alamat Pengguna
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    address_line TEXT NOT NULL,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Pesanan (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    address_id INTEGER REFERENCES user_addresses(id),
    promo_id INTEGER REFERENCES promos(id),
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_fee NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, processing, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- Insert data dummy Promo
INSERT INTO promos (code, discount_type, discount_value, title, description, image_url) VALUES 
('WAGYU50', 'percentage', 50.00, 'Diskon 50% Wagyu Series', 'Nikmati kelezatan daging Wagyu premium dengan harga setengah harga khusus hari ini.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjhwB1zy_kSrUOM_Khv4NJ7JzprbH6tyiLk3wRf-ihetMMfhI9cXGSvC67w5gHEKw1Y9keK73HEHcmF9jdUS6D7W9hSQQHEuXwrn50Cs8v8i8OMV5gtdwpK7zO9LaEi94RKTNyNPtwvsLxLlYpIu8cVQR0kaf9vEjDGqZZGgzK4JZk5kjROUuWC8Q2e2lxeFRcXTcDypB-eQp5QetLjE5l-TwMTUmWjbIgzovMRIFXiTC06whLbJ5_'),
('NEWBURGER', 'fixed', 15000.00, 'Gourmet Burger Spesial', 'Rasa autentik karya chef bintang Michelin.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAE81x5tmFf658iHYI4mZXRNel04JMApjUFIbXBvCSCKoCJbOAcNXZZCt8wmG8j7bHEPGjrPPn2M7lfSnAoYqFe7BvSY_yrWmcPUytIuld3pI7p-JS7YoRILNxC9JYaovbqTGYJfZS8NkzV1OVACic-6DRH7LKbA5-qmh2XVZU888EIWwcCcQif4YcmF3zyLqA6CmxvfOcwor04k7AtrtI6PTJqeK1Dx9I7NdAEM2QkhrbMSPqVl3e0');

-- Insert data dummy Address
INSERT INTO user_addresses (user_id, address_line, city, postal_code, is_default) VALUES 
(1, 'Jl. Sudirman No. 45, Kompleks Elite', 'Jakarta', '12190', TRUE);
