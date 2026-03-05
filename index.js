/**
 * owockibot Bounty Board — Telegram Notification Bot
 *
 * Events tracked:
 *   - new bounty created
 *   - bounty claimed
 *   - work submitted
 *   - bounty completed
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — target chat/channel id (use @username or numeric id)
 *   POLL_INTERVAL_MS    — optional, default 60000 (1 min)
 *   BOUNTY_API_URL      — optional, default https://www.owockibot.xyz/api/bounty-board
 */

import fetch from 'node-fetch';

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID      = process.env.TELEGRAM_CHAT_ID;
const POLL_MS      = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
const API_URL      = process.env.BOUNTY_API_URL || 'https://www.owockibot.xyz/api/bounty-board';
const TG_API       = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  process.exit(1);
}

// State: id -> { status, claimer_address, submission_url }
const state = new Map();

function truncAddr(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function rewardLabel(usdc) {
  return `💰 *${parseFloat(usdc).toFixed(2)} USDC*`;
}

async function sendMessage(text) {
  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram error:', data.description);
  } catch (err) {
    console.error('sendMessage error:', err.message);
  }
}

async function fetchBounties() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function buildMessage(event, bounty) {
  const link = `https://www.owockibot.xyz/bounty`;
  const reward = rewardLabel(bounty.reward_usdc);

  switch (event) {
    case 'created':
      return (
        `🆕 *New bounty posted!*\n\n` +
        `${reward}\n` +
        `📋 *${bounty.title}*\n` +
        `${(bounty.description || '').slice(0, 200)}...\n\n` +
        `👉 ${link}`
      );
    case 'claimed':
      return (
        `🙋 *Bounty claimed*\n\n` +
        `${reward} — ${bounty.title}\n` +
        `Claimer: \`${truncAddr(bounty.claimer_address)}\`\n\n` +
        `👉 ${link}`
      );
    case 'submitted':
      return (
        `📤 *Work submitted!*\n\n` +
        `${reward} — ${bounty.title}\n` +
        `Worker: \`${truncAddr(bounty.claimer_address)}\`\n` +
        `${bounty.submission_url ? `🔗 [Submission](${bounty.submission_url})` : ''}\n\n` +
        `👉 ${link}`
      );
    case 'completed':
      return (
        `✅ *Bounty completed!*\n\n` +
        `${reward} — ${bounty.title}\n` +
        `Worker: \`${truncAddr(bounty.claimer_address)}\`\n` +
        `${bounty.feedback ? `💬 _"${bounty.feedback}"_\n` : ''}` +
        `\n👉 ${link}`
      );
    default:
      return null;
  }
}

async function poll() {
  let bounties;
  try {
    bounties = await fetchBounties();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Fetch error:`, err.message);
    return;
  }

  for (const b of bounties) {
    const prev = state.get(b.id);

    if (!prev) {
      // First run — seed state without notifying (avoid spam on startup)
      state.set(b.id, { status: b.status, claimer_address: b.claimer_address, submission_url: b.submission_url });
      continue;
    }

    const events = [];

    // New claim
    if (prev.status === 'open' && b.status === 'claimed') events.push('claimed');
    // Submission made
    if (prev.status === 'claimed' && b.status === 'submitted') events.push('submitted');
    if (!prev.submission_url && b.submission_url && b.status === 'claimed') events.push('submitted');
    // Completed
    if (prev.status !== 'completed' && b.status === 'completed') events.push('completed');

    for (const ev of events) {
      const msg = buildMessage(ev, b);
      if (msg) {
        console.log(`[${new Date().toISOString()}] Event: ${ev} on bounty #${b.id}`);
        await sendMessage(msg);
      }
    }

    state.set(b.id, { status: b.status, claimer_address: b.claimer_address, submission_url: b.submission_url });
  }

  // Detect new bounties (id not seen before, but we're past first run)
  if (state.size > 0) {
    for (const b of bounties) {
      if (!state.has(b.id)) {
        const msg = buildMessage('created', b);
        if (msg) {
          console.log(`[${new Date().toISOString()}] New bounty #${b.id}`);
          await sendMessage(msg);
        }
        state.set(b.id, { status: b.status, claimer_address: b.claimer_address, submission_url: b.submission_url });
      }
    }
  }
}

// Seed first-run state silently, then start polling for changes
async function main() {
  console.log(`owockibot Telegram bot started. Polling every ${POLL_MS / 1000}s`);
  console.log(`API: ${API_URL}`);
  console.log(`Chat: ${CHAT_ID}`);

  // Seed state (no notifications)
  try {
    const bounties = await fetchBounties();
    for (const b of bounties) {
      state.set(b.id, { status: b.status, claimer_address: b.claimer_address, submission_url: b.submission_url });
    }
    console.log(`Seeded ${state.size} bounties. Watching for changes...`);
  } catch (err) {
    console.error('Seed error:', err.message);
  }

  // Poll loop
  setInterval(poll, POLL_MS);
}

main();
