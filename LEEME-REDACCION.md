# Guía para la redacción de Ferroweb

Para quien carga novedades y datos en **Ferro en números** sin tocar código. Alcanza con saber usar Google Sheets y copiar y pegar.

## Qué se actualiza solo y qué cargás vos

| Se actualiza solo (no hacés nada) | Lo cargás vos en la planilla |
|---|---|
| Resultados, tabla de posiciones, goles, minutos, tarjetas, estadísticas de jugadores y árbitros, escenarios del primer puesto, «la última vez que…», laboratorio. Pasa cada 2 horas, apenas FerroWeb publica la síntesis del partido. | **Novedades** para la portada, el **árbitro** y el **horario** de cada fecha, y **pedidos para la IA** (qué querés que se destaque en la próxima previa). |

## Cargar algo en la planilla

1. Abrí la planilla de la redacción (el botón está en el sitio, en *Herramientas → Asistente de redacción*).
2. Agregá **una fila nueva al final**.
3. Completá las columnas: **Fecha** (día y hora de hoy), **Tipo**, **Título**, **Texto** y, si querés, **Link**.

| Tipo | En *Título* | En *Texto* | Cuándo se ve |
|---|---|---|---|
| **Novedad** | El titular, corto | El detalle, de una a tres frases | Enseguida en la portada y en «De la redacción», durante 10 días |
| **Árbitro** | El número de la fecha (ej. `34`) | Nombre y apellido | En la próxima actualización (hasta 2 horas) |
| **Horario** | El número de la fecha (ej. `34`) | Día y hora, ej. `17/10 17:30` | En la próxima actualización (hasta 2 horas) |
| **Pedido para la IA** | El tema | Qué querés que se escriba o se destaque | La próxima vez que se prepare la previa |

**Si te equivocás:** corregí la fila, o escribí otra del mismo tipo y fecha (vale la última).
**Para sacar una novedad:** escribí `No` en la columna **Activo**.

## Escribir con ayuda de la IA

En el sitio, *Herramientas → Asistente de redacción*:

1. Elegí qué querés escribir (un tuit sobre un jugador, la previa, el resumen del partido, un hilo, un guion para el programa o una novedad para la web).
2. Tocá **Copiar pedido**.
3. Pegalo en Claude (claude.ai) y enviá.
4. Leé lo que escribió, corregí lo que haga falta y publicalo. Para una novedad, copiá el título y el texto en la planilla.

El pedido ya trae los números del sitio, así que la IA no tiene que inventar nada. Aun así, **revisá siempre antes de publicar**.

Cada tarjeta del sitio también tiene un botón **⤴** para copiar un texto listo para tuitear o bajar una imagen con el escudo.

---

## Para quien administra el sitio: armar la planilla (una sola vez, 10 minutos)

1. En Google Sheets creá una hoja nueva: **Ferro en números – Redacción**.
2. En la primera fila escribí estas columnas, en este orden: `Fecha | Tipo | Título | Texto | Link | Activo`.
3. *(Opcional)* En la columna **Tipo**: Datos → Validación de datos → «Menú desplegable» con: `Novedad, Árbitro, Horario, Pedido para la IA`.
4. **Compartir** → «Restringido» → agregá los mails de la redacción como **Editor**. (No hace falta ningún formulario público: así nadie de afuera puede escribir en el sitio.)
5. **Archivo → Compartir → Publicar en la Web** → elegí esta hoja y el formato **Valores separados por comas (.csv)** → Publicar. Copiá el link.
6. En `public/data/redaccion-config.json` completá:
   ```json
   {
     "formulario": "",
     "planilla": "https://docs.google.com/spreadsheets/d/…/edit",
     "csv": "https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"
   }
   ```
   `planilla` es el link para editar; `csv` es el que publicaste en el paso 5.
7. Subí el cambio. Desde ese momento todo lo de arriba funciona.

> **Ojo con lo que se escribe:** el link publicado (`csv`) es público. No cargues datos privados en esa hoja.
