const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createScheduledBroadcast(data) {
  try {
    return await prisma.scheduledBroadcast.create({
      data: {
        type: data.type,
        qualification: data.qualification,
        message: data.message,
        photo: data.photo,
        caption: data.caption,
        scheduledFor: data.scheduledFor,
        createdBy: data.createdBy,
        isCompleted: false
      }
    });
  } catch (error) {
    console.error('Ошибка при создании запланированной рассылки:', error);
    throw error;
  }
}

async function getScheduledBroadcasts() {
  try {
    return await prisma.scheduledBroadcast.findMany({
      where: {
        isCompleted: false,
        scheduledFor: {
          gt: new Date()
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    });
  } catch (error) {
    console.error('Ошибка при получении запланированных рассылок:', error);
    throw error;
  }
}

async function cancelBroadcast(id) {
  try {
    return await prisma.scheduledBroadcast.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Ошибка при отмене рассылки:', error);
    throw error;
  }
}

module.exports = {
  createScheduledBroadcast,
  getScheduledBroadcasts,
  cancelBroadcast
}; 