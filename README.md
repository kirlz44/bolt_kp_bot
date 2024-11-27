# Telegram Bot Documentation

    ## Overview
    This bot is designed to manage games, events, and a referral program. It supports user roles such as super admin, admin, partner, and user.

    ## Installation
    1. Clone the repository.
    2. Run `npm install` to install dependencies.
    3. Set up your `.env` file with the necessary configuration.

    ## Running the Bot
    Use PM2 to start the bot:
    ```
    pm2 start kp_bot/src/index.js --name "telegram-bot"
    ```

    ## Features
    - User registration and role management
    - Game and event management
    - Referral program with bonus calculation
    - Payment integration with Robokassa
    - Automated notifications and reminders

    ## Testing
    Run tests using Jest:
    ```
    npm run test
    ```

    ## Logging and Monitoring
    - Logs are stored in the `logs` directory.
    - Use PM2 for process management and monitoring.

    ## Contact
    For support, contact the development team.
