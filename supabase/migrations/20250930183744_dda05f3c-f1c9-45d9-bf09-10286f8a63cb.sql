-- Permitir a los usuarios actualizar sus propios registros de pago
CREATE POLICY "users_update_own_payments"
ON payments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comentario: Esta política permite a los usuarios actualizar registros de pago
-- que les pertenecen, necesario para actualizar receipts y transaction IDs