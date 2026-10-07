# Contrato de la API

El frontend llama a todo esto desde `src/api.js`. Configura la URL base en `.env`:

```
VITE_API_URL=http://localhost:3000
```

Si `VITE_API_URL` no está definido, la app usa un mock en `localStorage` con este mismo contrato.

## Convenciones

- JSON en el cuerpo de las peticiones y de las respuestas.
- Las rutas protegidas reciben `Authorization: Bearer <token>`.
- Si el token no es válido o ya expiró, responde `401`. El frontend cierra la sesión.
- En los errores, responde `{ "message": "texto para el usuario" }`. El frontend muestra ese `message` tal cual.
- Habilita CORS para el origen del frontend (`http://localhost:5173` en desarrollo).

## Auth

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | `201 { token, user }`. Si el email ya existe: `409` |
| POST | `/auth/login` | `{ email, password }` | `200 { token, user }`. Si las credenciales no son válidas: `401` |
| POST | `/auth/forgot-password` | `{ email }` | `204` (también si el email no existe, para no revelar qué cuentas hay) |
| POST | `/auth/reset-password` | `{ token, password }` | `204`. Si el token no es válido o expiró: `400` |
| GET | `/me` 🔒 | | `{ id, name, email }` |

`user` = `{ id, name, email }`. El email llega en minúsculas y la contraseña tiene al menos 8 caracteres. Valídalo igual en el servidor.

**Recuperar la contraseña:** `forgot-password` genera un token de un solo uso con caducidad (por ejemplo, 1 h) y manda por correo este enlace:

```
<URL del frontend>/?reset=<token>
```

El frontend detecta `?reset=` y muestra el formulario de nueva contraseña, que llama a `reset-password`.

## Plan de entrenamiento

Cada usuario tiene su propio plan, guardado como texto. El frontend lo interpreta (ver `parsePlan` en `src/plan.js`), así que el backend solo tiene que guardar el texto.

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/plan` 🔒 | | `{ text }`. Si el usuario no ha guardado ninguno: `{ "text": null }` y el frontend usa el plan de ejemplo |
| PUT | `/plan` 🔒 | `{ text }` | `200 { text }` |

Basta con una columna `TEXT` en la tabla de usuarios (o una tabla `plans` con `user_id` único). Conviene limitar el tamaño, por ejemplo a 50 KB.

## Series (equivalen a la base de datos "Registro de Series" de Notion)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/sets` 🔒 | | `Set[]` del usuario autenticado |
| POST | `/sets` 🔒 | `{ date, day, exercise, serie, reps, weight, feel, notes }` | `201 Set` |
| DELETE | `/sets/:id` 🔒 | | `204`. Si la serie no es del usuario: `404` |

```ts
Set = {
  id: string        // UUID (el mock lo usa para enrutar el DELETE)
  date: string      // "YYYY-MM-DD", fecha del entrenamiento     (Notion: Fecha)
  day: 1|2|3|4|5    // día del plan                            (Día)
  exercise: string  // nombre del ejercicio                    (Ejercicio)
  serie: number     // nº de serie dentro de ese ejercicio y día  (Serie)
  reps: number      //                                         (Repeticiones)
  weight: number    // kg, admite decimales                    (Peso (kg))
  volume: number    // weight * reps, lo calcula el servidor   (Volumen (kg))
  feel: "Fácil" | "Moderado" | "Difícil" | "Al fallo"          (Sensación)
  notes: string     // puede venir vacío                       (Notas)
  createdAt: string // ISO 8601                                (Fecha de creación)
}
```

Filtra siempre por el usuario del token: cada usuario ve solo sus propias series.
