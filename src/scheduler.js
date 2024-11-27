const cron = require('node-cron');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const { sendMessageToUser } = require('./utils/telegram');

    // Schedule task to send weekly report to super admin
    cron.schedule('0 7 * * 0', async () => {
      const superAdminId = process.env.SUPER_ADMIN_ID;
      const topUsers = await getTopActiveUsers();
      let message = 'ТОП-5 самых активных пользователей:\n';
      topUsers.forEach((user, index) => {
        message += `${index + 1}. ${user.name} - ${user.activityScore}\n`;
        message += `Премировать: /reward_${user.id}\n`;
      });
      sendMessageToUser(superAdminId, message);
    });

    // Function to get top active users
    async function getTopActiveUsers() {
      // Implement logic to calculate top active users
      return [];
    }

    // Schedule task to send reminders for upcoming games and events
    cron.schedule('0 9 * * *', async () => {
      const upcomingGames = await prisma.game.findMany({
        where: {
          date: {
            gte: new Date(),
            lte: new Date(new Date().setDate(new Date().getDate() + 1))
          }
        }
      });

      upcomingGames.forEach(game => {
        // Notify users about the upcoming game
        notifyUsersAboutGame(game);
      });
    });

    async function notifyUsersAboutGame(game) {
      // Implement logic to notify users about the game
    }
