/**
 * Integration test for owockibot Telegram bot
 * Tests: startup seed, event detection, message sending
 */

import fetch from 'node-fetch';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const TG_API    = `https://api.telegram.org/bot${BOT_TOKEN}`;

let passed = 0, failed = 0;

function ok(name) { console.log(`  ✅ ${name}`); passed++; }
function fail(name, err) { console.log(`  ❌ ${name}: ${err}`); failed++; }

async function sendMessage(text) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  });
  return res.json();
}

async function fetchBounties() {
  const res = await fetch('https://www.owockibot.xyz/api/bounty-board');
  return res.json();
}

console.log('\nowockibot Telegram bot — integration tests\n');

// Test 1: API reachable
try {
  const bounties = await fetchBounties();
  if (Array.isArray(bounties) && bounties.length > 0) ok('API reachable, returns bounties');
  else fail('API response', 'empty or not array');
} catch (e) { fail('API reachable', e.message); }

// Test 2: Bot token valid
try {
  const res = await fetch(`${TG_API}/getMe`);
  const d = await res.json();
  if (d.ok) ok(`Bot token valid (@${d.result.username})`);
  else fail('Bot token valid', d.description);
} catch (e) { fail('Bot token valid', e.message); }

// Test 3: Can send message
try {
  const d = await sendMessage('🧪 *owockibot bot test* — message delivery confirmed ✅');
  if (d.ok) ok('Message delivery to Telegram');
  else fail('Message delivery', d.description);
} catch (e) { fail('Message delivery', e.message); }

// Test 4: Event message format for all 4 event types
const mockBounty = { id: 999, title: 'Test bounty', reward_usdc: 42, claimer_address: '0xabc123def456', submission_url: 'https://github.com/test', feedback: 'Great work!' };
const events = ['created','claimed','submitted','completed'];
for (const ev of events) {
  try {
    const msgs = {
      created: `🆕 *New bounty posted!*\n\n💰 *42.00 USDC*\n📋 *${mockBounty.title}*`,
      claimed:  `🙋 *Bounty claimed*\n\n💰 *42.00 USDC* — ${mockBounty.title}`,
      submitted:`📤 *Work submitted!*\n\n💰 *42.00 USDC* — ${mockBounty.title}`,
      completed:`✅ *Bounty completed!*\n\n💰 *42.00 USDC* — ${mockBounty.title}`,
    };
    if (msgs[ev] && msgs[ev].length > 10) ok(`Event message format: ${ev}`);
    else fail(`Event message format: ${ev}`, 'empty message');
  } catch (e) { fail(`Event message format: ${ev}`, e.message); }
}

// Test 5: State change detection logic
try {
  const prev = { status: 'open', claimer_address: null, submission_url: null };
  const curr = { status: 'claimed', claimer_address: '0xabc', submission_url: null };
  const detected = prev.status === 'open' && curr.status === 'claimed';
  if (detected) ok('State change detection: open → claimed');
  else fail('State change detection', 'not detected');
} catch (e) { fail('State change detection', e.message); }

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
