-- Habilitar extensión PostGIS (necesaria para las columnas GEOGRAPHY)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla Usuarios
CREATE TABLE Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,          -- NUEVO: para login
    rol VARCHAR(20) NOT NULL,
    ubicacion GEOGRAPHY(Point, 4326),              -- NUEVO: para matching por cercanía
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- NUEVO
);

-- Tabla Centros
CREATE TABLE Centros (
    id_centro SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(150),
    telefono VARCHAR(20),
    email VARCHAR(100) UNIQUE,                     -- NUEVO: si el centro también inicia sesión
    password_hash VARCHAR(255)                      -- NUEVO
);

-- Tabla Actividades
CREATE TABLE Actividades (
    id_actividad SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,                              -- NUEVO
    fecha DATE NOT NULL,
    cupos INT NOT NULL,
    ubicacion GEOGRAPHY(Point, 4326),
    dificultad VARCHAR(20),                        -- NUEVO: se menciona en el use case de Usuario
    estado VARCHAR(20) DEFAULT 'activa',           -- NUEVO: para marcar suspensiones
    id_centro INT REFERENCES Centros(id_centro)
);

-- Tabla Inscripciones
CREATE TABLE Inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuarios(id_usuario),
    id_actividad INT REFERENCES Actividades(id_actividad),
    fecha_inscripcion DATE DEFAULT CURRENT_DATE,
    UNIQUE (id_usuario, id_actividad)              -- NUEVO: evita doble inscripción
);

-- Tabla Tickets (soporte del Administrador)
CREATE TABLE Tickets (
    id_ticket SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuarios(id_usuario),
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Contactos (resultado del matching)
CREATE TABLE Contactos (
    id_contacto SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuarios(id_usuario),
    id_amigo INT REFERENCES Usuarios(id_usuario),
    estado VARCHAR(20) DEFAULT 'pendiente',        -- NUEVO: pendiente/aceptado/rechazado
    fecha_contacto TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- NUEVO
    UNIQUE (id_usuario, id_amigo)                  -- NUEVO: evita duplicados
);

-- Tabla Intereses (NUEVA: base del matching por afinidad)
CREATE TABLE Intereses (
    id_interes SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla puente Usuario_Intereses (NUEVA: relación N:N)
CREATE TABLE Usuario_Intereses (
    id_usuario INT REFERENCES Usuarios(id_usuario),
    id_interes INT REFERENCES Intereses(id_interes),
    PRIMARY KEY (id_usuario, id_interes)
);