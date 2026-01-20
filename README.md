## Apex-PE

Apex-PE is a multi-module payment platform consisting of a user mobile app (Android/iOS), an admin dashboard, and backend services. The platform supports wallet functionality including recharge, bill payments, and gas booking.

## 🧩 Project Structure

This is a **Turborepo** project with multiple apps:

- `server` → Backend API (Node.js / Express)
- `admin` → Admin Dashboard (React / Vite)
- `mobile_app` → Mobile App (React Native / Expo)

## 🚀 Prerequisites

Apex-PE runs on an in-house PostgreSQL database using Docker.

You must have:

- **Docker**
- **Node.js (v18+)**
- **npm**

## 🐳 Step 1 — Start PostgreSQL (Docker)

```bash
docker pull postgres
docker run --name apexpe-db -e POSTGRES_USER=mlm_user -e POSTGRES_PASSWORD=mlm_password -e POSTGRES_DB=mlm_db -p 5432:5432 -d postgres
```

## 🔧 Step 2 — Setup Environment Variables

### ✅ Server (Backend)

Create a `.env` file inside the `server/` folder:

```
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://mlm_user:mlm_password@localhost:5432/mlm_db?schema=public"
JWT_SECRET="your_jwt_secret_key"
```

### ✅ Admin App

Create a `.env` file inside the `admin/` folder:

```
VITE_USER_APP_URL='http://192.168.31.185:5173'
VITE_BASE_URL="http://192.168.31.185:3000"
```

> Replace `192.168.31.185` with your local IP or use `localhost`.

### ✅ Mobile App

Create a `.env` file inside the `mobile_app/` folder:

```
BACKEND_URL="http://192.168.31.185:3000"
```

> Replace `192.168.31.185` with your local IP or use `localhost`.

## ⚙️ Step 3 — Install Dependencies

Run from the root of the project:

```bash
npm install
```

## 🏁 Step 4 — Run the Project

```bash
npm run dev
```

## 🧠 Notes

* Ensure the PostgreSQL database is running before starting the project.
* Update the IP addresses in `.env` files if needed.

## 📌 Support

If you face any issues while setting up, feel free to open an issue in this repo.
