# Informe de Revisión del Proyecto xKey

Fecha de Revisión: 2026-06-16
Versión Actual: 5.7.0
Alcance: código fuente React/Vite, Capacitor Android, almacenamiento, seguridad, interfaz de usuario, soporte multilingüe, compilación y dirección del producto.

## 1. Propósito del Proyecto

xKey es una aplicación de gestión de bóvedas de billeteras Web3 con un enfoque principal en el uso sin conexión (offline-first). La aplicación permite a los usuarios almacenar direcciones de billeteras, claves privadas, frases semilla, notas, etiquetas, carpetas, códigos QR, archivos de copia de seguridad `.xkey`, datos CSV y saldos de activos localmente en el dispositivo.

El objetivo central de xKey es ser una "bóveda de claves privadas" local, no una billetera de transacciones en línea. Los usuarios pueden usar xKey para:

- Gestionar múltiples billeteras Web3 en una bóveda cifrada.
- Almacenar claves privadas y frases semilla en formato cifrado localmente.
- Crear nuevas billeteras, importar billeteras manualmente, generar billeteras personalizadas (vanity) por prefijo/sufijo.
- Agrupar billeteras por carpetas, etiquetas, redes, estado fijado o saldos.
- Realizar copias de seguridad/restaurar utilizando archivos `.xkey` protegidos con contraseña.
- Exportar CSV cuando sea necesario para inventario o auditoría.
- Escanear, mostrar, compartir y descargar códigos QR para direcciones o datos de billeteras.
- Rastrear saldos manualmente en unidades opcionales como `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, puntos o etiquetas personalizadas.
- Usar Credenciales de Dispositivo Android (Android Device Credential) para desbloquear la bóveda con la huella dactilar, rostro, PIN, contraseña o patrón del dispositivo.

## 2. Fortalezas Actuales

### Seguridad y Almacenamiento

- Los datos de la billetera se cifran localmente, lo que se ajusta al objetivo de la bóveda fuera de línea.
- Campos sensibles como claves privadas y frases semilla se cifran adicionalmente a nivel de campo antes de que se cifre toda la lista de billeteras.
- La versión nativa de Android cuenta con un complemento dedicado para Credenciales de Dispositivo, utilizando Android Keystore para envolver la clave de la bóveda.
- `android:allowBackup="false"` está configurado en AndroidManifest, reduciendo el riesgo de copias de seguridad no deseadas de los datos de la aplicación.
- Incluye mecanismos como bloqueo automático por inactividad, borrado automático del portapapeles, escudo de privacidad cuando la aplicación está inactiva y solicitudes de contraseña maestra al ver datos sensibles.
- Soporta borrado/restablecimiento (wipe/reset) cuando la bóveda encuentra un error crítico.

### Experiencia del Usuario

- La página de inicio soporta un diseño responsivo, con una lista de billeteras de múltiples columnas en pantallas grandes y optimización para dispositivos móviles.
- Cuenta con un escalado de visualización personalizable del 5% al 200%, adecuado para dispositivos pequeños o usuarios que deseen ver más datos.
- Proporciona modos denso/compacto/ultra compacto para la lista de billeteras.
- Los botones para copiar, QR, expandir billetera, agregar billetera, herramientas, búsqueda, filtro y ordenar están ubicados cerca del flujo de trabajo real.
- Cuenta con una carpeta de billeteras personalizadas, etiquetas NEW, un anillo brillante para billeteras recién creadas y navegación automática a la carpeta que contiene la nueva billetera.
- El modal de edición de saldo incluye búsqueda, pegar, copiar dirección, importar CSV, filtro y guardado automático de borradores.
- Los mensajes emergentes (Toasts) y confirmaciones han sido rediseñados para lucir más profesionales y tienden a escalar de acuerdo con la proporción de la pantalla.

### Características

- Crear billeteras regulares, importar manualmente y generar billeteras personalizadas usando un worker dedicado.
- Copia de seguridad `.xkey`, importar/exportar CSV, detector de duplicados, análisis, herramientas avanzadas.
- Transferencia por QR protegida con contraseña, escáner QR, compartir/descargar QR.
- Soporta redes populares: XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Soporte multilingüe con 15 idiomas.
- La versión se obtiene de `package.json`/información de la app nativa y se muestra en la aplicación.

### Compilación y Android

- `npm run lint` se completa con éxito.
- `npm run build` se completa con éxito.
- `npx cap sync android` sincroniza con éxito los recursos web a Android.
- La versión actual de Android es `versionName "5.7.0"` y `versionCode 57`.
- `.gitignore` excluye adecuadamente `1/`, artefactos de compilación, secretos de firma, `.xkey`, APK/AAB y archivos locales.

## 3. Debilidades y Problemas Potenciales

### Nivel Alto

1. Las dependencias tienen advertencias de seguridad de `npm audit`.

   Ejecutar `npm audit --omit=dev` reporta:

   - `vite 8.0.0 - 8.0.15`: severidad alta, relacionado con rutas de Windows/UNC en el servidor de desarrollo.
   - `ws` vía `ethers`: severidad alta/moderada. `npm audit fix --force` sugiere rebajar `ethers` a la versión principal 5, lo que podría causar cambios incompatibles (breaking changes).

   Recomendación: Actualice Vite de forma segura dentro del rango de parche/menor primero. Para `ethers/ws`, verifique si hay una versión más reciente de `ethers` o anule `ws` si está soportado; evite usar ciegamente `--force`.

2. La versión de lanzamiento de Android no ha habilitado shrink/minify.

   `android/app/build.gradle` actualmente tiene `release { minifyEnabled false }`. Esto no hace que la aplicación falle, pero hace que el APK/AAB sea más fácil de aplicar ingeniería inversa y tenga un tamaño mayor.

   Recomendación: Intente habilitar R8/ProGuard para el lanzamiento, agregue reglas de mantenimiento (keep rules) para Capacitor/plugins si es necesario, y pruebe exhaustivamente antes de publicar.

3. La clave AES de respaldo (fallback) todavía se almacena en Preferencias.

   Actualmente, el código almacena `xkey_aes_fallback` para recuperación o compatibilidad web/de respaldo. Esta es una compensación para reducir el riesgo de pérdida de la bóveda al cambiar los métodos de bloqueo del dispositivo, pero en términos de seguridad nativa de Android, es más débil que mantener la clave solo en Keystore.

   Recomendación: Separe claramente los dos modos:
   - Modo Seguro de Android: La clave solo se desenvuelve a través de Keystore/credenciales del dispositivo.
   - Modo de Compatibilidad: Mantiene la clave de respaldo, mostrando una advertencia clara al usuario.

4. Algunas traducciones secundarias todavía contienen cadenas en inglés.

   Las comprobaciones automáticas muestran que muchas configuraciones regionales como `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` todavía tienen cadenas como `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics`.

   Recomendación: Cree un script de comprobación de i18n en CI para fallar la compilación cuando a una configuración regional le falten claves o todavía tenga claves sin procesar importantes.

### Nivel Medio

1. Faltan claves en múltiples idiomas (locales).

   En comparación con `en.js`, a la mayoría de las configuraciones regionales, excepto `vi`, les falta:
   - `common.warning`
   - `createWallet.vanityLongTitle`

   Debido a que `LanguageContext` recurre al inglés, la aplicación no se bloquea, pero la experiencia multilingüe está incompleta.

2. `chainBulk` es una clave adicional en muchas configuraciones regionales.

   Muchas configuraciones regionales tienen el grupo `chainBulk.*`, pero `en.js` no. Estas podrían ser claves heredadas o no sincronizadas. Si bien no causan errores directos, dificultan la gestión de la traducción.

3. El modo de frase de contraseña AES de CryptoJS no es el estándar de cifrado más moderno.

   `CryptoJS.AES.encrypt(data, key)` funciona, pero no es tan explícito como un modelo estándar con etiquetas dedicadas salt/KDF/IV/auth. AES-GCM o WebCrypto serían más fáciles de auditar.

   Recomendación a largo plazo: Migre el formato de la bóveda a WebCrypto AES-GCM, con parámetros PBKDF2/Argon2id explícitamente definidos, cargas útiles versionadas y etiquetas de autenticación obligatorias.

4. La contraseña maestra usa PBKDF2 con 10,000 iteraciones.

   Este nivel es algo bajo para los estándares actuales en la protección de datos sensibles. Si bien es una contraseña secundaria para ver claves privadas/semillas y no la clave principal de la bóveda, aun así debería incrementarse.

   Recomendación: Aumente las iteraciones basándose en puntos de referencia de dispositivos y almacene el hash de la versión para que las migraciones no corrompan datos antiguos.

5. El borrado automático del portapapeles no está garantizado absolutamente en todas las plataformas.

   El código verifica si el portapapeles aún contiene el valor correcto antes de borrarlo, lo cual es un buen enfoque. Sin embargo, Android y los navegadores pueden restringir la escritura en el portapapeles cuando no es activada por un gesto del usuario.

   Recomendación: Describa claramente en la UI que "xKey intentará borrar el portapapeles si el SO lo permite", sin hacer promesas absolutas.

6. Falta de pruebas automatizadas prácticas.

   El proyecto cuenta con linting y compilación, pero carece de pruebas unitarias/e2e para flujos críticos como desbloqueo, importar/exportar, creación de billeteras personalizadas, edición de saldos, operaciones de portapapeles e i18n.

   Recomendación: Agregue pruebas de humo (smoke tests) usando Playwright para web y una lista de verificación para la instrumentación de Android/pruebas de lanzamiento manuales.

### Nivel Bajo

1. `console.error` permanece en algunos lugares.

   No es crítico, pero debería agruparse en un registrador (logger) o entorno de solo desarrollo para evitar filtrar seguimientos (stacks) innecesarios en producción.

2. Vite advierte sobre fragmentos (chunks) grandes.

   Los fragmentos `index` y `scan` son grandes. Esto no es un error de tiempo de ejecución, pero podría ralentizar la carga de la aplicación en dispositivos de gama baja.

   Recomendación: Carga diferida (Lazy load) para el escáner QR, rutas pesadas de ethers, herramientas avanzadas y vistas más profundas del panel.

3. Algunos elementos de la interfaz de usuario podrían romperse a escalas muy bajas o muy altas.

   La aplicación maneja bien el escalado en muchas áreas, pero los modales grandes, códigos QR, formularios densos, hojas inferiores y tarjetas de billetera aún necesitan ser probados al 5%, 50%, 75%, 100%, 150% y 200%.

## 4. Evaluación de Grupos de Características

### Seguridad de Desbloqueo

El enfoque de Credenciales de Dispositivo de Android es correcto, ya que permite al SO manejar la biometría y recurrir al PIN/contraseña/patrón. El riesgo principal radica en la migración entre el antiguo mecanismo de PIN, las claves de respaldo y las claves de Keystore.

Recomendaciones:
- Proporcione una pantalla de "Estado de Seguridad de la Bóveda": Android Secure, Web Fallback, Compatibility, requiere configuración de bloqueo de dispositivo.
- Si se detecta una clave invalidada, no genere automáticamente una nueva clave de bóveda si la antigua todavía contiene texto cifrado; guíe al usuario hacia la recuperación/borrado (wipe) en su lugar.
- Registre los estados de desbloqueo internos sin registrar datos sensibles.

### Generación de Billeteras Personalizadas (Vanity)

El uso de un worker separado es correcto, ya que evita que la interfaz de usuario se congele. Las mejoras recientes como la cantidad de billeteras, guardado automático en carpeta, pausar el bloqueo automático durante la generación, límites de tiempo y advertencias de patrones largos son todas razonables.

Recomendaciones:
- Mostrar claramente la probabilidad/tiempo estimado en función de la longitud del patrón.
- Permitir pausar/reanudar/detener el trabajo.
- Guardar un historial de trabajos generados para que los usuarios sepan de qué lote provienen las billeteras.
- Proporcionar fuertes advertencias para patrones excesivamente largos en dispositivos móviles.

### Edición de Saldos de Activos

El flujo de trabajo actual se adapta a los usuarios que verifican las direcciones en los exploradores de bloques y luego ingresan los saldos manualmente. Los puntos fuertes incluyen búsqueda, copiar dirección, pegar, filtro, soporte CSV y guardado automático de borradores.

Recomendaciones:
- Agregue un modo de "verificación paso a paso": la pantalla muestra 1 billetera a la vez, dirección completa, botón de copia, enlace al explorador por red y un campo de entrada grande.
- Permitir marcar como "verificado" para evitar omitir entradas.
- Permitir importaciones CSV con las columnas `address,balance,unit,network`.
- Agregue una función de deshacer para la última edición.

### Multilingüe

Recurrir al inglés evita que la interfaz de usuario se rompa, pero un producto dirigido a una audiencia internacional necesita un control de traducción más estricto.

Recomendaciones:
- Crear un script `npm run i18n:check`.
- Reportar claves faltantes, claves adicionales y claves de traducción sin procesar en la UI.
- Priorizar traducciones precisas para los grupos de seguridad, copia de seguridad, borrado (wipe), clave privada y frase semilla.

### Lanzamiento en Android

La configuración actual es suficiente para compilar y sincronizar, pero falta endurecer (hardening) la versión de lanzamiento.

Recomendaciones:
- Habilite minify para el lanzamiento después de realizar pruebas.
- Agregue un paso de CI `npm audit --omit=dev` con una lista de permitidos clara.
- Compile APK/AAB a través de GitHub Actions en envíos de etiquetas (tag pushes).
- Mantenga las notas de la versión en el repositorio.

## 5. Ideas de Actualización Propuestas

### A Corto Plazo

- Corregir todas las claves de traducción faltantes: `common.warning`, `createWallet.vanityLongTitle`.
- Limpiar las cadenas en inglés que persisten en otras configuraciones regionales.
- Agregar un script de comprobación de i18n a CI.
- Actualizar Vite para resolver la advertencia actual.
- Agregar una página de "Estado de Seguridad" en la configuración.
- Agregar una nota clara de que el borrado automático del portapapeles es un intento que hace el sistema ("best-effort").
- Agregar un botón de "abrir en el explorador" por red en el modal de edición de saldo.
- Agregar mensajes de deshacer (undo snackbars) para eliminación de billeteras, edición de saldos y cambios de carpetas.

### A Medio Plazo

- Migrar el formato de cifrado a WebCrypto AES-GCM versionado.
- Separar el Modo Seguro de Android y el Modo de Compatibilidad.
- Agregar pruebas de humo de Playwright para los flujos principales.
- Carga diferida de escáner/análisis/herramientas avanzadas para reducir el tamaño del paquete inicial.
- Agregar exportación/importación de configuraciones que excluya datos sensibles.
- Agregar un modo de "Auditoría de Bóveda": billeteras a las que les faltan copias de seguridad, direcciones duplicadas, redes faltantes, nombres faltantes o claves privadas que no coinciden con las direcciones.

### A Largo Plazo

- Crear una guía oficial de recuperación para escenarios como cambio de dispositivos, cambio de bloqueos de pantalla, pérdida de datos biométricos o pérdida de archivos `.xkey`.
- Agregar transferencia encriptada entre múltiples dispositivos a través de códigos QR de varias partes o archivos temporales.
- Agregar una opción solo respaldada por hardware para usuarios de alta seguridad.
- Agregar validación de direcciones a través de suma de comprobación (checksum)/red.
- Proporcionar plantillas de copias de seguridad en papel: dirección, red, notas, excluyendo claves privadas si el usuario lo elige.
- Mejor soporte de escritorio/PWA si se desea usar xKey como una bóveda fuera de línea en la computadora.

## 6. Dirección Futura del Producto

xKey debería seguir el camino de una "bóveda profesional fuera de línea para usuarios con muchas billeteras". No debería convertirse prematuramente en una billetera de transacciones en línea, ya que eso aumenta los riesgos de seguridad, dependencias de RPC, vectores de phishing, responsabilidades de firma de transacciones y superficies de ataque.

Dirección Adecuada:
1. Priorizar la seguridad de los datos: copia de seguridad, restauración, migración, advertencias claras, auditoría de bóveda.
2. Priorizar la gestión rápida de muchas billeteras: carpetas, etiquetas, filtros, ediciones por lotes, CSV, QR, generación de billeteras personalizadas.
3. Priorizar características nativas estables de Android: Credenciales de Dispositivo, Keystore, gestión de portapapeles, selector de archivos, compartir/descargar QR.
4. Priorizar una interfaz de usuario densa pero clara: escalado, modo compacto, diseños de tableta responsivos, mensajes cortos, modales no bloqueantes.
5. Priorizar la transparencia: Estado de seguridad, notas de la versión, versionado explícito en la aplicación, guías de copia de seguridad y borrado.

## 7. Conclusión

El proyecto tiene una base sólida: rico en funciones, enfoque claro de fuera de línea primero (offline-first), la integración de Credenciales de Android va por buen camino, la interfaz de usuario está altamente optimizada para dispositivos móviles/tabletas y cuenta con un conjunto completo de herramientas de gestión de billeteras.

Las principales prioridades para seguir adelante no son agregar numerosas funciones nuevas, sino hacer que la aplicación sea "más difícil de romper":
- Completar la implementación de i18n.
- Endurecer la versión de lanzamiento de Android.
- Aclarar el modelo de seguridad Keystore/fallback.
- Agregar pruebas automatizadas para flujos críticos.
- Gestionar auditorías de dependencias.
- Estandarizar el formato de cifrado a largo plazo.

Si estos puntos se abordan bien, xKey puede convertirse en una herramienta de bóveda fuera de línea altamente confiable para los usuarios que administran múltiples billeteras Web3.
