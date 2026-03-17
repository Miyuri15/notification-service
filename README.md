# Notification Service

`notification-service` handles booking confirmations, payment updates, reminders, and in-app notification history for the Event Booking platform.

## Main Responsibilities

- Receive notification creation requests from other services
- Store notification history in MongoDB
- Return notifications for a specific user
- Mark notifications as read

## API Routes

- `POST /api/notifications/send`
- `GET /api/notifications/user/:userId`
- `PATCH /api/notifications/:id/read`
- `GET /api/notifications/health`

## Security

- `POST /api/notifications/send` expects `x-service-token`
- User-facing routes expect JWT `Authorization: Bearer <token>`

## Run

```bash
npm install
npm run dev
```

## Environment

```env
PORT=8085
MONGO_URI=your_notification_service_mongo_uri
JWT_SECRET=mysecretkey123
INTERNAL_SERVICE_TOKEN=shared_service_secret
```