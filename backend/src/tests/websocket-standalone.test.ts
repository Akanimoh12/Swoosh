/**
 * WebSocket Standalone Test
 * Tests WebSocket manager functionality
 * Run with: npx tsx src/tests/websocket-standalone.test.ts
 */

import {
  wsManager,
  calculateProgress,
  getStepMessage,
  estimateTimeRemaining,
  IntentStep,
  WSClient,
} from '../services/websocket-manager.js';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  sentMessages: string[] = [];
  handlers: Record<string, Function[]> = {};

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close', code, Buffer.from(reason || ''));
  }

  ping() {
    // Simulate pong response
    setTimeout(() => this.emit('pong'), 10);
  }

  on(event: string, handler: Function) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  emit(event: string, ...args: unknown[]) {
    const handlers = this.handlers[event] || [];
    handlers.forEach(h => h(...args));
  }

  // Simulate receiving a message
  receiveMessage(data: string) {
    this.emit('message', Buffer.from(data));
  }
}

// Mock FastifyRequest
const mockRequest = {
  ip: '127.0.0.1',
  headers: {
    'user-agent': 'Test Agent',
  },
  query: {},
} as any;

// Test results tracking
const results: { name: string; passed: boolean; error?: string; details?: any }[] = [];

function logResult(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log('   Details:', JSON.stringify(details, null, 2).substring(0, 300));
  if (error) console.log('   Error:', error);
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('WEBSOCKET MANAGER STANDALONE TESTS');
  console.log('='.repeat(60));
  console.log(`\nTimestamp: ${new Date().toISOString()}`);

  // Test 1: Progress calculation
  console.log('\n--- Test 1: Progress Calculation ---');
  try {
    const pendingProgress = calculateProgress('pending');
    const swappingProgress = calculateProgress('swapping');
    const completedProgress = calculateProgress('completed');
    const failedProgress = calculateProgress('failed');

    const passed = 
      pendingProgress === 0 &&
      swappingProgress === 40 &&
      completedProgress === 100 &&
      failedProgress === -1;

    logResult('Progress calculation', passed, undefined, {
      pending: pendingProgress,
      swapping: swappingProgress,
      completed: completedProgress,
      failed: failedProgress,
    });
  } catch (error: any) {
    logResult('Progress calculation', false, error.message);
  }

  // Test 2: Step messages
  console.log('\n--- Test 2: Step Messages ---');
  try {
    const pendingMsg = getStepMessage('pending');
    const bridgingMsg = getStepMessage('bridging');
    const completedMsg = getStepMessage('completed');

    const passed = 
      pendingMsg.includes('waiting') &&
      bridgingMsg.includes('bridge') &&
      completedMsg.includes('success');

    logResult('Step messages', passed, undefined, {
      pending: pendingMsg,
      bridging: bridgingMsg,
      completed: completedMsg,
    });
  } catch (error: any) {
    logResult('Step messages', false, error.message);
  }

  // Test 3: Time estimation
  console.log('\n--- Test 3: Time Estimation ---');
  try {
    const pendingTime = estimateTimeRemaining('pending');
    const bridgePendingTime = estimateTimeRemaining('bridge_pending');
    const completedTime = estimateTimeRemaining('completed');

    const passed = 
      pendingTime > 0 &&
      bridgePendingTime > 0 &&
      completedTime === 0;

    logResult('Time estimation', passed, undefined, {
      pending: `${pendingTime}s`,
      bridge_pending: `${bridgePendingTime}s`,
      completed: `${completedTime}s`,
    });
  } catch (error: any) {
    logResult('Time estimation', false, error.message);
  }

  // Test 4: Initial stats
  console.log('\n--- Test 4: Initial Stats ---');
  try {
    const stats = wsManager.getStats();

    const passed = 
      stats.totalConnections === 0 &&
      stats.uptime >= 0 &&
      stats.messagesReceived >= 0 &&
      stats.messagesSent >= 0;

    logResult('Initial stats', passed, undefined, {
      totalConnections: stats.totalConnections,
      uptime: `${stats.uptime}ms`,
      messagesReceived: stats.messagesReceived,
      messagesSent: stats.messagesSent,
    });
  } catch (error: any) {
    logResult('Initial stats', false, error.message);
  }

  // Test 5: Client registration (with mock)
  console.log('\n--- Test 5: Client Registration ---');
  try {
    const mockSocket = new MockWebSocket() as any;
    const intentId = 'test-intent-123';

    const client = wsManager.registerClient(
      mockSocket,
      intentId,
      mockRequest,
      'user-123'
    );

    const passed = 
      client !== null &&
      client?.intentId === intentId &&
      client?.userId === 'user-123' &&
      wsManager.hasActiveClients(intentId);

    logResult('Client registration', passed, undefined, {
      clientId: client?.id,
      intentId: client?.intentId,
      hasActiveClients: wsManager.hasActiveClients(intentId),
      sentMessages: mockSocket.sentMessages.length,
    });

    // Cleanup
    if (client) {
      wsManager.removeClient(client.id);
    }
  } catch (error: any) {
    logResult('Client registration', false, error.message);
  }

  // Test 6: Broadcasting
  console.log('\n--- Test 6: Broadcasting ---');
  try {
    const mockSocket1 = new MockWebSocket() as any;
    const mockSocket2 = new MockWebSocket() as any;
    const intentId = 'broadcast-test-123';

    const client1 = wsManager.registerClient(mockSocket1, intentId, mockRequest);
    const client2 = wsManager.registerClient(mockSocket2, intentId, mockRequest);

    // Clear initial messages
    mockSocket1.sentMessages = [];
    mockSocket2.sentMessages = [];

    // Broadcast to intent
    const count = wsManager.broadcastToIntent(intentId, {
      type: 'update',
      data: { test: true },
    });

    const passed = 
      count === 2 &&
      mockSocket1.sentMessages.length === 1 &&
      mockSocket2.sentMessages.length === 1;

    logResult('Broadcasting', passed, undefined, {
      clientsNotified: count,
      socket1Messages: mockSocket1.sentMessages.length,
      socket2Messages: mockSocket2.sentMessages.length,
    });

    // Cleanup
    if (client1) wsManager.removeClient(client1.id);
    if (client2) wsManager.removeClient(client2.id);
  } catch (error: any) {
    logResult('Broadcasting', false, error.message);
  }

  // Test 7: Intent status broadcast
  console.log('\n--- Test 7: Intent Status Broadcast ---');
  try {
    const mockSocket = new MockWebSocket() as any;
    const intentId = 'status-test-123';

    const client = wsManager.registerClient(mockSocket, intentId, mockRequest);
    mockSocket.sentMessages = [];

    const count = wsManager.broadcastIntentStatus({
      intentId,
      status: 'EXECUTING',
      step: 'swapping',
      progress: 40,
      message: 'Executing swap on Uniswap',
      txHash: '0x123...',
      chainId: 421614,
    });

    const lastMessage = mockSocket.sentMessages[mockSocket.sentMessages.length - 1];
    const parsed = JSON.parse(lastMessage);

    const passed = 
      count === 1 &&
      parsed.type === 'update' &&
      parsed.data.step === 'swapping' &&
      parsed.data.progress === 40;

    logResult('Intent status broadcast', passed, undefined, {
      clientsNotified: count,
      messageType: parsed.type,
      step: parsed.data.step,
      progress: parsed.data.progress,
    });

    // Cleanup
    if (client) wsManager.removeClient(client.id);
  } catch (error: any) {
    logResult('Intent status broadcast', false, error.message);
  }

  // Test 8: Client removal
  console.log('\n--- Test 8: Client Removal ---');
  try {
    const mockSocket = new MockWebSocket() as any;
    const intentId = 'removal-test-123';

    const client = wsManager.registerClient(mockSocket, intentId, mockRequest);
    const clientId = client?.id;

    const beforeCount = wsManager.getIntentClientCount(intentId);
    wsManager.removeClient(clientId!);
    const afterCount = wsManager.getIntentClientCount(intentId);

    const passed = 
      beforeCount === 1 &&
      afterCount === 0 &&
      !wsManager.hasActiveClients(intentId);

    logResult('Client removal', passed, undefined, {
      beforeCount,
      afterCount,
      hasActiveClients: wsManager.hasActiveClients(intentId),
    });
  } catch (error: any) {
    logResult('Client removal', false, error.message);
  }

  // Test 9: Connection limits per intent
  console.log('\n--- Test 9: Connection Limits ---');
  try {
    const intentId = 'limit-test-123';
    const clients: any[] = [];

    // Register a few clients (not hitting the limit, just testing multiple)
    for (let i = 0; i < 5; i++) {
      const mockSocket = new MockWebSocket() as any;
      const client = wsManager.registerClient(mockSocket, intentId, mockRequest);
      if (client) clients.push(client);
    }

    const count = wsManager.getIntentClientCount(intentId);
    const passed = count === 5;

    logResult('Connection limits', passed, undefined, {
      registeredClients: clients.length,
      activeCount: count,
    });

    // Cleanup
    clients.forEach(c => wsManager.removeClient(c.id));
  } catch (error: any) {
    logResult('Connection limits', false, error.message);
  }

  // Test 10: Stats after operations
  console.log('\n--- Test 10: Stats After Operations ---');
  try {
    const stats = wsManager.getStats();

    const passed = 
      stats.messagesSent > 0 && // We sent messages during tests
      stats.errors >= 0;

    logResult('Stats after operations', passed, undefined, {
      totalConnections: stats.totalConnections,
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      errors: stats.errors,
    });
  } catch (error: any) {
    logResult('Stats after operations', false, error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nTotal: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  return failed === 0;
}

// Run tests
runTests()
  .then(success => {
    console.log(`\n${success ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}\n`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
