/*
  # Create Demo User Accounts

  1. Demo Users
    - Admin user with full access
    - Manager user with management permissions
    - Waiter user for order taking
    - Chef user for kitchen operations

  2. Authentication
    - Creates auth.users entries
    - Links to profiles table
    - Sets up proper roles and permissions
*/

-- Note: In a real Supabase setup, you would create these users through the Supabase dashboard
-- or using the Supabase CLI. This is just for reference.

-- Insert demo profiles (these will need corresponding auth.users entries)
INSERT INTO profiles (id, name, email, role, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@restaurant.com', 'admin', true),
('22222222-2222-2222-2222-222222222222', 'John Manager', 'manager@restaurant.com', 'manager', true),
('33333333-3333-3333-3333-333333333333', 'Alice Waiter', 'waiter@restaurant.com', 'waiter', true),
('44444444-4444-4444-4444-444444444444', 'Chef Marco', 'chef@restaurant.com', 'chef', true),
('55555555-5555-5555-5555-555555555555', 'Bob Courier', 'courier@restaurant.com', 'courier', true)
ON CONFLICT (id) DO NOTHING;