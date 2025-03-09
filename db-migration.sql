-- Add new columns to maintenances table
ALTER TABLE maintenances 
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS customer_feedback INTEGER,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount INTEGER,
  ADD COLUMN IF NOT EXISTS labor_cost INTEGER,
  ADD COLUMN IF NOT EXISTS total_chemical_cost INTEGER,
  ADD COLUMN IF NOT EXISTS profit_amount INTEGER,
  ADD COLUMN IF NOT EXISTS profit_percentage INTEGER;

-- Create chemical_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS chemical_usage (
  id SERIAL PRIMARY KEY,
  maintenance_id INTEGER NOT NULL REFERENCES maintenances(id),
  chemical_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  unit TEXT NOT NULL,
  unit_cost INTEGER NOT NULL,
  total_cost INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create water_readings table if it doesn't exist
CREATE TABLE IF NOT EXISTS water_readings (
  id SERIAL PRIMARY KEY,
  maintenance_id INTEGER NOT NULL REFERENCES maintenances(id),
  ph_level INTEGER,
  chlorine_level INTEGER,
  alkalinity INTEGER,
  cyanuric_acid INTEGER,
  calcium_hardness INTEGER,
  total_dissolved_solids INTEGER,
  salt_level INTEGER,
  phosphates INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);