# Backend for Metrics DAO bot
The code here manages all data related stuff for the Metrics DAO Golden Ticket Bot.

## How to run locally

1. Install postgresql.
2. Create a new DB.
3. Clone this repo.
4. Copy .env.example and rename it to .env.
5. Fill up .env, where DB_HOST=localhost, CORS_WHITELIST is unsused can be left as an empty array
6. Run `npm install`.
7. Install `typescript` if you haven't.
8. Under `./src/Seeders/index.ts`, edit the values for seed admins. More info in the actual code.
9. Run `npm run migrate:seed`.
10. Run `npm restart`.
11. Any changes to the code should be restarted with `npm restart`.

## How to deploy

1. Setup a Discord Bot (https://www.upwork.com/resources/how-to-make-discord-bot)
2. Get its token, you'll need this later.
3. Setup a Linux server with postgresql 14, supervisord, and node 16 installed.
4. Do steps 2 - 9 in `How to run locally`.
5. Setup supervisord

Sample .ini file

```
[program:metrics_dao_be]
directory=/var/www/html/discord_bot_be
command=node --experimental-modules index.js
process_name=%(program_name)s_%(process_num)02d
numprocs=1
priority=999
autostart=true
autorestart=true
startsecs=1
startretries=3
user=apache
stdout_logfile=/var/log/mbot_be.log
stderr_logfile=/var/log/mbot_be_error.log
redirect_stderr=true
```

6. Run supervisord.