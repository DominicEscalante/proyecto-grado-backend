-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable PostGIS Topology extension
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- Set default timezone to UTC
SET TIMEZONE='UTC';
