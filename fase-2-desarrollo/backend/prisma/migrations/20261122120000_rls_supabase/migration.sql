-- Auditoría del 22-nov (S-22): Supabase expone el schema public en su Data API con los roles
-- anon y authenticated. Sin RLS, quien tuviera la URL del proyecto y la clave anon leía y
-- escribía las tablas de la app, correos y hashes incluidos.
-- RLS sin políticas deja fuera a esos roles. La API entra como dueña de las tablas, y al dueño
-- RLS no lo afecta: Kancha funciona igual. Prisma no genera RLS; se escribe a mano.
-- Fuera de alcance: _prisma_migrations (es de Prisma) y spatial_ref_sys (es de PostGIS).
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Participation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
