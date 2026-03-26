-- ===== TABLAS: CLIENTES Y CITAS =====

-- Tabla de clientes/pacientes
CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  email       TEXT,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Tabla de citas
CREATE TABLE IF NOT EXISTS citas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id  UUID REFERENCES clientes(id) ON DELETE SET NULL,
  fecha       DATE NOT NULL,
  hora        TIME NOT NULL,
  duracion    INTEGER DEFAULT 60,  -- minutos
  servicio    TEXT,
  estado      TEXT DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente','confirmada','completada','cancelada')),
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_negocio ON clientes(negocio_id);
CREATE INDEX IF NOT EXISTS idx_citas_negocio_fecha ON citas(negocio_id, fecha);

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas    ENABLE ROW LEVEL SECURITY;

-- Políticas clientes
CREATE POLICY "Clientes del negocio" ON clientes
  FOR ALL USING (
    negocio_id IN (
      SELECT id FROM negocios WHERE owner_id = auth.uid()
      UNION
      SELECT negocio_id FROM empleados WHERE user_id = auth.uid()
    )
  );

-- Políticas citas
CREATE POLICY "Citas del negocio" ON citas
  FOR ALL USING (
    negocio_id IN (
      SELECT id FROM negocios WHERE owner_id = auth.uid()
      UNION
      SELECT negocio_id FROM empleados WHERE user_id = auth.uid()
    )
  );
