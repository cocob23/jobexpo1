# Implementación del Sistema de Cotizaciones y Planillas

## ¿Cómo utilizar este README y GitHub Copilot?

- Este archivo describe la estructura, configuración y funcionalidades del sistema.
- Si necesitas modificar, agregar o entender alguna funcionalidad, puedes pedir ayuda a **GitHub Copilot** (el asistente de IA).
- Ejemplos de cómo pedir ayuda:
  - "¿Cómo agrego un nuevo campo al formulario de cotizaciones?"
  - "¿Cómo cambio la política de acceso para los técnicos externos?"
  - "¿Cómo implemento notificaciones por email?"
- Copilot te responderá con instrucciones paso a paso y fragmentos de código para modificar los archivos correspondientes.
- Si tienes dudas sobre la estructura, revisa las secciones de este README.

# Implementación del Sistema de Cotizaciones y Planillas

## Resumen de Funcionalidades

### 1. Sistema de Cotizaciones
- **FM**: Pueden crear cotizaciones con estado inicial "Cotizado"
- **Superadmin**: Puede ver todas las cotizaciones y filtrar por FM, cliente o fecha
- **Estados**: Cotizado → Aprobado → Cerrado → Facturado → Desestimado
- **Campos**: Cliente, descripción, monto, fecha, estado, FM que lo sube
- **Numeración**: Se asigna automáticamente empezando desde 1

### 2. Sistema de Planillas de Gestión
- **Mantenimiento Externo**: Pueden subir planillas de gestión y gastos a fin de mes
- **Tipos**: Planilla de Gestión y Planilla de Gastos
- **Archivos**: Solo se aceptan archivos Excel (.xlsx)
- **Organización**: Por mes y año

## Configuración en Supabase

### Paso 1: Ejecutar Scripts SQL
1. Ir a Supabase Studio → SQL Editor
2. **PRIMERO**: Copiar y ejecutar el contenido de `supabase-setup.sql`
3. **SEGUNDO**: Copiar y ejecutar el contenido de `supabase-users-setup.sql`
4. Verificar que no hay errores en ninguno de los dos scripts

### Paso 2: Configurar Storage
1. Ir a Storage en Supabase Studio
2. Crear un nuevo bucket llamado `planillas`
3. Configurar como público
4. Configurar políticas de acceso (ver más abajo)

### Paso 3: Configurar Políticas de Storage
Ejecutar en SQL Editor:

```sql
-- Permitir que usuarios autenticados suban archivos
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'planillas' AND auth.role() = 'authenticated');

-- Permitir que usuarios vean archivos públicos
CREATE POLICY "Public access to planillas" ON storage.objects
    FOR SELECT USING (bucket_id = 'planillas');

-- Permitir que usuarios eliminen sus propios archivos
CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'planillas' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Estructura de Archivos Implementados

### Hooks
- `useCotizaciones.ts` - Manejo de cotizaciones
- `usePlanillasGestion.ts` - Manejo de planillas
- `useAuth.ts` - Autenticación

### Componentes
- `CotizacionForm.tsx` - Formulario para crear cotizaciones
- `CotizacionesList.tsx` - Lista y filtros de cotizaciones
- `PlanillaGestionForm.tsx` - Formulario para subir planillas

### Páginas
- `fm/cotizaciones.tsx` - Página de cotizaciones para FM
- `superadmin/cotizaciones.tsx` - Página de cotizaciones para superadmin
- `mantenimiento-externo/planillas.tsx` - Página de planillas para mantenimiento externo
- `mantenimiento-externo/MantenimientoExternoLayout.tsx` - Layout para mantenimiento externo

### Tipos
- `types.ts` - Interfaces TypeScript

## Rutas Agregadas

### FM
- `/fm/cotizaciones` - Gestión de cotizaciones

### Superadmin
- `/superadmin/cotizaciones` - Ver todas las cotizaciones

### Mantenimiento Externo
- `/mantenimiento-externo` - Subir planillas de gestión

## Configuración de Usuarios

### Roles Requeridos
1. **FM**: `role = 'fm'` - Pueden crear y ver sus cotizaciones
2. **Superadmin**: `role = 'superadmin'` - Pueden ver y gestionar todas las cotizaciones
3. **Mantenimiento Externo**: `role = 'mantenimiento-externo'` - Pueden subir planillas

> **Nota:** El rol `mantenimiento-externo` en facility-web ahora es idéntico al de facility-app, reemplazando al anterior `tecnicos-externos`.

### Configurar Roles de Usuarios
Después de ejecutar los scripts SQL, necesitas configurar los roles:

1. **Crear un superadmin** (ejecutar en SQL Editor):
```sql
-- Primero, insertar el usuario en la tabla usuarios
INSERT INTO usuarios (id, email, role) 
VALUES ('TU_UUID_AQUI', 'tu_email@ejemplo.com', 'superadmin')
ON CONFLICT (id) DO UPDATE SET role = 'superadmin';

-- Reemplazar 'TU_UUID_AQUI' con el UUID real del usuario
-- Puedes obtenerlo de auth.users o del perfil del usuario
```

2. **Asignar otros roles**:
```sql
-- Asignar rol de mantenimiento externo
UPDATE usuarios SET role = 'mantenimiento-externo' WHERE email = 'externo@ejemplo.com';

-- Asignar rol de FM
UPDATE usuarios SET role = 'fm' WHERE email = 'fm@ejemplo.com';
```

3. **Verificar roles actuales**:
```sql
SELECT id, email, role FROM usuarios;
```

## Funcionalidades Implementadas

### Para FM
- ✅ Crear cotizaciones con todos los campos requeridos
- ✅ Ver lista de sus cotizaciones
- ✅ Cambiar estado de sus cotizaciones
- ✅ Numeración automática de cotizaciones (IDs secuenciales: 1, 2, 3...)

### Para Superadmin
- ✅ Ver todas las cotizaciones del sistema
- ✅ Filtrar por nombre del FM, cliente o fecha
- ✅ Cambiar estado de cualquier cotización
- ✅ Vista completa con información del FM (nombre, apellido, email)

### Para Mantenimiento Externo
- ✅ Subir planillas de gestión (Excel)
- ✅ Subir planillas de gastos (Excel)
- ✅ Seleccionar mes y año
- ✅ Ver historial de planillas subidas
- ✅ Eliminar planillas propias

## Características Técnicas

### IDs Secuenciales
- **Cotizaciones**: IDs secuenciales empezando desde 1 (1, 2, 3, 4...)
- **Planillas**: IDs auto-incrementales estándar
- **Sincronización**: La secuencia se ajusta automáticamente si ya existen cotizaciones

### Seguridad
- Row Level Security (RLS) habilitado
- Políticas por rol de usuario
- Validación de archivos (solo Excel)
- Triggers para validar roles

### Rendimiento
- Índices en campos de búsqueda
- Paginación en listas
- Filtros optimizados

### UX/UI
- Diseño responsive con Tailwind CSS
- Formularios validados
- Estados de carga y error
- Confirmaciones para acciones destructivas

## Próximos Pasos

### Mejoras Sugeridas
1. **Notificaciones**: Email cuando se cambia estado de cotización
2. **Reportes**: Exportar cotizaciones a PDF/Excel
3. **Dashboard**: Gráficos de cotizaciones por estado
4. **Auditoría**: Log de cambios en cotizaciones
5. **Adjuntos**: Permitir múltiples archivos por cotización

### Mantenimiento
1. Revisar logs de errores regularmente
2. Monitorear uso de storage
3. Actualizar políticas de seguridad según necesidades
4. Backup de datos críticos

## Solución de Problemas

### Error: "Solo los FMs pueden crear cotizaciones"
- Verificar que el usuario tenga rol `fm` o `superadmin`
- Revisar la tabla `usuarios` y el campo `role`

### Error: "Solo los mantenimiento externo pueden subir planillas"
- Verificar que el usuario tenga rol `mantenimiento-externo`
- Revisar la tabla `usuarios` y el campo `role`

### Error: "Bucket no encontrado"
- Verificar que existe el bucket `planillas` en Storage
- Verificar políticas de acceso al bucket

### Error: "Política RLS deniega acceso"
- Verificar que las políticas RLS estén configuradas correctamente
- Verificar que el usuario esté autenticado
- Revisar logs de Supabase para más detalles

## Contacto y Soporte

Para problemas técnicos o preguntas sobre la implementación:
1. Revisar logs de Supabase
2. Verificar configuración de políticas
3. Comprobar roles de usuario
4. Revisar consola del navegador para errores JavaScript
