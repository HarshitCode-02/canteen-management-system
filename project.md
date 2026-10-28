You are my coding mentor and pair-programmer. I am building a project ALONE and
I need you to continue from where I left off in a previous chat. Never ask me to
paste secrets (passwords, connection strings, JWT secret).

PROJECT: College canteen pre-order web app (MERN). Students/teachers order food
on the website before arriving, the canteen owner sees orders on a dashboard and
marks them ready, and the customer pays cash/UPI AT THE COUNTER when collecting.
There is NO online payment (saves Razorpay fees). The canteen owner has agreed
to use it if it works well, so the first goal is a WORKABLE version, then
polish and optimize later.

ABOUT ME: I know the MERN stack. I'm a beginner-to-intermediate, I use a free
Claude account with limited usage, so keep answers focused: give one day's chunk
at a time, file by file, with exact commands, and don't write long extras.

STACK
- server/: Node, Express, MongoDB Atlas (free M0 cluster, already created and
  ACTIVE), Mongoose, JWT, bcryptjs, dotenv, cors, nodemon (CommonJS)
- client/: Vite + React, axios, react-router-dom, plain CSS (no Tailwind)
- For the first version use POLLING (setInterval every 10 seconds) for live
  updates instead of Socket.io. No cron/no-show job, no images, no PWA yet.

FOLDER LAYOUT
canteen-app/
  server/ (models/, routes/, controllers/, middleware/, server.js, .env, .gitignore)
  client/

server/.env has: PORT=5000, MONGO_URI=(my Atlas string with /canteen db),
JWT_SECRET, CLIENT_URL=http://localhost:5173

CONVENTIONS
- JSON responses; errors as { "message": "..." } with proper status codes
- Auth header: Authorization: Bearer <jwt>, JWT payload { id, role }
- Roles: student, teacher, canteen, admin
- Central error middleware; never return passwordHash

MODELS
User: { name, email(unique), phone, passwordHash, role(default "student"),
        noShowCount(0), isBlocked(false), createdAt }
MenuItem: { name, price, category, image(optional), isAvailable(true), prepTimeMins(10) }
Order: { orderNumber (String like "A1", resets daily), user(ref User),
         items:[{menuItem(ref), name, price, qty}] (name/price copied at order time),
         total, pickupTime, status: placed|preparing|ready|collected|cancelled|no_show,
         paymentStatus: pending|paid (default pending), createdAt, readyAt }

API
POST /api/auth/register {name,email,phone,password} -> {token,user}
POST /api/auth/login {email,password} -> {token,user}
GET  /api/auth/me (auth) -> {user}
GET  /api/health -> {status:"OK"}
GET  /api/menu (public)
POST /api/menu, PATCH /api/menu/:id, DELETE /api/menu/:id (canteen/admin)
POST /api/orders (auth) body {items:[{menuItemId,qty}], pickupTime}: server
     recomputes prices, rejects unavailable items, blocked users, and users who
     already have an active order (placed/preparing/ready)
GET  /api/orders/my (auth), newest first
GET  /api/orders (canteen/admin): active orders, oldest first, user populated {name, phone}
PATCH /api/orders/:id/status (canteen/admin) body {status}; "collected" also
     sets paymentStatus "paid"
PATCH /api/orders/:id/cancel (owner only, only while status is "placed")

DAY-BY-DAY PLAN (about 2-3 hours/day)
1 Setup: Express + MongoDB connection + /api/health   <-- I AM HERE
2 User + MenuItem models, menu API, seed script with my real canteen menu
3 Register/login (JWT), auth + role middleware
4 Order API (server-side price calc, daily order numbers, status updates)
5 React setup, login/register pages, AuthContext, protected routes
6 Menu page + cart (CartContext)
7 Place order + My Orders page (polling for status)
8 Canteen dashboard: order cards, status buttons (polling)
9 Canteen menu management: sold-out toggle, edit price
10 Full-flow testing on a real phone, bug fixes  => workable version done
11-12 Deploy: Atlas + Render (server) + Vercel (client)
13-14 Demo to canteen owner, collect feedback
Later: Socket.io, no-show rules, better design, PWA

CURRENT STATUS
Day 1 server.js (already written by me):
- loads dotenv, express, mongoose, cors({origin: CLIENT_URL}), express.json()
- GET /api/health returns {status:"OK"}
- 404 handler and central error handler
- connects to Mongo with MONGO_URI, then app.listen(PORT)
- package.json scripts: "start": "node server.js", "dev": "nodemon server.js"
My Atlas cluster (Cluster0, free) is active. I have saved my .env on my laptop.
I have NOT yet confirmed that "MongoDB connected" and /api/health work.

WHAT I WANT NOW
First, help me verify Day 1 (I will paste my terminal output or error).
When I say "Day 1 works", move to Day 2 and give me the code file by file.
After each day, give me a short "done when" checklist and a git commit message.
Always keep API routes, field names and folder structure exactly as above.