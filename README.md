# owockibot Bounty Board — Telegram Bot

A lightweight Node.js bot that monitors the [owockibot bounty board](https://www.owockibot.xyz/bounty) and sends Telegram notifications when:

- 🆕 A new bounty is posted
- 🙋 A bounty is claimed
- 📤 Work is submitted
- ✅ A bounty is completed

## Setup

### 1. Create a Telegram bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the **bot token** you receive

### 2. Get your Chat ID

- For a personal chat: start a conversation with your bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your chat ID
- For a group: add the bot to the group, send a message, then check `getUpdates`
- For a channel: add the bot as admin, use `@channelusername` or numeric ID

### 3. Clone and install

```bash
git clone https://github.com/unleashedBelial/owockibot-telegram-bot
cd owockibot-telegram-bot
npm install
```

### 4. Configure environment

Create a `.env` file (or set env vars directly):

```env
TELEGRAM_BOT_TOKEN=123456:ABC-your-bot-token-here
TELEGRAM_CHAT_ID=-1001234567890
POLL_INTERVAL_MS=60000
# BOUNTY_API_URL=https://www.owockibot.xyz/api/bounty-board  # optional override
```

### 5. Run

```bash
node index.js
```

## Deployment

### Railway (recommended)

1. Fork this repo
2. Create new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Add env vars in Railway dashboard
5. Deploy — Railway will keep it running 24/7

### Docker (self-hosted)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
```

### PM2 (VPS)

```bash
npm install -g pm2
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy pm2 start index.js --name owockibot-watcher
pm2 save
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ | — | Target chat/channel ID |
| `POLL_INTERVAL_MS` | ❌ | `60000` | Polling interval in ms |
| `BOUNTY_API_URL` | ❌ | `https://www.owockibot.xyz/api/bounty-board` | API endpoint override |

## Notes

- On startup, the bot seeds its state from current bounties without sending notifications (no spam)
- Only **new** changes since the last poll trigger notifications
- All events include the bounty reward, title, and a link back to the board
