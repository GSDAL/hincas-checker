# 📋 Instrucciones para Actualizar el Despliegue

## Problema Actual

El dominio **hincacheck-piz3phqc.manus.space** no se ha actualizado automáticamente con los nuevos cambios del rediseño wizard que están en GitHub.

## ✅ Cambios Realizados

Todos los cambios del rediseño han sido:
- ✅ Implementados en el código
- ✅ Subidos al repositorio GitHub: https://github.com/GSDAL/hincas-checker
- ✅ Commit: `4c7dfcb` - "Rediseño de interfaz: Implementar flujo wizard paso a paso más intuitivo"

## 🔧 Cómo Actualizar el Despliegue en Manus

Para actualizar tu sitio **hincacheck-piz3phqc.manus.space** con los nuevos cambios, sigue estos pasos:

### Opción 1: Desde el Panel de Manus (Recomendado)

1. Accede a tu cuenta de Manus en https://manus.space
2. Ve a la sección de "Proyectos" o "Mis Aplicaciones"
3. Busca el proyecto "hincas-checker" o el dominio "hincacheck-piz3phqc.manus.space"
4. Busca un botón de "Redesplegar", "Rebuild" o "Actualizar"
5. Haz clic en ese botón para forzar un nuevo despliegue desde GitHub

### Opción 2: Reconectar el Repositorio

Si no ves la opción de redesplegar:

1. En el panel de Manus, ve a la configuración del proyecto
2. Verifica que el repositorio GitHub esté conectado correctamente
3. Si no lo está, reconecta el repositorio: https://github.com/GSDAL/hincas-checker
4. Configura el branch a desplegar: `main`
5. Guarda los cambios y espera a que se redespliegue automáticamente

### Opción 3: Webhook Manual

Si el webhook de GitHub no está configurado:

1. Ve a https://github.com/GSDAL/hincas-checker/settings/hooks
2. Verifica si hay un webhook configurado para Manus
3. Si no existe, agrégalo con la URL que te proporcione Manus
4. Esto permitirá despliegues automáticos en el futuro

## 🌐 Alternativa: Nuevo Despliegue Temporal

Mientras actualizas el despliegue permanente, puedes usar esta URL temporal que tiene el nuevo diseño funcionando:

**https://3000-iv89dl2dbvgf0bsteci6e-cac89156.us2.manus.computer/**

Esta URL muestra el nuevo diseño wizard completamente funcional.

## 📝 Archivos Modificados

Los siguientes archivos fueron creados/modificados para el nuevo diseño:

1. **client/src/components/HincasValidatorWizard.tsx** (NUEVO)
   - Componente principal del flujo wizard
   - Implementa los 4 pasos del proceso
   - Validación en tiempo real
   - Barra de progreso

2. **client/src/pages/Home.tsx** (MODIFICADO)
   - Agregado toggle entre vista Wizard y Clásica
   - Gestión de estado de vista
   - Persistencia en localStorage

3. **client/src/components/HincasValidator.tsx** (MODIFICADO)
   - Agregada prop `initialShowHistory`
   - Compatibilidad con ambas vistas

## 🎯 Verificación

Una vez actualizado el despliegue, verifica que:

1. En la esquina superior derecha aparezcan los botones "Wizard" y "Clásica"
2. Por defecto se muestre la vista Wizard
3. El primer paso muestre tres tarjetas de selección de Stage
4. El indicador de progreso muestre los 4 pasos
5. La validación en tiempo real funcione correctamente

## 💡 Soporte

Si tienes problemas para actualizar el despliegue:

1. Contacta al soporte de Manus: https://help.manus.im
2. O puedes desplegar en una plataforma alternativa como:
   - **Vercel**: https://vercel.com (gratuito, despliegue automático desde GitHub)
   - **Netlify**: https://netlify.com (gratuito, despliegue automático desde GitHub)
   - **Railway**: https://railway.app (gratuito hasta cierto uso)

## 📦 Despliegue en Vercel (Alternativa)

Si prefieres usar Vercel:

1. Ve a https://vercel.com
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Selecciona el repositorio "GSDAL/hincas-checker"
5. Vercel detectará automáticamente la configuración de Vite
6. Haz clic en "Deploy"
7. En unos minutos tendrás una URL permanente tipo: `hincas-checker.vercel.app`

Vercel se sincronizará automáticamente con cada push a GitHub.
