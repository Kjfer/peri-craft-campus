-- Fix security vulnerability in profiles table RLS policies
-- The current "Admins can view all profiles" policy has a major flaw:
-- It allows ANYONE to view profiles where role = 'admin', not just authenticated admin users

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a proper admin policy that only allows authenticated admin users to view all profiles
-- Using a security definer function to avoid recursive RLS issues
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create the correct admin policy
CREATE POLICY "Authenticated admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Ensure the existing user policy remains (users can view their own profile)
-- This policy should already exist: "Users can view their own profile"
-- But let's make sure it's properly defined
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);