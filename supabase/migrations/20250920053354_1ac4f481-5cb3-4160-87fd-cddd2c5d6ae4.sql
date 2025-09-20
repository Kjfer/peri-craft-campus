-- Create receipts bucket for payment receipt uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Create policies for receipt uploads
CREATE POLICY "Users can upload their own receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipts' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));