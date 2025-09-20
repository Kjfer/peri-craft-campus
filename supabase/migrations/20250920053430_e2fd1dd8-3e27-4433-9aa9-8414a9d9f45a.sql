-- Make receipts bucket public so the URLs work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'receipts';