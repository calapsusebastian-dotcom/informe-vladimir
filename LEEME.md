# Tablero de cumplimiento con Firebase (sin usuarios)

La página abre directo, sin pedir correo ni contraseña, y guarda todo en Firebase.
Por dentro entra sola como **usuario anónimo**, para que la base de datos no quede abierta a cualquiera en internet.

> Importante: cualquier persona que tenga la dirección de la página puede ver y editar el tablero. Compártela solo con quien corresponda.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página |
| `styles.css` | El diseño |
| `app.js` | La lógica del tablero |
| `datos.js` | Los datos iniciales (tu Excel) |
| `nube.js` | Guardado en Firebase |
| `firebase-config.js` | Datos de tu proyecto (ya está lleno con **datos-vladimir**) |
| `firestore.rules` | Reglas de seguridad de la base de datos |
| `firebase.json` | Configuración para publicar en Firebase Hosting |

## Paso 1. Activar el acceso anónimo
1. https://console.firebase.google.com → proyecto **datos-vladimir**.
2. Menú **Compilación → Authentication → Comenzar**.
3. Pestaña **Método de acceso** → **Anónimo** → **Habilitar** → Guardar.

## Paso 2. Crear la base de datos
1. Menú **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: `southamerica-east1 (São Paulo)` o `us-east1`. **No se puede cambiar después.**
3. Elige **modo de producción**.
4. Pestaña **Reglas** → borra lo que hay, pega el contenido de `firestore.rules` → **Publicar**.

## Paso 3. Publicar la página (Firebase Hosting)
Necesitas Node.js (https://nodejs.org). En una terminal, dentro de esta carpeta:

```
npm install -g firebase-tools
firebase login
firebase use --add        (elige datos-vladimir y ponle el alias "default")
firebase deploy
```

Te queda en `https://datos-vladimir.web.app`.
Cada vez que cambies algún archivo, vuelve a correr `firebase deploy`.

## Cómo funciona
- La **primera vez** que se abre la página, sube a la nube los datos que trae (tus 9 secciones).
- Cada cambio se guarda solo. Arriba a la derecha se ve: *Guardado en la nube*, *Guardando…* o *Sin conexión*.
- Si alguien más tiene la página abierta, ve los cambios al momento.
- Sin internet sigue funcionando y sube los cambios al reconectar.
- Si arriba dice **"Activa el acceso Anónimo…"**, falta el Paso 1. Si dice **"Sin permiso…"**, falta publicar las reglas del Paso 2.

## Costo
El plan gratuito **Spark** de Firebase alcanza de sobra para este uso.
