import request from 'supertest';
import app from './index';

describe('Express Server', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty(
        'service',
        'excel-context-engine-backend'
      );
    });

    it('should return timestamp in ISO format', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);
      
      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app).get('/api/v1/nonexistent').expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'The requested endpoint was not found');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });

  describe('Middleware', () => {
    it('should handle JSON requests', async () => {
      // Since we don't have a POST endpoint yet, we'll test that the server accepts JSON
      const response = await request(app)
        .post('/api/v1/nonexistent')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json')
        .expect(404); // Should still return 404 but not crash

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should include CORS headers', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
