-- Seed de Formas de Pago
INSERT INTO formas_pago (nombre, descripcion) VALUES
('Efectivo', 'Pago en efectivo o billete'),
('Transferencia', 'Transferencia bancaria directa'),
('Mercado Pago', 'Plataforma Mercado Pago'),
('Tarjeta de Crédito', 'Pago con tarjeta de crédito'),
('PayPal', 'Plataforma internacional PayPal');

-- Seed de Rubros
INSERT INTO rubros (nombre, descripcion) VALUES
('Tecnología', 'Desarrollo de software y consultoría tecnológica'),
('Marketing', 'Marketing digital y publicidad'),
('Diseño', 'Diseño gráfico, branding y diseño web'),
('E-commerce', 'Comercio electrónico y tiendas online'),
('Educación', 'Servicios educativos y e-learning');

-- Seed de Tipos de Software
INSERT INTO tipos_software (nombre, descripcion) VALUES
('Landing Page', 'Sitios web de una sola página enfocados en conversión'),
('Sitio Web Institucional', 'Sitio corporativo de múltiples páginas'),
('Sistema Web/SaaS', 'Aplicación web interactiva o software como servicio'),
('Aplicación Móvil', 'App nativa o híbrida para iOS/Android'),
('Tienda Online/E-commerce', 'Plataforma de ventas con carrito de compras');
