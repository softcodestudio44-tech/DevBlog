const prisma = require('../config/database');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Format notifications with actor name
    const formattedNotifications = notifications.map((n) => ({
      ...n,
      message: n.actor?.name 
        ? n.message.replace('undefined', n.actor.name)
        : n.message,
    }));

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ notifications: formattedNotifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

const createNotification = async ({ userId, type, message, sourceId, sourceType, actorId }) => {
  try {
    // Get actor name for the message
    let actorName = 'Someone';
    if (actorId) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });
      actorName = actor?.name || 'Someone';
    }

    const finalMessage = message.replace('undefined', actorName);

    await prisma.notification.create({
      data: {
        userId,
        type,
        message: finalMessage,
        sourceId,
        sourceType,
        actorId,
        read: false,
      },
    });
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};