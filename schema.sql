-- Pegar en phpMyAdmin > pestaña SQL (con tu base de datos ya seleccionada).

-- Registros de dosis: lo unico que cambia a diario.
CREATE TABLE IF NOT EXISTS registros (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tipo        VARCHAR(20) NOT NULL,       -- cetirizina | azitromicina | pediacort | acetaminofen | lavado_nasal | temperatura | sueno | animo | llanto | malestar
  dado_en     DATETIME NOT NULL,          -- hora real del registro (America/Caracas)
  dia         INT NULL,                   -- cetirizina/azitromicina/pediacort: dia del tratamiento (0 = primero); animo 1-3, llanto y malestar 0-2
  temperatura DECIMAL(3,1) NULL,          -- temperatura (grados), o horas dormidas en 'sueno'
  INDEX idx_tipo_fecha (tipo, dado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ajustes compartidos entre telefonos: hora de azitromicina y pediacort
-- y marcas de avisos push ya enviados ("aviso:...").
CREATE TABLE IF NOT EXISTS ajustes (
  clave VARCHAR(80) NOT NULL PRIMARY KEY,
  valor VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Telefonos suscritos a notificaciones push.
CREATE TABLE IF NOT EXISTS suscripciones (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  hash     CHAR(64) NOT NULL UNIQUE,      -- sha256 del endpoint
  endpoint TEXT NOT NULL,
  p256dh   VARCHAR(255) NOT NULL,
  auth     VARCHAR(255) NOT NULL,
  creado   DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
