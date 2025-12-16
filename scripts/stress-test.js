/**
 * Stress test for large file handling
 * Run with: node scripts/stress-test.js
 */

import { ValueExtractor } from '../src/utils/ValueExtractor.js';

// Generate a large test log file
function generateTestLog(numLines) {
  console.log(`\n📝 Generating ${numLines.toLocaleString()} lines of test data...`);
  const startTime = Date.now();

  const lines = [];
  for (let i = 0; i < numLines; i++) {
    const step = i;
    const loss = Math.random() * 2 + Math.exp(-i / 10000); // Decreasing loss with noise
    const gradNorm = Math.random() * 0.5 + 0.1;
    lines.push(`step: ${step} | loss: ${loss.toFixed(6)} | grad_norm: ${gradNorm.toFixed(6)}`);
  }

  const content = lines.join('\n');
  const elapsed = Date.now() - startTime;
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

  console.log(`   ✓ Generated in ${elapsed}ms`);
  console.log(`   ✓ Size: ${sizeMB} MB (${sizeBytes.toLocaleString()} bytes)`);

  return { content, sizeBytes };
}

// Test ValueExtractor performance
function testValueExtractor(content) {
  console.log('\n🔍 Testing ValueExtractor...');

  // Test 1: String input (old way - splits every time)
  console.log('\n   Test 1: extractByKeyword with string input');
  let start = Date.now();
  const result1 = ValueExtractor.extractByKeyword(content, 'loss:');
  let elapsed = Date.now() - start;
  console.log(`   ✓ Found ${result1.length.toLocaleString()} matches in ${elapsed}ms`);

  // Test 2: Pre-split lines (optimized way)
  console.log('\n   Test 2: extractByKeyword with pre-split lines');
  start = Date.now();
  const lines = content.split('\n');
  const splitTime = Date.now() - start;
  console.log(`   ✓ Split into ${lines.length.toLocaleString()} lines in ${splitTime}ms`);

  start = Date.now();
  const result2 = ValueExtractor.extractByKeyword(lines, 'loss:');
  elapsed = Date.now() - start;
  console.log(`   ✓ Found ${result2.length.toLocaleString()} matches in ${elapsed}ms`);

  // Test 3: Multiple metrics with pre-split lines
  console.log('\n   Test 3: Multiple metrics with pre-split lines (simulates worker)');
  start = Date.now();
  const lossResults = ValueExtractor.extractByKeyword(lines, 'loss:');
  const gradResults = ValueExtractor.extractByKeyword(lines, 'grad_norm:');
  elapsed = Date.now() - start;
  console.log(`   ✓ Loss: ${lossResults.length.toLocaleString()} matches`);
  console.log(`   ✓ Grad Norm: ${gradResults.length.toLocaleString()} matches`);
  console.log(`   ✓ Total time: ${elapsed}ms`);

  // Verify data integrity
  console.log('\n   Verifying data integrity...');
  if (result1.length === result2.length) {
    console.log(`   ✓ Match counts are equal: ${result1.length}`);
  } else {
    console.log(`   ✗ ERROR: Match counts differ! ${result1.length} vs ${result2.length}`);
  }

  return { lossResults, gradResults, lines };
}

// Test memory usage
function testMemoryUsage(label) {
  const used = process.memoryUsage();
  console.log(`\n📊 Memory Usage (${label}):`);
  console.log(`   Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   RSS: ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
  return used;
}

// Main test runner
async function runStressTest() {
  console.log('═'.repeat(60));
  console.log('🚀 STRESS TEST FOR LARGE FILE HANDLING');
  console.log('═'.repeat(60));

  const testCases = [
    { lines: 10000, name: '10K lines' },
    { lines: 50000, name: '50K lines' },
    { lines: 100000, name: '100K lines' },
    { lines: 500000, name: '500K lines' },
    { lines: 1000000, name: '1M lines' },
  ];

  testMemoryUsage('Initial');

  for (const testCase of testCases) {
    console.log('\n' + '─'.repeat(60));
    console.log(`📋 TEST CASE: ${testCase.name}`);
    console.log('─'.repeat(60));

    // Generate test data
    const { content, sizeBytes } = generateTestLog(testCase.lines);

    // Check if this would be considered a "large file"
    const LARGE_FILE_THRESHOLD = 500 * 1024; // 500KB
    const isLargeFile = sizeBytes > LARGE_FILE_THRESHOLD;
    console.log(`\n   Large file threshold: ${isLargeFile ? '⚠️  EXCEEDS' : '✓ Within'} (${(LARGE_FILE_THRESHOLD / 1024).toFixed(0)}KB)`);

    // Test ValueExtractor
    const { lossResults, gradResults } = testValueExtractor(content);

    // Memory after processing
    testMemoryUsage('After processing');

    // Summary
    console.log('\n📈 Results Summary:');
    console.log(`   Lines processed: ${testCase.lines.toLocaleString()}`);
    console.log(`   Loss data points: ${lossResults.length.toLocaleString()}`);
    console.log(`   Grad norm data points: ${gradResults.length.toLocaleString()}`);

    // Verify first and last values
    if (lossResults.length > 0) {
      console.log(`   First loss value: ${lossResults[0].value.toFixed(6)} (line ${lossResults[0].line})`);
      console.log(`   Last loss value: ${lossResults[lossResults.length - 1].value.toFixed(6)} (line ${lossResults[lossResults.length - 1].line})`);
    }

    // Force GC if available
    if (global.gc) {
      global.gc();
      console.log('\n   🧹 Garbage collection triggered');
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ STRESS TEST COMPLETE');
  console.log('═'.repeat(60));

  testMemoryUsage('Final');
}

// Run the test
runStressTest()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Stress test failed:', error);
    process.exit(1);
  });
