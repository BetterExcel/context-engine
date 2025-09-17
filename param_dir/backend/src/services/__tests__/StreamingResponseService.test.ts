import { StreamingResponseService } from '../StreamingResponseService';

describe('StreamingResponseService', () => {
  let streamingService: StreamingResponseService;

  beforeEach(() => {
    streamingService = new StreamingResponseService({
      chunkSize: 1024,
      maxBufferSize: 10240,
      timeout: 5000,
      enableCompression: true,
      progressInterval: 100
    });
  });

  afterEach(() => {
    // Clean up any active streams
    const activeStreams = streamingService.getActiveStreams();
    for (const stream of activeStreams) {
      streamingService.completeStream(stream.streamId);
    }
  });

  describe('stream lifecycle', () => {
    it('should start a new stream successfully', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation',
        100,
        { testData: 'value' }
      );

      expect(streamId).toBeDefined();
      expect(streamId).toContain('test-session');
      expect(streamId).toContain('test-operation');

      const status = streamingService.getStreamStatus(streamId);
      expect(status.exists).toBe(true);
      expect(status.context?.operation).toBe('test-operation');
    });

    it('should send chunks to stream', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation'
      );

      const chunkData = { message: 'test chunk', data: [1, 2, 3] };
      const success = await streamingService.sendChunk(streamId, chunkData);

      expect(success).toBe(true);

      const status = streamingService.getStreamStatus(streamId);
      expect(status.chunksCount).toBeGreaterThan(0);
    });

    it('should send progress updates', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation'
      );

      const progress = {
        stage: 'processing',
        progress: 50,
        message: 'Half way done'
      };

      const success = await streamingService.sendProgress(streamId, progress);
      expect(success).toBe(true);
    });

    it('should complete stream successfully', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation'
      );

      await streamingService.sendChunk(streamId, { data: 'test' });
      
      const finalData = { result: 'completed', summary: 'success' };
      const success = await streamingService.completeStream(streamId, finalData);

      expect(success).toBe(true);

      const status = streamingService.getStreamStatus(streamId);
      expect(status.exists).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle sending chunks to non-existent stream', async () => {
      const success = await streamingService.sendChunk(
        'non-existent-stream',
        { data: 'test' }
      );

      expect(success).toBe(false);
    });

    it('should send error messages to stream', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation'
      );

      const error = new Error('Test error message');
      const success = await streamingService.sendError(streamId, error);

      expect(success).toBe(true);
    });

    it('should handle string errors', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation'
      );

      const success = await streamingService.sendError(streamId, 'String error message');
      expect(success).toBe(true);
    });
  });

  describe('large dataset processing', () => {
    it('should process large dataset with progress updates', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'dataset-processing'
      );

      const dataset = Array(100).fill(null).map((_, i) => ({ id: i, value: `item_${i}` }));
      
      const processor = async (item: any, index: number) => ({
        ...item,
        processed: true,
        processedAt: Date.now(),
        index
      });

      const results = await streamingService.processLargeDataset(
        streamId,
        dataset,
        processor,
        { 
          batchSize: 10,
          progressCallback: (progress) => {
            expect(progress.progress).toBeGreaterThanOrEqual(0);
            expect(progress.progress).toBeLessThanOrEqual(100);
          }
        }
      );

      expect(results).toHaveLength(100);
      expect(results[0]).toHaveProperty('processed', true);
      expect(results[0]).toHaveProperty('index', 0);
    });

    it('should handle processing errors in dataset', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'dataset-processing'
      );

      const dataset = Array(10).fill(null).map((_, i) => ({ id: i, value: `item_${i}` }));
      
      const processor = async (item: any) => {
        if (item.id === 5) {
          throw new Error('Processing error');
        }
        return { ...item, processed: true };
      };

      // Should handle errors gracefully and return results for successful items
      const results = await streamingService.processLargeDataset(
        streamId,
        dataset,
        processor
      );
      
      // Should have processed the items that didn't fail
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('analysis streaming', () => {
    it('should stream analysis results as they become available', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'analysis'
      );

      const analysisSteps = [
        {
          name: 'step1',
          executor: async () => ({ result: 'step1 complete' }),
          weight: 1
        },
        {
          name: 'step2',
          executor: async () => ({ result: 'step2 complete' }),
          weight: 2
        },
        {
          name: 'step3',
          executor: async () => ({ result: 'step3 complete' }),
          weight: 1
        }
      ];

      const results = await streamingService.streamAnalysisResults(
        streamId,
        analysisSteps
      );

      expect(results.size).toBe(3);
      expect(results.get('step1')).toEqual({ result: 'step1 complete' });
      expect(results.get('step2')).toEqual({ result: 'step2 complete' });
      expect(results.get('step3')).toEqual({ result: 'step3 complete' });
    });

    it('should handle analysis step failures', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'analysis'
      );

      const analysisSteps = [
        {
          name: 'success-step',
          executor: async () => ({ result: 'success' })
        },
        {
          name: 'failure-step',
          executor: async () => {
            throw new Error('Step failed');
          }
        },
        {
          name: 'another-success-step',
          executor: async () => ({ result: 'another success' })
        }
      ];

      const results = await streamingService.streamAnalysisResults(
        streamId,
        analysisSteps
      );

      // Should continue processing other steps even if one fails
      expect(results.size).toBe(2); // Only successful steps
      expect(results.get('success-step')).toEqual({ result: 'success' });
      expect(results.get('another-success-step')).toEqual({ result: 'another success' });
    });
  });

  describe('stream management', () => {
    it('should track active streams', async () => {
      const streamId1 = await streamingService.startStream('session1', 'op1');
      const streamId2 = await streamingService.startStream('session2', 'op2');

      const activeStreams = streamingService.getActiveStreams();
      expect(activeStreams).toHaveLength(2);
      
      const streamIds = activeStreams.map(s => s.streamId);
      expect(streamIds).toContain(streamId1);
      expect(streamIds).toContain(streamId2);
    });

    it('should provide stream status information', async () => {
      const streamId = await streamingService.startStream(
        'test-session',
        'test-operation',
        100,
        { metadata: 'test' }
      );

      await streamingService.sendChunk(streamId, { data: 'test chunk' });

      const status = streamingService.getStreamStatus(streamId);
      expect(status.exists).toBe(true);
      expect(status.context?.sessionId).toBe('test-session');
      expect(status.context?.operation).toBe('test-operation');
      expect(status.context?.totalSteps).toBe(100);
      expect(status.chunksCount).toBeGreaterThanOrEqual(1); // Initial progress + our chunk
      expect(status.bufferSize).toBeGreaterThan(0);
    });

    it('should handle buffer size limits', async () => {
      // Create service with small buffer for testing
      const smallBufferService = new StreamingResponseService({
        maxBufferSize: 100 // Very small buffer
      });

      const streamId = await smallBufferService.startStream(
        'test-session',
        'test-operation'
      );

      // Send multiple large chunks to exceed buffer
      const largeChunk = { data: 'x'.repeat(50) };
      
      await smallBufferService.sendChunk(streamId, largeChunk);
      await smallBufferService.sendChunk(streamId, largeChunk);
      await smallBufferService.sendChunk(streamId, largeChunk);

      // Should handle buffer overflow gracefully
      const status = smallBufferService.getStreamStatus(streamId);
      expect(status.exists).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should emit events for stream lifecycle', async () => {
      let chunkEventReceived = false;
      let completeEventReceived = false;

      streamingService.on('chunk', (streamId, chunk) => {
        expect(streamId).toBeDefined();
        expect(chunk).toBeDefined();
        chunkEventReceived = true;
      });

      streamingService.on('complete', (streamId) => {
        expect(streamId).toBeDefined();
        completeEventReceived = true;
      });

      // Trigger events
      const streamId = await streamingService.startStream('test-session', 'test-operation');
      await streamingService.sendChunk(streamId, { data: 'test' });
      await streamingService.completeStream(streamId);

      // Give events time to fire
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(chunkEventReceived).toBe(true);
      expect(completeEventReceived).toBe(true);
    });
  });
});