# DOCUMENTACIÓN DE ANÁLISIS- PROYECTO “PENSIONADOS”

## 1. Objetivo

Se requiere desarrollar un sistema web para gestionar la validación de supervivencia de pensionados.
El sistema deberá permitir registrar pensionados, almacenar sus datos y documentos de identidad, programar validaciones periódicas de supervivencia con frecuencia configurable por un administrador, registrar el resultado de dichas validaciones y generar reportes de seguimiento.
El sistema deberá contar con perfiles de administrador, operador y pensionado, y deberá resguardar la trazabilidad de las operaciones.

## 2. Alcance

Desarrollar un sistema que permita a una empresa o institución que paga pensiones verificar periódicamente que los pensionados siguen vivos, mediante un proceso de validación de supervivencia configurable por un administrador.

El sistema también debe permitir:

- El registro de pensionados
- La administración de usuarios internos
- El seguimiento del cumplimiento de las validaciones

## 3. Requerimientos del Sistema

### 3.1 Requerimientos Funcionales

### 3.1.1 Administración de usuarios internos

- **RF-01.** El sistema deberá permitir al administrador dar de alta usuarios internos.
- **RF-02.** El sistema deberá permitir al administrador modificar los datos de usuarios internos.
- **RF-03.** El sistema deberá permitir al administrador desactivar usuarios internos.
- **RF-04.** El sistema deberá permitir asignar roles a los usuarios internos, al menos:
    - Administrador
    - Operador
- **RF-05.** El sistema deberá permitir el inicio de sesión de usuarios internos mediante usuario y contraseña.
- **RF-06.** El sistema deberá controlar el acceso a funcionalidades según el rol del usuario.

### 3.1.2 Configuración del proceso de validación

- **RF-07.** El sistema deberá permitir al administrador definir la periodicidad de la validación de supervivencia.
- **RF-08.** La periodicidad deberá poder definirse en días, por ejemplo cada 30, 60, 90 o 180 días.
- **RF-09.** El sistema deberá permitir al administrador modificar la periodicidad general del proceso.
- **RF-10.** El sistema deberá permitir al administrador definir el número de días de anticipación con que se notificará al pensionado.
- **RF-11.** El sistema deberá permitir al administrador definir el número de días de tolerancia después del vencimiento de la validación.

### 3.1.3 Registro e inscripción de pensionados

- **RF-12.** El sistema deberá permitir el registro de pensionados.
- **RF-13.** El sistema deberá permitir al pensionado o al operador cargar una fotografía o escaneo de su credencial oficial.
- **RF-14.** El sistema deberá validar que la imagen de la credencial tenga un formato permitido, por ejemplo JPG, PNG o PDF.
- **RF-15.** El sistema deberá almacenar la evidencia documental asociada al expediente del pensionado.
- **RF-16.** El sistema deberá evitar registros duplicados de pensionados con el mismo CURP o número de pensión.
- **RF-17.** El sistema deberá permitir consultar el expediente completo de un pensionado.
- **RF-18.** El sistema deberá permitir actualizar los datos de contacto del pensionado.

### 3.1.4 Programación automática de validaciones

- **RF-19.** El sistema deberá generar automáticamente la siguiente fecha de validación de supervivencia para cada pensionado, a partir de la fecha de alta o de la última validación exitosa.
- **RF-20.** El sistema deberá calcular el vencimiento de la validación según la periodicidad configurada.
- **RF-21.** El sistema deberá mostrar para cada pensionado al menos:
    - Última fecha de validación
    - Próxima fecha de validación
    - Estado actual de validación
- **RF-22.** El sistema deberá clasificar el estado de validación de cada pensionado, al menos como:
    - Vigente
    - En Revisión
    - Próxima a vencer
    - Vencida

### 3.1.5 Validación de supervivencia del pensionado

- **RF-23.** El sistema deberá permitir al pensionado iniciar sesión para realizar su validación.
- **RF-24.** El sistema deberá mostrar al pensionado si tiene una validación pendiente.
- **RF-25.** El sistema deberá permitir al pensionado confirmar su supervivencia mediante un formulario de validación.
- **RF-26.** El formulario de validación deberá registrar al menos:
    - Fecha y hora de la validación
    - Confirmación expresa del pensionado
    - Evidencia cargada, si aplica
    - Observaciones
- **RF-27.** El sistema deberá permitir cargar evidencia complementaria para la validación, por ejemplo:
    - Foto reciente del pensionado
    - Documento adicional
- **RF-28.** El sistema deberá registrar el resultado de cada validación en el historial del pensionado.
- **RF-29.** Una validación exitosa deberá actualizar automáticamente la próxima fecha de validación.
- **RF-30.** Si el pensionado intenta validar fuera del periodo permitido, el sistema deberá indicarlo y registrar el evento.

### 3.1.6 Seguimiento y revisión por operadores

- **RF-31.** El sistema deberá permitir al usuario interno consultar pensionados con validación próxima a vencer.
- **RF-32.** El sistema deberá permitir consultar pensionados con validación vencida.
- **RF-33.** El sistema deberá permitir filtrar pensionados por nombre, CURP, número de pensionado, estado o fecha de validación.
- **RF-34.** El sistema deberá permitir revisar el historial de validaciones de cada pensionado.
- **RF-35.** El sistema deberá permitir registrar observaciones o comentarios por parte del operador.
- **RF-36.** El sistema deberá permitir marcar una validación como revisada.

### 3.1.7 Reportes y consultas

- **RF-37.** El sistema deberá generar un reporte de pensionados con validación vigente.
- **RF-38.** El sistema deberá generar un reporte de pensionados con validación próxima a vencer.
- **RF-39.** El sistema deberá generar un reporte de pensionados con validación vencida.
- **RF-40.** El sistema deberá permitir exportar reportes a PDF o Excel.
- **RF-41.** El sistema deberá mostrar indicadores generales, por ejemplo:
    - Total de pensionados registrados
    - Total con validación vigente
    - Total con validación vencida
    - Total pendientes de revisión

### 3.1.8 Auditoría y trazabilidad

- **RF-42.** El sistema deberá registrar bitácora de acciones relevantes realizadas por usuarios internos.
- **RF-43.** La bitácora deberá registrar al menos:
    - Usuario
    - Acción realizada
    - Fecha y hora
    - Registro afectado
- **RF-44.** El sistema deberá conservar historial de cambios en la configuración de periodicidad.

### 3.2 Requerimientos No Funcionales

#### 3.2.1 Seguridad

- **RNF-01.** El sistema deberá requerir autenticación para el acceso de usuarios internos y pensionados.
- **RNF-02.** Las contraseñas deberán almacenarse cifradas.
- **RNF-03.** El sistema deberá proteger los datos personales de los pensionados.
- **RNF-04.** El acceso a la información deberá estar restringido según el rol del usuario.

### 3.2.2 Usabilidad

- **RNF-05.** La interfaz deberá ser sencilla y comprensible para usuarios de edad avanzada.
- **RNF-06.** El proceso de validación de supervivencia deberá requerir el menor número posible de pasos.
- **RNF-07.** Los mensajes del sistema deberán ser claros y en español sencillo.

### 3.2.3 Rendimiento

- **RNF-08.** El sistema deberá responder las consultas comunes en un tiempo razonable, por ejemplo menos de 3 segundos en condiciones normales.

### 3.2.4 Disponibilidad y respaldo

- **RNF-09.** El sistema deberá permitir respaldar la base de datos y los documentos cargados.
- **RNF-10.** El sistema deberá evitar pérdida de información en caso de fallos comunes.

## 4. Reglas de negocio

- **RN-01.** Todo pensionado debe tener una próxima fecha de validación asignada.
- **RN-02.** La fecha de próxima validación se calculará a partir de la última validación aprobada.
- **RN-03.** No se permitirá registrar dos pensionados con el mismo identificador oficial.
- **RN-04.** Un pensionado con validación vencida deberá aparecer en el listado de alertas.
- **RN-05.** Solo el administrador podrá cambiar la periodicidad de validación.
- **RN-06.** Solo usuarios autorizados podrán consultar expedientes completos de pensionados.
- **RN-07.** Cada validación realizada deberá quedar almacenada en el historial, aun cuando sea rechazada o quede en revisión.
- **RN-08.** La eliminación física de expedientes no deberá permitirse; en su lugar, los registros deberán poder desactivarse.
- **RN-09.** Si el pensionado no realiza la validación dentro del periodo configurado, el sistema deberá marcar el expediente como vencido.
- **RN-10.** La carga de credencial será obligatoria en el alta del pensionado.

## 5. Casos de Uso

### 5.1 Módulo de Validación de Supervivencia

#### 5.1.1 Inicio de Sesión

**Descripción:** El sistema permite que administradores, operadores y pensionados ingresen al aplicativo mediante credenciales seguras.
**Precondiciones:** El usuario debe estar registrado en la base de datos y tener estatus "activo".
**Postcondiciones:** El usuario accede al menú principal con las funcionalidades limitadas según su rol asignado.

#### 5.1.2 Alta de Usuarios Internos

**Descripción:** Permite al administrador crear nuevas cuentas para personal administrativo (administradores u operadores).
**Precondiciones:** El usuario debe haber iniciado sesión con el rol de Administrador.
**Postcondiciones:** Se crea un nuevo registro en la tabla “usuarios_internos” con estatus activo por defecto.

#### 5.1.3 Configuración de Periodicidad

**Descripción:** Define el intervalo de días en el que los pensionados deben realizar su trámite de supervivencia.
**Precondiciones:** Sesión iniciada como Administrador.
**Postcondiciones:** Se actualiza la configuración global del sistema y se genera una entrada en la bitácora de cambios.

#### 5.1.4 Registro de Pensionado

**Descripción:** Captura de datos personales y administrativos para crear el expediente único de un pensionado.
**Precondiciones:** Sesión iniciada como Administrador u Operador.
**Postcondiciones:** Expediente creado exitosamente y cálculo automático de la primera fecha de validación.

#### 5.1.5 Carga de Credencial

**Descripción:** Carga de un archivo digital (JPG, PNG, PDF) que funge como identificación oficial del pensionado.
**Precondiciones:** Existencia de un expediente de pensionado en proceso de alta o actualización.
**Postcondiciones:** El archivo queda almacenado y vinculado al registro del pensionado.

#### 5.1.6 Consulta de Validación Pendiente

**Descripción:** Permite al pensionado visualizar si tiene trámites de supervivencia próximos a vencer o vencidos.
**Precondiciones:** Sesión iniciada como Pensionado.
**Postcondiciones:** El sistema despliega el estado de validación y la fecha límite de cumplimiento.

#### 5.1.7 Realización de Validación de Supervivencia

**Descripción:** Registro de la confirmación expresa de supervivencia por parte del pensionado a través de un formulario.
**Precondiciones:** El pensionado debe tener una validación en estado "Pendiente" o "Próxima a vencer".
**Postcondiciones:** Se genera un registro en la tabla de validaciones con fecha y hora exacta.

#### 5.1.8 Carga de Evidencia de Validación

**Descripción:** Adjuntar pruebas adicionales (foto reciente o documentos) durante el proceso de validación.
**Precondiciones:** El usuario debe estar en el flujo de "Realización de Validación".
**Postcondiciones:** La evidencia se almacena y queda disponible para la revisión del operador.

#### 5.1.9 Actualización Automática de Siguiente Validación

**Descripción:** Recalcula la fecha de la próxima validación una vez que el sistema registra un evento exitoso.
**Precondiciones:** Registro de validación completado exitosamente.
**Postcondiciones:** El campo “fecha_proxima_validacion” del pensionado se actualiza sumando la periodicidad configurada.

### 5.2 Módulo de Seguimiento y Control

#### 5.2.1 Consulta de Pensionados por Estado

**Descripción:** Filtrado del padrón de pensionados según su situación (vigente, vencido, en revisión, etc.).
**Precondiciones:** Sesión iniciada como Administrador u Operador.
**Postcondiciones:** Visualización de una lista filtrada y ordenada de pensionados.

#### 5.2.2 Consulta de Pensionados con Validación Vencida

**Descripción:** Identificación específica de pensionados que han superado la fecha límite y la tolerancia permitida.
**Precondiciones:** Sesión iniciada como Administrador u Operador.
**Postcondiciones:** Despliegue de alertas y lista de casos críticos para acciones de seguimiento.

#### 5.2.3 Revisión del Historial de Validaciones

**Descripción:** Visualización cronológica de todos los intentos y registros de supervivencia de un pensionado.
**Precondiciones:** Acceso al expediente de un pensionado específico.
**Postcondiciones:** Listado detallado de fechas, resultados y evidencias históricas.

### 5.2.4 Registro de Observaciones

**Descripción:** Adición de notas aclaratorias o comentarios técnicos al historial de un pensionado.
**Precondiciones:** Sesión iniciada como Operador o Administrador.
**Postcondiciones:** Observación guardada con registro de autoría y estampa de tiempo.

### 5.3 Módulo de Reportes

#### 5.3.1 Reporte de Pensionados Vigentes

**Descripción:** Generación de un listado de pensionados que han cumplido con sus obligaciones de supervivencia.
**Precondiciones:** Sesión iniciada con permisos de reporte.
**Postcondiciones:** Documento exportable (PDF/Excel) generado con la información solicitada.

#### 5.3.2 Reporte de Pensionados Vencidos

**Descripción:** Generación de un informe de incumplimiento para fines administrativos o suspensión de pagos.
**Precondiciones:** Existencia de registros en estado "vencido".
**Postcondiciones:** Archivo generado con los datos de contacto y fechas de incumplimiento.

### 5.4 Módulo de Seguridad y Auditoría

#### 5.4.1 Registro de Bitácora de Acciones

**Descripción:** Registro automático de operaciones sensibles realizadas por cualquier usuario en el sistema.
**Precondiciones:** Ejecución de una acción (alta, baja, modificación, login).
**Postcondiciones:** Inserción de un registro inmutable en la tabla de auditoría.

#### 5.4.2 Restricción por Roles

**Descripción:** Validación de privilegios de usuario antes de permitir el acceso a módulos específicos.
**Precondiciones:** Intento de acceso a una URL o funcionalidad protegida.
**Postcondiciones:** Acceso permitido o redirección a mensaje de "Acceso Denegado" según el rol.

## 6. Historial de Cambios