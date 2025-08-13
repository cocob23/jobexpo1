# Implementación del Sistema de Cotizaciones y Planillas - App Móvil

## Resumen de Funcionalidades Implementadas

### 1. Sistema de Cotizaciones
- **FM**: Pueden crear cotizaciones con estado inicial "Cotizado"
- **Superadmin**: Puede ver todas las cotizaciones y filtrar por FM, cliente o fecha
- **Estados**: Cotizado → Aprobado → Cerrado → Facturado → Desestimado
- **Campos**: Cliente, descripción, monto, fecha, estado, FM que lo sube
- **Numeración**: Se asigna automáticamente empezando desde 1

### 2. Sistema de Planillas de Gestión
- **Técnicos Externos**: Pueden subir planillas de gestión y gastos a fin de mes
- **Tipos**: Planilla de Gestión y Planilla de Gastos
- **Archivos**: Solo se aceptan archivos Excel (.xlsx)
- **Organización**: Por mes y año

## Estructura de Archivos Implementados

### Tipos
- `types/index.ts` - Interfaces TypeScript para cotizaciones y planillas

### Hooks
- `hooks/useCotizaciones.ts` - Manejo de cotizaciones
- `hooks/usePlanillasGestion.ts` - Manejo de planillas (con DocumentPicker)
- `hooks/useAuth.ts` - Autenticación

### Páginas
- `app/(fm)/cotizaciones.tsx` - Página de cotizaciones para FM
- `app/(superadmin)/cotizaciones.tsx` - Página de cotizaciones para superadmin
- `app/(mantenimiento)/planillas.tsx` - Página de planillas para técnicos externos

## Características Específicas de la App Móvil

### UI/UX Adaptada para Móvil
- **ScrollView** con RefreshControl para actualizar datos
- **Cards** adaptadas para pantallas táctiles
- **Formularios** optimizados para entrada móvil
- **Alertas nativas** para confirmaciones y errores
- **Estados de carga** con ActivityIndicator

### Funcionalidades Móviles
- **Pull to refresh** para actualizar listas
- **DocumentPicker** para seleccionar archivos Excel
- **Linking** para abrir archivos en el navegador
- **Responsive design** para diferentes tamaños de pantalla

### Gestión de Archivos
- **DocumentPicker** de Expo para seleccionar archivos
- **Validación** de tipo de archivo (solo .xlsx)
- **Subida** a Supabase Storage
- **Visualización** de archivos subidos

## Dependencias Utilizadas

### Ya Instaladas
- `@supabase/supabase-js` - Cliente de Supabase
- `expo-document-picker` - Selección de archivos
- `@react-native-picker/picker` - Selectores nativos

### Configuración
- **Supabase** ya configurado en `constants/supabase.ts`
- **Variables de entorno** para URL y claves de Supabase

## Rutas de Navegación

### FM
- `/fm/cotizaciones` - Gestión de cotizaciones

### Superadmin
- `/superadmin/cotizaciones` - Ver todas las cotizaciones

### Técnicos Externos (Mantenimiento)
- `/mantenimiento/planillas` - Subir planillas de gestión

## Funcionalidades por Rol

### Para FM
- ✅ Crear cotizaciones con todos los campos requeridos
- ✅ Ver lista de sus cotizaciones
- ✅ Cambiar estado de sus cotizaciones
- ✅ Numeración automática de cotizaciones
- ✅ Pull to refresh para actualizar datos

### Para Superadmin
- ✅ Ver todas las cotizaciones del sistema
- ✅ Filtrar por FM, cliente o fecha
- ✅ Cambiar estado de cualquier cotización
- ✅ Vista completa con información del FM
- ✅ Filtros optimizados para móvil

### Para Técnicos Externos
- ✅ Subir planillas de gestión (Excel)
- ✅ Subir planillas de gastos (Excel)
- ✅ Seleccionar mes y año con pickers nativos
- ✅ Ver historial de planillas subidas
- ✅ Eliminar planillas propias
- ✅ Selección de archivos con DocumentPicker

## Características Técnicas

### Seguridad
- Row Level Security (RLS) habilitado
- Políticas por rol de usuario
- Validación de archivos (solo Excel)
- Triggers para validar roles

### Rendimiento
- **Pull to refresh** para actualizaciones
- **Estados de carga** optimizados
- **Manejo de errores** con alertas nativas
- **Validación** en tiempo real

### UX/UI Móvil
- **Cards** con sombras y bordes redondeados
- **Colores** consistentes con el diseño web
- **Espaciado** optimizado para pantallas táctiles
- **Feedback visual** para todas las acciones

## Configuración Requerida

### 1. Variables de Entorno
Asegúrate de tener configuradas en tu archivo `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 2. Supabase
- Ejecutar el script SQL (`supabase-setup.sql`) en Supabase
- Crear el bucket `planillas` en Storage
- Configurar políticas de Storage

### 3. Permisos de Archivos
La app móvil utiliza `expo-document-picker` que no requiere permisos especiales adicionales.

## Uso de la App

### Crear Cotización (FM)
1. Ir a `/fm/cotizaciones`
2. Tocar "Nueva Cotización"
3. Completar formulario
4. Tocar "Crear Cotización"

### Ver Todas las Cotizaciones (Superadmin)
1. Ir a `/superadmin/cotizaciones`
2. Usar filtros si es necesario
3. Cambiar estados con los pickers

### Subir Planilla (Técnicos Externos)
1. Ir a `/mantenimiento/planillas`
2. Tocar "Subir Planilla"
3. Seleccionar tipo, mes y año
4. Tocar "Seleccionar Archivo"
5. Elegir archivo Excel
6. Tocar "Subir Planilla"

## Solución de Problemas

### Error: "No se pudo crear la cotización"
- Verificar conexión a internet
- Verificar que el usuario tenga rol correcto
- Revisar logs de Supabase

### Error: "No se pudo subir la planilla"
- Verificar que el archivo sea Excel (.xlsx)
- Verificar conexión a internet
- Verificar permisos de Storage en Supabase

### Error: "Política RLS deniega acceso"
- Verificar que las políticas RLS estén configuradas
- Verificar que el usuario esté autenticado
- Verificar rol del usuario en la tabla `usuarios`

## Próximos Pasos

### Mejoras Sugeridas
1. **Notificaciones push** cuando se cambia estado
2. **Offline support** con sincronización
3. **Cámara** para escanear documentos
4. **Firma digital** en cotizaciones
5. **Reportes** integrados en la app

### Mantenimiento
1. Revisar logs de errores regularmente
2. Monitorear uso de storage
3. Actualizar políticas de seguridad según necesidades
4. Testear en diferentes dispositivos

## Compatibilidad

### Dispositivos Soportados
- **iOS**: 13.0+
- **Android**: 5.0+ (API 21+)
- **Expo**: SDK 53+

### Funcionalidades por Plataforma
- **DocumentPicker**: iOS y Android
- **Linking**: iOS y Android
- **Alertas**: Nativas en ambas plataformas
- **Pickers**: Nativos en ambas plataformas

## Contacto y Soporte

Para problemas técnicos o preguntas sobre la implementación móvil:
1. Revisar logs de Supabase
2. Verificar configuración de políticas
3. Comprobar roles de usuario
4. Revisar logs de Expo/React Native
5. Verificar permisos de archivos en el dispositivo
