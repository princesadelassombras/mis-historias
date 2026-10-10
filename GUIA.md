# Guía para publicar tu sitio (gratis)

Vas a usar dos servicios gratuitos:

- **GitHub Pages**: aloja los archivos del sitio (la "casa" de la página).
- **Firebase, plan Spark**: guarda las historias, los comentarios y las reacciones, y maneja tu inicio de sesión. El plan Spark **no pide tarjeta y no puede cobrarte**: si un día se superan los límites gratuitos, el sitio deja de cargar datos hasta el día siguiente, pero nunca se genera una factura.

Tiempo estimado: entre 30 y 45 minutos la primera vez.

---

## Paso 0 · Probalo antes de configurar nada

Abrí `index.html` con doble clic. Funciona en **modo demo**: los datos se guardan solo en tu navegador. Tocá "Entrar como autora" en la franja rosa y probá crear obras, capítulos, comentarios y ajustes. Cuando configures Firebase, el modo demo desaparece solo.

---

## Paso 1 · Subir el sitio a GitHub

1. Creá una cuenta en https://github.com (si no tenés).
2. Arriba a la derecha: **+ → New repository**.
   - Nombre: por ejemplo `mis-historias`.
   - Marcá **Public**. GitHub Pages gratis necesita que el repositorio sea público. El código queda visible, pero tus borradores no, porque viven en Firebase y las reglas de seguridad los protegen.
   - Tocá **Create repository**.
3. En el repositorio nuevo: **Add file → Upload files**. Arrastrá **todo el contenido** de la carpeta `archivo`: `index.html`, y las carpetas `css`, `js` e `img` (no la carpeta `archivo` en sí). Tocá **Commit changes**.
4. Andá a **Settings → Pages**. En "Branch" elegí `main` y la carpeta `/ (root)`. Tocá **Save**.
5. Después de uno o dos minutos, tu sitio queda en:
   `https://TU-USUARIO.github.io/mis-historias/`

---

## Paso 2 · Crear el proyecto de Firebase

1. Entrá a https://console.firebase.google.com con tu cuenta de Google.
2. **Crear un proyecto**. Ponele un nombre y desactivá Google Analytics (no lo necesitás). El proyecto arranca en el plan **Spark (gratuito)**. **No lo cambies a Blaze.**
3. En la página del proyecto, tocá el ícono **`</>`** (Web) para agregar una app web. Ponele un nombre y **no** marques Firebase Hosting.
4. Te muestra un bloque de código con `const firebaseConfig = { ... }`. Copiá solo lo que está entre las llaves.
5. En GitHub, abrí `js/config.js`, tocá el lápiz para editar y reemplazá `firebase: null,` por algo así:

```js
firebase: {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
},
```

   Guardá con **Commit changes**. Es normal que estos datos sean públicos: lo que protege tu contenido son las reglas del Paso 4, no estas claves.

---

## Paso 3 · Activar los inicios de sesión

1. En Firebase: **Compilación → Authentication → Comenzar**.
2. En "Método de acceso" activá:
   - **Google** (para vos y para lectores que quieran comentar con su cuenta).
   - **Anónimo** (para que los lectores comenten solo con un apodo, sin crear cuenta).
3. Pestaña **Configuración → Dominios autorizados → Agregar dominio**: escribí `TU-USUARIO.github.io`.

---

## Paso 4 · Crear la base de datos y las reglas

1. **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: `southamerica-east1 (São Paulo)`, que es la más cercana a Argentina.
3. Elegí **modo de producción**.
4. Andá a la pestaña **Reglas**, borrá todo lo que haya y pegá el contenido completo de `firestore.rules`. Tocá **Publicar**. Todavía dice `TU_UID_DE_AUTORA`, eso lo completás en el paso siguiente.

---

## Paso 5 · Convertirte en la autora (el único paso "raro")

1. Entrá a tu sitio publicado y, abajo de todo, tocá **Acceso autora → Entrar con Google**.
2. El sitio te dice que tu cuenta no figura como autora y te muestra tu **UID** (un código largo). Tocá **Copiar**.
3. Pegalo en dos lugares:
   - En GitHub, en `js/config.js`: `adminUid: "TU-UID-ACÁ",`
   - En Firebase, en **Firestore → Reglas**: reemplazá `TU_UID_DE_AUTORA` por tu UID (dejá las comillas simples) y tocá **Publicar**.
4. Esperá un minuto y recargá el sitio. Ya ves **Panel** en el menú.
5. Entrá a **Panel → Ajustes del sitio**, revisá el nombre, tu presentación, secciones y redes, y tocá **Guardar ajustes**.

Listo: solo vos podés editar. Cualquier otra persona puede leer, comentar y reaccionar, pero no puede editar ni borrar nada, ni siquiera sus propios comentarios.

---

## Paso 6 · Imágenes

El almacenamiento de archivos de Firebase dejó de ser gratuito para proyectos nuevos en 2026. Por eso las imágenes van en tu repositorio de GitHub:

1. En GitHub, entrá a la carpeta `img` → **Add file → Upload files** y subí tus imágenes.
2. En el editor del capítulo, botón 🖼, escribí la dirección así: `img/nombre-de-la-imagen.jpg`.

También podés usar links de imágenes alojadas en otro lado (Imgur, Cloudinary, Postimages, etc.).

Consejo: achicá las fotos antes de subirlas, a menos de 500 KB si se puede. Cargan más rápido y no te comés el espacio gratuito de GitHub (1 GB por repositorio).

---

## Cómo se usa

### Obras y capítulos
- **Panel → + Nueva obra**: título y resumen en español e inglés (podés dejar un idioma vacío), sección, subsección, clasificación, advertencias, etiquetas estilo AO3 y publicación.
- **Publicación**: *Borrador* (solo vos lo ves), *Publicar ahora* o *Programar* para una fecha y hora. Funciona igual para la obra y para cada capítulo.
- Dentro de cada obra: **+ Nuevo capítulo**. Con ↑ ↓ cambiás el orden.

### El editor
- **Visual**: para escribir con formato (negrita, títulos, citas, listas, alineación, links, imágenes, color).
- **HTML**: pegás tu código tal cual, con `<style>` y `<script>` incluidos.
- **CSS del capítulo** y **CSS de la obra** (este último se aplica a todos los capítulos). Empezá tus reglas con `.story-body` para que afecten solo al texto. Por ejemplo: `.story-body .chat { ... }`.
- **JavaScript del capítulo**: la variable `story` es el contenedor del texto. Ejemplo: `story.querySelectorAll('p')`.
- Cada párrafo recibe un atributo `data-pid="..."` cuando guardás. **No lo borres** si editás el HTML: es lo que ata cada comentario a su párrafo. Si lo borrás, ese párrafo pierde sus comentarios.
- Si un capítulo tiene código complejo, editalo siempre en modo HTML. El modo visual puede simplificar estructuras que no entiende.

### Notas de autora y playlist
- Notas al principio y al final de cada capítulo, en los dos idiomas. Aceptan HTML.
- Playlist: pegá un link de YouTube (video o lista) o de Spotify (playlist, álbum o canción) y aparece el reproductor.

### Para tus lectores
- Buscador por título, resumen, etiquetas y, si lo tildan, dentro del texto.
- Filtros por clasificación, terminada o en curso, cantidad de palabras, fecha de publicación, e incluir o excluir etiquetas.
- Botón **Aa**: tema claro, oscuro o de baja visión, y tamaño de letra. Tus estilos, colores y scripts se mantienen.
- Comentarios por capítulo (con respuestas) y por párrafo (el globito al final de cada párrafo).
- Reacciones con los emojis que elijas en Ajustes.
- **Seguir** una obra: les aparece un aviso en el menú cuando publicás capítulos nuevos.
- **PDF con marca de agua**: incluye el nombre de quien descarga (si comentó con nombre), la fecha y tu aviso de derechos.
- Aviso previo en obras Maduras, Explícitas o con advertencias.

### Moderación y estadísticas
- **Panel → Comentarios**: los últimos comentarios de todo el sitio. Podés borrarlos o bloquear a quien los escribió.
- **Panel → Estadísticas**: lecturas, comentarios, reacciones y palabras por obra.

---

## Cosas que conviene saber

- **La protección contra copia y el PDF con marca de agua disuaden, pero no son infalibles.** Nadie puede impedir del todo una captura de pantalla o que alguien mire el código de la página. Lo que sí logran es que copiar sea incómodo y que cualquier copia del PDF lleve tu firma.
- **El bloqueo de lectores anónimos** se aplica a esa sesión anónima. Si alguien borra los datos de su navegador, puede volver con otra. Si eso se vuelve un problema, se puede cambiar para que solo se comente con cuenta de Google.
- **El aviso de "capítulos nuevos"** se guarda en el navegador de cada lector, no se manda por mail. Mandar mails requiere un servicio aparte.
- **Límites gratuitos de Firebase (por día)**: 50.000 lecturas y 20.000 escrituras. Para un sitio personal es muchísimo. Cada capítulo abierto usa pocas lecturas.
- **Si en la consola del navegador aparece un error que pide crear un "índice"**, el mensaje trae un link: abrilo, tocá "Crear" y esperá unos minutos. Es gratis.
- **Dominio propio (opcional)**: GitHub Pages te deja usar uno, por ejemplo `tunombre.com.ar`. El hosting sigue siendo gratis, pero el dominio se paga aparte a quien lo registra (en Argentina, NIC.ar).
- **Para actualizar el sitio** (cambiar código), editás los archivos en GitHub. Tus historias, comentarios y ajustes viven en Firebase y no se tocan.
