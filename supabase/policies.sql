-- Política: usuario autenticado puede insertar su propio negocio
CREATE POLICY "Usuario puede crear negocio"
ON negocios FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Política: usuario autenticado puede insertar en empleados
CREATE POLICY "Usuario puede crear empleado"
ON empleados FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
