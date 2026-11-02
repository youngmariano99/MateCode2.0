-- ============================================================================
-- SCRIPT DE MIGRACIÓN: Tabla recurso_oficina
-- Módulo: Oficina Virtual (MateCode 2.0)
-- Permite persistir enlaces útiles, accesos directos personalizados,
-- hitos/fechas críticas con anticipación de aviso y notas rápidas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recurso_oficina (
    id VARCHAR(255) PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL, -- 'link_util', 'acceso_directo', 'hito_fecha', 'nota_rapida'
    titulo VARCHAR(255) NOT NULL,
    url TEXT,
    icono VARCHAR(50),
    etiquetas JSONB DEFAULT '[]'::jsonb NOT NULL,
    fecha_limite VARCHAR(10), -- YYYY-MM-DD
    dias_aviso_previo INT DEFAULT 0,
    descripcion TEXT,
    orden INT DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_recurso_oficina_tipo ON public.recurso_oficina(tipo);
CREATE INDEX IF NOT EXISTS idx_recurso_oficina_fecha ON public.recurso_oficina(fecha_limite);

