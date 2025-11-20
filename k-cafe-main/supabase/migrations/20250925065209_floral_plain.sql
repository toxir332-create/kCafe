/*
  # Seed Initial Data for Restaurant Management System

  1. Sample Data
    - Demo user profiles for different roles
    - Sample menu items across categories
    - Restaurant tables setup
    - Initial inventory items
    - Sample customers

  2. Test Data
    - Realistic menu with proper pricing
    - Varied table configurations
    - Common inventory items
*/

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, ingredients, preparation_time) VALUES
('Margherita Pizza', 'Fresh tomatoes, mozzarella, basil on crispy dough', 24.99, 'Pizza', ARRAY['tomatoes', 'mozzarella', 'basil', 'dough'], 15),
('Pepperoni Pizza', 'Classic pepperoni with mozzarella cheese', 27.99, 'Pizza', ARRAY['pepperoni', 'mozzarella', 'dough', 'tomato sauce'], 15),
('Chicken Caesar Salad', 'Grilled chicken breast with romaine lettuce, parmesan, and caesar dressing', 18.99, 'Salads', ARRAY['chicken', 'lettuce', 'parmesan', 'croutons', 'caesar dressing'], 8),
('Greek Salad', 'Fresh vegetables with feta cheese and olive oil', 16.99, 'Salads', ARRAY['tomatoes', 'cucumber', 'olives', 'feta cheese', 'olive oil'], 5),
('Beef Burger', 'Angus beef patty with lettuce, tomato, cheese, and fries', 22.99, 'Burgers', ARRAY['beef patty', 'lettuce', 'tomato', 'cheese', 'bun', 'fries'], 12),
('Chicken Burger', 'Grilled chicken breast with avocado and bacon', 21.99, 'Burgers', ARRAY['chicken breast', 'avocado', 'bacon', 'lettuce', 'bun'], 12),
('Fish & Chips', 'Beer-battered fish with crispy fries and tartar sauce', 19.99, 'Main Course', ARRAY['fish', 'batter', 'potatoes', 'tartar sauce'], 18),
('Grilled Salmon', 'Atlantic salmon with seasonal vegetables', 28.99, 'Main Course', ARRAY['salmon', 'vegetables', 'herbs', 'lemon'], 20),
('Pasta Carbonara', 'Creamy pasta with bacon, eggs, and parmesan', 17.99, 'Pasta', ARRAY['pasta', 'bacon', 'eggs', 'parmesan', 'cream'], 14),
('Pasta Bolognese', 'Traditional meat sauce with spaghetti', 16.99, 'Pasta', ARRAY['pasta', 'ground beef', 'tomatoes', 'herbs'], 16),
('Tiramisu', 'Classic Italian dessert with coffee and mascarpone', 8.99, 'Desserts', ARRAY['mascarpone', 'coffee', 'ladyfingers', 'cocoa'], 5),
('Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 7.99, 'Desserts', ARRAY['chocolate', 'flour', 'eggs', 'vanilla ice cream'], 3),
('Cappuccino', 'Espresso with steamed milk and foam', 4.99, 'Beverages', ARRAY['espresso', 'milk'], 3),
('Fresh Orange Juice', 'Freshly squeezed orange juice', 5.99, 'Beverages', ARRAY['oranges'], 2),
('Craft Beer', 'Local craft beer selection', 6.99, 'Beverages', ARRAY['hops', 'malt', 'yeast'], 1);

-- Insert restaurant tables
INSERT INTO tables (number, seats, status) VALUES
(1, 2, 'available'),
(2, 4, 'available'),
(3, 6, 'available'),
(4, 2, 'occupied'),
(5, 4, 'available'),
(6, 8, 'available'),
(7, 2, 'reserved'),
(8, 4, 'cleaning'),
(9, 6, 'available'),
(10, 2, 'available'),
(11, 4, 'available'),
(12, 8, 'available');

-- Insert inventory items
INSERT INTO inventory (name, current_stock, min_stock, unit) VALUES
('Tomatoes', 50.0, 20.0, 'kg'),
('Mozzarella Cheese', 15.0, 10.0, 'kg'),
('Chicken Breast', 25.0, 15.0, 'kg'),
('Romaine Lettuce', 8.0, 12.0, 'kg'),
('Beef Patties', 30.0, 20.0, 'pcs'),
('Salmon Fillets', 12.0, 8.0, 'kg'),
('Pasta', 40.0, 25.0, 'kg'),
('Flour', 100.0, 50.0, 'kg'),
('Eggs', 200.0, 100.0, 'pcs'),
('Milk', 50.0, 30.0, 'liters'),
('Olive Oil', 20.0, 10.0, 'liters'),
('Parmesan Cheese', 8.0, 5.0, 'kg'),
('Coffee Beans', 15.0, 10.0, 'kg'),
('Oranges', 25.0, 15.0, 'kg'),
('Potatoes', 80.0, 40.0, 'kg');

-- Insert sample customers
INSERT INTO customers (name, phone, email, loyalty_points) VALUES
('John Smith', '+1234567890', 'john.smith@email.com', 150),
('Sarah Johnson', '+1234567891', 'sarah.j@email.com', 89),
('Mike Brown', '+1234567892', 'mike.brown@email.com', 234),
('Emily Davis', '+1234567893', 'emily.davis@email.com', 67),
('David Wilson', '+1234567894', 'david.wilson@email.com', 178),
('Lisa Anderson', '+1234567895', 'lisa.anderson@email.com', 92),
('Tom Miller', '+1234567896', 'tom.miller@email.com', 145),
('Anna Garcia', '+1234567897', 'anna.garcia@email.com', 203);