import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/gravity_canvas_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

beforeAll(async () => {
});

afterAll(async () => {
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
