const Notification = require("../models/notification.model");

const SUPPORTED_EVENT_TYPES = {
  BOOKING_PENDING: {
    title: "Booking created",
    buildMessage: (metadata) =>
      `Your booking is pending until the payment. Please proceed to pay${formatEventSuffix(metadata.eventTitle)}.`,
  },
  BOOKING_CONFIRMED: {
    title: "Booking confirmed",
    buildMessage: (metadata) =>
      `Your booking${formatEntitySuffix(metadata.bookingId, "booking")} has been confirmed${formatEventSuffix(metadata.eventTitle)}.`,
  },
  BOOKING_UPDATED: {
    title: "Booking updated",
    buildMessage: (metadata) =>
      `Your booking${formatEntitySuffix(metadata.bookingId, "booking")} has been updated${formatEventSuffix(metadata.eventTitle)}${formatSeatSuffix(metadata.numberOfTickets)}${formatBookingStateSuffix(metadata)}.`,
  },
  BOOKING_CANCELLED: {
    title: "Booking cancelled",
    buildMessage: (metadata) =>
      `Your booking${formatEntitySuffix(metadata.bookingId, "booking")} has been cancelled${formatEventSuffix(metadata.eventTitle)}${formatSeatSuffix(metadata.numberOfTickets)}.`,
  },
  BOOKING_DELETED: {
    title: "Booking deleted",
    buildMessage: (metadata) =>
      `Your booking${formatEntitySuffix(metadata.bookingId, "booking")} has been deleted${formatEventSuffix(metadata.eventTitle)}.`,
  },
  EVENT_CREATED: {
    title: "Event created",
    buildMessage: (metadata) =>
      `The event${formatNamedSuffix(metadata.eventTitle, "event")} was created successfully.`,
  },
  EVENT_UPDATED: {
    title: "Event updated",
    buildMessage: (metadata) =>
      `The event${formatNamedSuffix(metadata.eventTitle, "event")} was updated successfully.`,
  },
  EVENT_REMOVED: {
    title: "Event removed",
    buildMessage: (metadata) =>
      `The event${formatNamedSuffix(metadata.eventTitle, "event")} was removed.`,
  },
  EVENT_DELETED: {
    title: "Event deleted",
    buildMessage: (metadata) =>
      `The event${formatNamedSuffix(metadata.eventTitle, "event")} was deleted.`,
  },
  EVENT_SOLD_OUT: {
    title: "Event sold out",
    buildMessage: (metadata) =>
      `All seats are now booked for${formatEventSuffix(metadata.eventTitle)}.`,
  },
  PAYMENT_RECEIVED: {
    title: "Payment received",
    buildMessage: (metadata) =>
      `Payment${formatEntitySuffix(metadata.paymentId, "payment")} was received successfully${formatAmountSuffix(metadata)}.`,
  },
  PAYMENT_CHECKOUT_CREATED: {
    title: "Payment started",
    buildMessage: (metadata) =>
      `Your checkout session${formatEntitySuffix(metadata.paymentId, "payment")} has been created${formatAmountSuffix(metadata)}${formatEventSuffix(metadata.eventTitle)}.`,
  },
  PAYMENT_CANCELLED: {
    title: "Payment cancelled",
    buildMessage: (metadata) =>
      `Payment${formatEntitySuffix(metadata.paymentId, "payment")} was cancelled${formatAmountSuffix(metadata)}.`,
  },
  PAYMENT_REFUNDED: {
    title: "Payment refunded",
    buildMessage: (metadata) =>
      `Payment${formatEntitySuffix(metadata.paymentId, "payment")} was refunded${formatAmountSuffix(metadata)}${formatEventSuffix(metadata.eventTitle)}.`,
  },
};

function formatEntitySuffix(value, label) {
  return value ? ` (${label}: ${value})` : "";
}

function formatEventSuffix(eventTitle) {
  return eventTitle ? ` for ${eventTitle}` : "";
}

function formatNamedSuffix(name, fallbackLabel) {
  return name ? ` \"${name}\"` : ` (${fallbackLabel})`;
}

function formatSeatSuffix(numberOfTickets) {
  return numberOfTickets ? ` for ${numberOfTickets} seat(s)` : "";
}

function formatBookingStateSuffix(metadata) {
  const parts = [];

  if (metadata.bookingStatus) {
    parts.push(`booking status: ${metadata.bookingStatus}`);
  }

  if (metadata.paymentStatus) {
    parts.push(`payment status: ${metadata.paymentStatus}`);
  }

  return parts.length ? ` (${parts.join(', ')})` : "";
}

function formatAmountSuffix(metadata) {
  if (metadata.amount == null) {
    return "";
  }

  return metadata.currency
    ? ` for ${metadata.currency} ${metadata.amount}`
    : ` for ${metadata.amount}`;
}

function ensureArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function dedupeStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

async function callUserService(path, options = {}) {
  if (!process.env.API_GATEWAY_URL) {
    throw new Error("API_GATEWAY_URL is not configured");
  }

  const serviceToken =
    process.env.INTERNAL_SERVICE_TOKEN || "shared_service_secret";
  const response = await fetch(`${process.env.API_GATEWAY_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-service-token": serviceToken,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Failed to resolve notification recipients");
  }

  return data;
}

async function resolveRecipients(recipients = {}, fallbackUserId) {
  const directUserIds = dedupeStrings([
    ...ensureArray(recipients.userId),
    ...ensureArray(recipients.userIds),
    ...ensureArray(fallbackUserId),
  ]);
  const roles = dedupeStrings(ensureArray(recipients.roles));

  if (!directUserIds.length && !roles.length) {
    throw new Error("At least one notification recipient must be provided");
  }

  const data = await callUserService("/api/users/internal/recipients/resolve", {
    method: "POST",
    body: {
      userIds: directUserIds,
      roles,
    },
  });

  return Array.isArray(data?.recipients) ? data.recipients : [];
}

function buildEventContent(eventType, metadata, overrides = {}) {
  const template = SUPPORTED_EVENT_TYPES[eventType];

  if (!template) {
    throw new Error(`Unsupported eventType: ${eventType}`);
  }

  return {
    title: overrides.title || template.title,
    message: overrides.message || template.buildMessage(metadata),
  };
}

async function createNotification(payload) {
  return Notification.create(payload);
}

async function createNotificationsForEvent(payload) {
  const metadata =
    payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const recipients = await resolveRecipients(payload.recipients, payload.userId);

  if (!recipients.length) {
    throw new Error("No valid recipients were resolved for this notification event");
  }

  const content = buildEventContent(payload.eventType, metadata, payload);
  const notifications = recipients.map((recipient) => ({
    userId: recipient.id,
    type: payload.eventType,
    title: content.title,
    message: content.message,
    channel: payload.channel || "IN_APP",
    status: "UNREAD",
    metadata: {
      source: payload.source,
      eventType: payload.eventType,
      entityId: payload.entityId || null,
      entityType: payload.entityType || null,
      actorUserId: payload.actorUserId || null,
      recipient: {
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        role: recipient.role,
      },
      ...metadata,
    },
  }));

  return Notification.insertMany(notifications);
}

async function getNotificationsByUser(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 });
}

async function markAsRead(notificationId, user) {
  const filter = { _id: notificationId };

  if (user?.role !== "ADMIN") {
    filter.userId = user?.id;
  }

  return Notification.findOneAndUpdate(filter, { status: "READ" }, { new: true });
}

module.exports = {
  createNotification,
  createNotificationsForEvent,
  getNotificationsByUser,
  markAsRead,
};

