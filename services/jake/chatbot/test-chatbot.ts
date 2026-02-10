/**
 * Jake Chatbot - Test Script
 * Tests WebSocket connection and conversation flow
 */

import WebSocket from 'ws';

const JAKE_SERVICE_URL = process.env.JAKE_SERVICE_URL || 'ws://localhost:3002';
const TEST_OFFER_ID = process.env.TEST_OFFER_ID || 'test-offer-123';

interface ServerMessage {
  type: 'greeting' | 'message' | 'error' | 'pong';
  data?: {
    message?: string;
    animation_state?: string;
    timestamp?: string;
    error?: string;
  };
}

interface ClientMessage {
  type: 'message' | 'ping';
  data?: {
    message?: string;
  };
}

/**
 * Test conversation with Jake
 */
async function testChatbot() {
  console.log(`\n🤠 Testing Jake Chatbot\n`);
  console.log(`Connecting to: ${JAKE_SERVICE_URL}/ws/chat/${TEST_OFFER_ID}\n`);

  const ws = new WebSocket(`${JAKE_SERVICE_URL}/ws/chat/${TEST_OFFER_ID}`);

  // Track conversation
  let messageCount = 0;
  const testQuestions = [
    "How did you calculate this price?",
    "Are the scratches really that bad?",
    "Is this a good deal?",
  ];

  ws.on('open', () => {
    console.log('✅ WebSocket connection established\n');
  });

  ws.on('message', (rawData: Buffer) => {
    const message: ServerMessage = JSON.parse(rawData.toString());

    if (message.type === 'greeting') {
      console.log('👋 Jake\'s Greeting:');
      console.log(`   "${message.data?.message}"`);
      console.log(`   Animation: ${message.data?.animation_state}\n`);

      // Send first question after greeting
      setTimeout(() => {
        sendQuestion(ws, testQuestions[messageCount]);
        messageCount++;
      }, 1000);

    } else if (message.type === 'message') {
      console.log('💬 Jake\'s Response:');
      console.log(`   "${message.data?.message}"`);
      console.log(`   Animation: ${message.data?.animation_state}\n`);

      // Send next question if available
      if (messageCount < testQuestions.length) {
        setTimeout(() => {
          sendQuestion(ws, testQuestions[messageCount]);
          messageCount++;
        }, 2000);
      } else {
        // All questions asked, close connection
        console.log('✅ All test questions completed\n');
        setTimeout(() => {
          ws.close();
        }, 1000);
      }

    } else if (message.type === 'error') {
      console.error('❌ Error from Jake:');
      console.error(`   ${message.data?.error}\n`);
      ws.close();

    } else if (message.type === 'pong') {
      console.log('🏓 Pong received');
    }
  });

  ws.on('close', () => {
    console.log('👋 WebSocket connection closed\n');
    process.exit(0);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
  });

  // Test ping/pong after 5 seconds
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('🏓 Sending ping...\n');
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 5000);
}

/**
 * Send a question to Jake
 */
function sendQuestion(ws: WebSocket, question: string) {
  console.log(`❓ Asking: "${question}"\n`);

  const message: ClientMessage = {
    type: 'message',
    data: {
      message: question,
    },
  };

  ws.send(JSON.stringify(message));
}

/**
 * Test REST endpoints
 */
async function testRestEndpoints() {
  const baseUrl = JAKE_SERVICE_URL.replace('ws://', 'http://').replace('wss://', 'https://');

  console.log(`\n🔍 Testing REST Endpoints\n`);

  // Test availability check
  try {
    console.log(`GET ${baseUrl}/api/v1/chat/${TEST_OFFER_ID}/available`);
    const availRes = await fetch(`${baseUrl}/api/v1/chat/${TEST_OFFER_ID}/available`);
    const availData = await availRes.json();
    console.log('✅ Availability:', availData);
  } catch (error) {
    console.error('❌ Availability check failed:', (error as Error).message);
  }

  console.log('');

  // Test history clear
  try {
    console.log(`DELETE ${baseUrl}/api/v1/chat/${TEST_OFFER_ID}/history`);
    const clearRes = await fetch(`${baseUrl}/api/v1/chat/${TEST_OFFER_ID}/history`, {
      method: 'DELETE',
    });
    const clearData = await clearRes.json();
    console.log('✅ Clear history:', clearData);
  } catch (error) {
    console.error('❌ Clear history failed:', (error as Error).message);
  }

  console.log('');
}

/**
 * Main test runner
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'websocket';

  if (mode === 'rest') {
    await testRestEndpoints();
  } else if (mode === 'all') {
    await testRestEndpoints();
    setTimeout(() => testChatbot(), 2000);
  } else {
    testChatbot();
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
