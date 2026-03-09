PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Demo user for GigWorks Music LLC
INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at)
VALUES (999, 'demo-user', 'demo-mode-placeholder-hash', 'user', datetime('now'));

-- Sample transactions for the current tax year
INSERT INTO transactions (user_id, date, type, category, amount, description, payment_method, venue, vendor)
VALUES
  (999, '2026-02-28', 'INCOME', 'Live Performance', 215000, 'GigWorks Residency at Neon Lounge', 'Ticketing', 'Neon Lounge', 'Neon Lounge'),
  (999, '2026-02-14', 'EXPENSE', 'Equipment', 52000, 'New studio monitors and stands', 'Credit Card', NULL, 'Studio Supply Co.'),
  (999, '2026-01-30', 'INCOME', 'Streaming Royalties', 98000, 'Q4 royalty payout from streaming services', 'ACH', NULL, 'StreamHive'),
  (999, '2026-01-18', 'EXPENSE', 'Travel', 13450, 'Round-trip flights for west coast tour', 'Corporate Card', NULL, 'Aerostar Airlines'),
  (999, '2026-01-08', 'INCOME', 'Merchandise', 61200, 'Limited-edition vinyl drop at merch table', 'Cash', 'Pop Loft', NULL),
  (999, '2025-12-22', 'EXPENSE', 'Promotion', 29900, 'Organic social campaigns for holiday tour', 'Bank Transfer', NULL, 'GigWorks Collective'),
  (999, '2025-12-10', 'INCOME', 'Live Performance', 178500, 'Winter showcase at Aurora Hall', 'Ticketing', 'Aurora Hall', 'Aurora Hall'),
  (999, '2025-11-05', 'EXPENSE', 'Equipment', 87000, 'Software licenses and synth modules', 'Credit Card', NULL, 'SynthWorks LLC'),
  (999, '2025-10-18', 'INCOME', 'Sync Licensing', 142500, 'Commercial music placement payout', 'ACH', NULL, 'SyncWave Media'),
  (999, '2025-09-03', 'EXPENSE', 'Transportation', 45500, 'Sprinter van maintenance + tires', 'Corporate Card', NULL, 'RoadReady Auto');

-- Assets representing instruments, computers, and tour gear
INSERT INTO assets (user_id, name, purchase_date, cost_basis, depreciation_method, equipment_category, notes)
VALUES
  (999, 'Fender Jazzmaster Guitar', '2024-05-12', 180000, 'ST_5YEAR', 'INSTRUMENTS_SOUND', 'Primary touring guitar with custom pickups.'),
  (999, 'MacBook Pro 16" (2023)', '2023-11-02', 320000, 'ST_5YEAR', 'TECHNOLOGY_COMPUTING', 'Audio editing rig used for mixing + mastering.'),
  (999, 'SSL Duality Delta Console', '2024-02-28', 640000, 'ST_7YEAR', 'STAGE_STUDIO', 'Studio console for hybrid live/studio sessions.'),
  (999, 'Mercedes-Benz Sprinter Van', '2023-08-15', 3800000, 'ST_5YEAR', 'TRANSPORTATION', 'Touring van retrofitted for equipment + crew.');

COMMIT;
PRAGMA foreign_keys = ON;
