# proyecto-grado-backend

## Evidencias multimedia con Supabase Storage

La API usa almacenamiento local en `uploads/` durante el desarrollo. Para guardar las evidencias en internet:

1. Crea un proyecto en Supabase y abre **Storage → New bucket**.
2. Nombra el bucket `evidencias-reportes` y habilita **Public bucket**. La aplicación comparte estas evidencias con operadores mediante URLs; cualquier persona que conozca una URL pública podrá verla, así que usa únicamente archivos de demostración.
3. En **Project Settings → API**, copia la URL del proyecto y la clave `service_role` (o secret equivalente). La clave solo debe configurarse en el backend.
4. Define estas variables en el entorno del backend (o en el `.env` local):

   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<clave-secreta>
   SUPABASE_STORAGE_BUCKET=evidencias-reportes
   MAX_FILE_SIZE_MB=10
   ```

5. Reinicia el backend. Cuando ambas credenciales están presentes, los archivos se envían a Supabase y la base de datos guarda su URL pública. Si no están definidas, sigue funcionando el almacenamiento local.

El plan gratuito de Supabase permite hasta 50 MB por archivo, pero la API mantiene el límite de 10 MB configurado actualmente en la interfaz y el backend. Las credenciales secretas no deben subirse a Git ni ponerse en variables `VITE_*` del frontend.
