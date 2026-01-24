# Chat & AI features

New endpoints and behavior (added on branch feature/chat-ai-and-vendor-me):

- POST /api/ai (protected) — proxies to OpenAI (OPENAI_API_KEY required)
- GET /api/chat/history/me (protected) — returns persisted messages for user
- GET /api/chat/threads/me (protected) — returns conversation threads for the user
- GET /api/vendor/list (public) — list of vendors for starting chats
- GET /api/vendor/me (protected) — returns vendor document for the authenticated user

Added models:
- src/models/messageModel.js

Socket.IO:
- Server now creates an http server and runs Socket.IO. Clients should connect to FRONTEND_ORIGIN and emit "join" with their userId to join their private room.
- Event "chat:send": payload { toVendor, message } — server persists and emits "chat:message" to recipient.
- If vendor.autoResponseEnabled is true, server sends auto response message automatically.

Security:
- Keep OPENAI_API_KEY and JWT_SECRET in server env only.
- Implement token validation on sockets for production (validate token in io.use).
- Rate-limit /api/ai and validate prompts to prevent abuse.

Run:
1. Copy backend.env.example to .env and set MONGODB_URI, OPENAI_API_KEY and JWT_SECRET
2. Install: `npm install socket.io openai jsonwebtoken`
3. Start: `node index.js` (or via your npm script)
