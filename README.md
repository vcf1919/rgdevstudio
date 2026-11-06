# rgdevstudio · propuesta 3 "Producto"

Web estática (HTML + CSS + JS, sin framework, sin build y **sin librerías**).
El móvil en 3D está hecho solo con CSS (capas apiladas para el grosor) y el movimiento con JS propio.

## Estructura

```
index.html        Página única
gracias.html      Destino del formulario si el JS falla
css/styles.css    Estilos (tokens arriba)
js/main.js        Recorrido del móvil, interacciones y formulario
img/og-image.png  Imagen para redes (1200x630)
favicon.svg, netlify.toml, robots.txt, sitemap.xml
```

## Antes de publicar: rellenar

Busca `[` en `index.html`:

| Hueco | Dónde |
|---|---|
| `[tu nombre]` | Sobre mí y schema |
| `[precio]` | Servicios (3) y FAQ (2) |
| `[tu-email]` | Contacto, footer, schema |
| `[tu-usuario]` | Instagram |
| `34000000000` | Botón de WhatsApp |
| `[+34 600 000 000]` | Schema |
| Resultado de Le Petit Fleur | Proyecto 01 |
| `rgdevstudio.netlify.app` | canonical, og, robots, sitemap |

**Pantallas del móvil:** cada proyecto tiene su pantalla en HTML dentro de `.mini-phone` (diseñadas a 278 × 598 px). El móvil 3D las copia de ahí, así que solo se editan en un sitio. Cuando tengas capturas reales, puedes sustituir el contenido de `.screen-scroll` por un `<img>` alto de la web en móvil: se desplazará sola al hacer scroll.

## El recorrido

| Momento | Qué pasa |
|---|---|
| Entrada | El titular gigante sube letra a letra y el móvil cae girando y se posa |
| Hero | Flota, se inclina con el ratón y se puede **arrastrar para girarlo** (con inercia; vuelve de frente) |
| Trabajos (escritorio) | Se coloca a la derecha. En cada proyecto da una vuelta completa; la pantalla cambia cuando está de espaldas y la web de dentro se desplaza con el scroll |
| Servicios (escritorio) | Sale por arriba tras los proyectos y vuelve desde abajo por la columna izquierda (nunca pasa por el titular), tumbado y con un halo de luz. Se queda quieto mientras se lee cada servicio y da la voltereta solo entre tarjetas, cambiando de pantalla: landing, cesta y pago, panel de mantenimiento. El servicio que muestra se resalta |
| Proceso → FAQ | Sale por arriba |
| Contacto | Baja de nuevo con un chat; los mensajes aparecen uno a uno |
| Móvil (teléfono) | Hero con arrastre y salida girando; en Trabajos se ven las pantallas en móviles planos; en Servicios vuelve en una ventana fija arriba con las mismas volteretas mientras las tarjetas pasan por debajo |

`prefers-reduced-motion`: el móvil se queda quieto en el hero y los proyectos se ven en móviles planos.
Sin JS: todo el contenido se ve, con el móvil en el hero.
