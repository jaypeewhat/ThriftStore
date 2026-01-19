-- Run this in Supabase SQL Editor to create the function
-- This function allows buyers to mark products as sold when they checkout

CREATE OR REPLACE FUNCTION public.mark_products_sold(product_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET is_available = false 
  WHERE id = ANY(product_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
