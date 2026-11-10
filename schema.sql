-- Pegar en phpMyAdmin > pestaña SQL (con tu base de datos ya seleccionada).

-- Registros de dosis: lo unico que cambia a diario.
CREATE TABLE IF NOT EXISTS registros (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tipo        VARCHAR(20) NOT NULL,       -- cetirizina | azitromicina | pediacort | acetaminofen | lavado_nasal
  dado_en     DATETIME NOT NULL,          -- hora real en que se dio (America/Caracas)
  dia         INT NULL,                   -- dia del tratamiento (0 = primer dia), solo cetirizina/azitromicina/pediacort
  temperatura DECIMAL(3,1) NULL,          -- solo acetaminofen
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
