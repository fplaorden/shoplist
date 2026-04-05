## 🛒 ShopList — Lista de la compra compartida

App fullstack para gestión de listas de la compra colaborativas en tiempo real.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React Native + Expo (web, iOS, Android) |
| Backend | Node.js + Express + Socket.io |
| Base de datos | PostgreSQL 16 |
| Contenedores | Docker + docker-compose |
| Servidor web | Nginx (producción) |

## Funcionalidades

- ✅ **Registro con alias** — cada usuario elige un @alias único al registrarse
- ✅ **Múltiples listas** — crea tantas listas como necesites
- ✅ **Items con autoría** — cada producto muestra el tag `@alias` de quien lo añadió
- ✅ **Invitaciones** — genera un enlace de invitación y compártelo
- ✅ **Tiempo real** — los cambios se sincronizan al instante via WebSockets
- ✅ **Categorías** — asigna categoría a cada producto
- ✅ **Marcar/desmarcar** — tilda los productos al meterlos al carro
- ✅ **Limpiar marcados** — elimina de un click todos los tachados

---

## 🚀 Inicio rápido con Docker

### 1. Clona y configura el entorno

```bash
git clone <tu-repo>
cd shoplist

# Copia el archivo de variables de entorno
cp .env.example .env

# Edita los valores (especialmente JWT_SECRET en producción)
nano .env
```

### 2. Levanta los servicios

```bash
docker-compose up --build
```

La primera vez tardará unos minutos en descargar imágenes y compilar.

### 3. Accede a la app

| Servicio | URL |
|----------|-----|
| Frontend (web) | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/api/health |

---

## 📱 Desarrollo local (sin Docker)

### Backend

```bash
cd backend
npm install

# Requiere PostgreSQL corriendo localmente
export DATABASE_URL=postgresql://shoplist:shoplist_secret@localhost:5432/shoplist
export JWT_SECRET=dev_secret

# Crea el schema (solo primera vez)
psql $DATABASE_URL -f src/models/schema.sql

npm start          # producción
npm run dev        # desarrollo con hot-reload
```

### Frontend

```bash
cd frontend
npm install

export REACT_APP_API_URL=http://localhost:4000

npx expo start --web    # navegador
npx expo start          # con QR para móvil (requiere Expo Go app)
```

---

## 📁 Estructura del proyecto

```
shoplist/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js              # Entrada, Express + Socket.io
│       ├── db.js                 # Pool de PostgreSQL
│       ├── middleware/
│       │   └── auth.js           # JWT middleware
│       ├── models/
│       │   └── schema.sql        # Esquema de base de datos
│       └── routes/
│           ├── auth.js           # Registro, login, /me
│           ├── lists.js          # CRUD listas
│           ├── items.js          # CRUD items + toggle
│           └── invitations.js    # Crear/aceptar invitaciones
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── App.js                    # Navegación principal
    ├── index.js                  # Entry point Expo
    └── src/
        ├── context/
        │   ├── AuthContext.js    # Estado de autenticación
        │   └── SocketContext.js  # WebSocket global
        ├── screens/
        │   ├── AuthScreen.js         # Login / Registro
        │   ├── ListsScreen.js        # Listado de listas
        │   ├── ShoppingListScreen.js # Items de una lista
        │   └── AcceptInviteScreen.js # Aceptar invitación
        └── services/
            └── api.js            # Cliente HTTP para el backend
```

---

## 🔌 API endpoints

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro (email, alias, password) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuario actual |

### Listas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/lists` | Mis listas |
| POST | `/api/lists` | Crear lista |
| DELETE | `/api/lists/:id` | Eliminar lista (solo propietario) |
| GET | `/api/lists/:id/members` | Miembros de una lista |

### Items
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/items/list/:listId` | Items de una lista |
| POST | `/api/items` | Añadir item |
| PATCH | `/api/items/:id/toggle` | Marcar/desmarcar |
| DELETE | `/api/items/:id` | Eliminar item |
| DELETE | `/api/items/list/:listId/checked` | Limpiar marcados |

### Invitaciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/invitations/create` | Generar enlace de invitación |
| GET | `/api/invitations/info/:token` | Info de una invitación |
| POST | `/api/invitations/accept/:token` | Aceptar invitación |

---

## 🔔 Eventos WebSocket (Socket.io)

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `join_list` | cliente → servidor | Suscribirse a una lista |
| `leave_list` | cliente → servidor | Desuscribirse |
| `item_added` | servidor → cliente | Nuevo item añadido |
| `item_updated` | servidor → cliente | Item actualizado |
| `item_deleted` | servidor → cliente | Item eliminado |
| `checked_cleared` | servidor → cliente | Items marcados eliminados |
| `member_joined` | servidor → cliente | Nuevo miembro en la lista |
| `list_deleted` | servidor → cliente | Lista eliminada |

---

## 🔒 Seguridad

- Contraseñas hasheadas con **bcrypt** (factor 12)
- Autenticación via **JWT** (30 días)
- Los sockets también requieren JWT válido
- Solo el propietario puede invitar y eliminar listas
- Solo el autor de un item (o el propietario de la lista) puede eliminarlo
- Las invitaciones expiran en **7 días**

---

## 🐳 Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario PostgreSQL | `shoplist` |
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL | `shoplist_secret` |
| `POSTGRES_DB` | Nombre de base de datos | `shoplist` |
| `JWT_SECRET` | Secreto para firmar tokens | ⚠️ Cambiar en producción |
| `REACT_APP_API_URL` | URL del backend desde el frontend | `http://localhost:4000` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:3000` |

---

## 📲 Compilar para iOS / Android

Con Expo, puedes generar las apps nativas:

```bash
cd frontend

# Instala EAS CLI
npm install -g eas-cli
eas login

# Configura el proyecto
eas build:configure

# Compila para Android (.apk / .aab)
eas build --platform android

# Compila para iOS (.ipa)
eas build --platform ios
```

> Para iOS necesitas una cuenta de Apple Developer.

---

## 🛠 Comandos útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Reiniciar solo el backend
docker-compose restart backend

# Conectarse a la base de datos
docker-compose exec postgres psql -U shoplist -d shoplist

# Eliminar todo (incluidos datos)
docker-compose down -v
```
