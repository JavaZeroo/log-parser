import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the global self object for Web Worker environment
global.self = {
  onmessage: null,
  postMessage: vi.fn()
};

// Import the worker code
describe('logParser.worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.self.postMessage.mockClear();

    // Dynamically import the worker to capture the message handler
    // We'll simulate the worker by directly calling what would be self.onmessage
  });

  afterEach(() => {
    // Clean up
  });

  // Helper to simulate worker message
  const sendWorkerMessage = async (type, payload) => {
    // Import worker to set up self.onmessage
    await import('../logParser.worker.js');

    if (global.self.onmessage) {
      global.self.onmessage({ data: { type, payload } });
    }
  };

  describe('Keyword-based extraction', () => {
    it('should extract values using keyword mode', async () => {
      const content = `Step 0: loss: 1.234
Step 1: loss: 0.567
Step 2: loss: 0.123`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-1',
        content,
        config
      });

      expect(global.self.postMessage).toHaveBeenCalledWith({
        type: 'PARSE_COMPLETE',
        payload: {
          fileId: 'test-file-1',
          metricsData: {
            'Loss': [
              { x: 0, y: 1.234 },
              { x: 1, y: 0.567 },
              { x: 2, y: 0.123 }
            ]
          }
        }
      });
    });

    it('should handle case-insensitive keyword matching', async () => {
      const content = `LOSS: 1.0
Loss: 2.0
loss: 3.0`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-2',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(3);
      expect(call.payload.metricsData['Loss'][0].y).toBe(1.0);
    });

    it('should extract scientific notation values', async () => {
      const content = `loss: 1.5e-3
loss: 2.5E+2
loss: 3.14e10`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-3',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([
        { x: 0, y: 1.5e-3 },
        { x: 1, y: 2.5e2 },
        { x: 2, y: 3.14e10 }
      ]);
    });

    it('should handle multiple metrics with different keywords', async () => {
      const content = `step 0: loss: 1.0 acc: 0.5 lr: 0.001
step 1: loss: 0.8 acc: 0.6 lr: 0.0009`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' },
          { name: 'Accuracy', mode: 'keyword', keyword: 'acc:' },
          { name: 'LR', mode: 'keyword', keyword: 'lr:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-4',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData).toEqual({
        'Loss': [{ x: 0, y: 1.0 }, { x: 1, y: 0.8 }],
        'Accuracy': [{ x: 0, y: 0.5 }, { x: 1, y: 0.6 }],
        'LR': [{ x: 0, y: 0.001 }, { x: 1, y: 0.0009 }]
      });
    });

    it('should handle negative numbers', async () => {
      const content = `gradient: -0.123
gradient: -1.5e-2`;

      const config = {
        metrics: [
          { name: 'Gradient', mode: 'keyword', keyword: 'gradient:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-5',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Gradient']).toEqual([
        { x: 0, y: -0.123 },
        { x: 1, y: -1.5e-2 }
      ]);
    });
  });

  describe('Regex-based extraction', () => {
    it('should extract values using regex mode', async () => {
      const content = `[INFO] training_loss=1.234
[INFO] training_loss=0.567`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'regex', regex: 'training_loss=([\\d.eE+-]+)' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-6',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([
        { x: 0, y: 1.234 },
        { x: 1, y: 0.567 }
      ]);
    });

    it('should handle complex regex patterns', async () => {
      const content = `{"metrics": {"loss": 1.5}}
{"metrics": {"loss": 0.8}}`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'regex', regex: '"loss":\\s*([\\d.]+)' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-7',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(2);
    });

    it('should handle regex with no matches', async () => {
      const content = `some random text
no numbers here`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'regex', regex: 'loss:\\s*([\\d.]+)' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-8',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([]);
    });

    it('should handle invalid regex gracefully', async () => {
      const content = `loss: 1.0`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'regex', regex: 'loss:\\s*([\\d.]+' } // Invalid regex - missing )
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-9',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      // Should return empty results for invalid regex
      expect(call.payload.metricsData['Loss']).toEqual([]);
    });
  });

  describe('Step extraction', () => {
    it('should extract step numbers when useStepKeyword is enabled', async () => {
      const content = `step: 100 loss: 1.0
step: 200 loss: 0.8
step: 300 loss: 0.6`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-10',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([
        { x: 100, y: 1.0 },
        { x: 200, y: 0.8 },
        { x: 300, y: 0.6 }
      ]);
    });

    it('should handle case-insensitive step keyword', async () => {
      const content = `STEP: 10 loss: 1.0
Step: 20 loss: 0.8`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-11',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss'][0].x).toBe(10);
      expect(call.payload.metricsData['Loss'][1].x).toBe(20);
    });

    it('should use index when step keyword not found', async () => {
      const content = `loss: 1.0
loss: 0.8
loss: 0.6`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-12',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      // Should fall back to index when no step found
      expect(call.payload.metricsData['Loss']).toEqual([
        { x: 0, y: 1.0 },
        { x: 1, y: 0.8 },
        { x: 2, y: 0.6 }
      ]);
    });

    it('should handle custom step keywords', async () => {
      const content = `iteration 50: loss: 1.0
iteration 100: loss: 0.8`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'iteration'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-13',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([
        { x: 50, y: 1.0 },
        { x: 100, y: 0.8 }
      ]);
    });

    it('should handle negative step numbers', async () => {
      const content = `step: -5 loss: 1.0
step: -3 loss: 0.8`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-14',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss'][0].x).toBe(-5);
      expect(call.payload.metricsData['Loss'][1].x).toBe(-3);
    });
  });

  describe('Metric naming', () => {
    it('should use metric name when provided', async () => {
      const content = `value: 1.0`;

      const config = {
        metrics: [
          { name: 'Custom Name', mode: 'keyword', keyword: 'value:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-15',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData).toHaveProperty('Custom Name');
    });

    it('should derive name from keyword when name is empty', async () => {
      const content = `loss: 1.0`;

      const config = {
        metrics: [
          { name: '', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-16',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData).toHaveProperty('loss');
    });

    it('should sanitize regex for metric name', async () => {
      const content = `loss: 1.0`;

      const config = {
        metrics: [
          { name: '', mode: 'regex', regex: 'loss:\\s*([\\d.]+)', keyword: '' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-17',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      // Should sanitize regex to create a valid metric name
      expect(Object.keys(call.payload.metricsData)[0]).toBeTruthy();
    });

    it('should use fallback name when no name/keyword/regex available', async () => {
      const content = `1.0`;

      const config = {
        metrics: [
          { name: '', mode: 'keyword', keyword: '', regex: '' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-18',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData).toHaveProperty('metric1');
    });

    it('should handle multiple metrics with fallback names', async () => {
      const content = `1.0 2.0`;

      const config = {
        metrics: [
          { name: '', mode: 'keyword', keyword: '' },
          { name: '', mode: 'keyword', keyword: '' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-19',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData).toHaveProperty('metric1');
      expect(call.payload.metricsData).toHaveProperty('metric2');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty content', async () => {
      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-20',
        content: '',
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([]);
    });

    it('should handle content with only whitespace', async () => {
      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-21',
        content: '   \n  \n  \t\n',
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([]);
    });

    it('should handle content with special characters', async () => {
      const content = `loss: 1.0 🚀
loss: 2.0 ✨
loss: 3.0 中文`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-22',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(3);
    });

    it('should handle very large numbers', async () => {
      const content = `loss: 9999999999999
loss: 1e308`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-23',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss'][0].y).toBe(9999999999999);
      expect(call.payload.metricsData['Loss'][1].y).toBe(1e308);
    });

    it('should handle NaN values gracefully', async () => {
      const content = `loss: NaN
loss: 1.0
loss: Infinity`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-24',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      // Should only capture valid number
      expect(call.payload.metricsData['Loss']).toHaveLength(1);
      expect(call.payload.metricsData['Loss'][0].y).toBe(1.0);
    });

    it('should handle mixed line endings (CRLF, LF)', async () => {
      const content = `loss: 1.0\r\nloss: 2.0\nloss: 3.0\r\n`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-25',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(3);
    });

    it('should handle lines without any values', async () => {
      const content = `Starting training...
loss: 1.0
Processing...
loss: 2.0
Done!`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-26',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(2);
    });

    it('should send error message when parsing throws exception', async () => {
      // Create a config that will cause an error
      const config = null; // This should cause an error when accessing config.metrics

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-file-error',
        content: 'some content',
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.type).toBe('PARSE_ERROR');
      expect(call.payload.fileId).toBe('test-file-error');
      expect(call.payload.error).toBeTruthy();
    });
  });

  describe('Real-world log formats', () => {
    it('should parse PyTorch training logs', async () => {
      const content = `Epoch 1/10
Step 0: loss: 2.3456, acc: 0.234
Step 1: loss: 2.1234, acc: 0.345
Step 2: loss: 1.9876, acc: 0.456`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' },
          { name: 'Accuracy', mode: 'keyword', keyword: 'acc:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'Step'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-pytorch',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toEqual([
        { x: 0, y: 2.3456 },
        { x: 1, y: 2.1234 },
        { x: 2, y: 1.9876 }
      ]);
      expect(call.payload.metricsData['Accuracy']).toHaveLength(3);
    });

    it('should parse TensorFlow logs', async () => {
      const content = `2024-01-01 10:00:00 - INFO - training_loss=1.234 validation_loss=1.456
2024-01-01 10:01:00 - INFO - training_loss=0.987 validation_loss=1.123`;

      const config = {
        metrics: [
          { name: 'Train Loss', mode: 'regex', regex: 'training_loss=([\\d.]+)' },
          { name: 'Val Loss', mode: 'regex', regex: 'validation_loss=([\\d.]+)' }
        ],
        useStepKeyword: false
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-tensorflow',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Train Loss']).toHaveLength(2);
      expect(call.payload.metricsData['Val Loss']).toHaveLength(2);
    });

    it('should parse JSON-formatted logs', async () => {
      const content = `{"step": 100, "metrics": {"loss": 1.5, "grad_norm": 0.123}}
{"step": 200, "metrics": {"loss": 1.2, "grad_norm": 0.089}}`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'regex', regex: '"loss":\\s*([\\d.]+)' },
          { name: 'Grad Norm', mode: 'regex', regex: '"grad_norm":\\s*([\\d.]+)' }
        ],
        useStepKeyword: true,
        stepKeyword: '"step":'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-json',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss'][0].x).toBe(100);
      expect(call.payload.metricsData['Loss'][1].x).toBe(200);
    });

    it('should parse wandb-style logs', async () => {
      const content = `wandb: step 500 | loss 1.234 | lr 0.001
wandb: step 1000 | loss 0.987 | lr 0.0009`;

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss' },
          { name: 'LR', mode: 'keyword', keyword: 'lr' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-wandb',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss'][0].x).toBe(500);
      expect(call.payload.metricsData['LR'][1].x).toBe(1000);
    });
  });

  describe('Performance scenarios', () => {
    it('should handle large number of data points', async () => {
      // Generate 1000 lines of log data
      const lines = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`step: ${i} loss: ${(1.0 - i * 0.001).toFixed(4)}`);
      }
      const content = lines.join('\n');

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-large',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(1000);
      expect(call.payload.metricsData['Loss'][0].x).toBe(0);
      expect(call.payload.metricsData['Loss'][999].x).toBe(999);
    });

    it('should handle multiple metrics with large dataset', async () => {
      const lines = [];
      for (let i = 0; i < 500; i++) {
        lines.push(`step: ${i} loss: ${Math.random()} acc: ${Math.random()} lr: ${0.001 - i * 0.000001}`);
      }
      const content = lines.join('\n');

      const config = {
        metrics: [
          { name: 'Loss', mode: 'keyword', keyword: 'loss:' },
          { name: 'Accuracy', mode: 'keyword', keyword: 'acc:' },
          { name: 'LR', mode: 'keyword', keyword: 'lr:' }
        ],
        useStepKeyword: true,
        stepKeyword: 'step:'
      };

      await sendWorkerMessage('PARSE_FILE', {
        fileId: 'test-large-multi',
        content,
        config
      });

      const call = global.self.postMessage.mock.calls[0][0];
      expect(call.payload.metricsData['Loss']).toHaveLength(500);
      expect(call.payload.metricsData['Accuracy']).toHaveLength(500);
      expect(call.payload.metricsData['LR']).toHaveLength(500);
    });
  });
});
