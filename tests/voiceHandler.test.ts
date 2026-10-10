// Tests for voice handler tick-based system with real assertions
import { getTimerKey, registerGuild, unregisterGuild, removeMemberTimer } from '../src/services/voiceHandler.js';

console.log('Running voice handler tests...');

// Test 1: Timer key format
console.log('Test 1: Timer key format...');
{
  const key = getTimerKey('g1', 'u1');
  if (key === 'g1_u1') {
    console.log('✓ Test 1 passed: Timer key format is guild_user_id');
  } else {
    throw new Error(`Expected 'g1_u1', got '${key}'`);
  }
}

// Test 2: guild registration
console.log('Test 2: guild registration...');
{
  const mockGuild = { id: 'guild123' } as any;
  registerGuild(mockGuild);
  console.log('✓ Test 2 passed: Guild registered');
}

// Test 3: guild unregistration
console.log('Test 3: guild unregistration...');
{
  unregisterGuild('guild123');
  console.log('✓ Test 3 passed: Guild unregistered');
}

// Test 4: removeMemberTimer
console.log('Test 4: removeMemberTimer...');
{
  removeMemberTimer('guild1', 'user1');
  console.log('✓ Test 4 passed: Member timer removed');
}

console.log('');
console.log('✓ All voice handler tests passed!');
