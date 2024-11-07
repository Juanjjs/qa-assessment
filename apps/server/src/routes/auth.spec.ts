import request from 'supertest';
import { sessionRepository, userRepository } from '../database';
import { Session, User } from '@qa-assessment/shared';
import bcrypt from 'bcrypt';
import { makeExpressApp } from '../lib';

describe('Authentication', () => {
  const app = makeExpressApp();
  let mockUser: User;
  let mockSession: Session;
  const currentDate = new Date();

  beforeEach(() => {
    // Mock user data
    mockUser = {
      id: '1',
      username: 'testuser',
      password: bcrypt.hashSync('password123', 10),
    };

    mockSession = {
      id: '1',
      userId: mockUser.id,
      token: 'test-session-token',
      createdAt: currentDate,
    };

    // Mock repository methods
    jest
      .spyOn(userRepository, 'findByCredentials')
      .mockImplementation(async ({ username, password }) => {
        if (
          username === mockUser.username &&
          bcrypt.compareSync(password, mockUser.password)
        ) {
          return mockUser;
        }
        return null;
      });

    jest.spyOn(sessionRepository, 'create').mockResolvedValue(mockSession);
    jest
      .spyOn(sessionRepository, 'findByToken')
      .mockImplementation(async (token) =>
        token === mockSession.token ? mockSession : null,
      );
    jest.spyOn(sessionRepository, 'delete').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockSession,
        createdAt: currentDate.toISOString(),
      });
      expect(userRepository.findByCredentials).toHaveBeenCalledTimes(1);
      expect(sessionRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'testuser',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({ message: 'Invalid credentials' });
      expect(userRepository.findByCredentials).toHaveBeenCalledTimes(1);
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'test', // username too short
        password: '123', // password too short
      });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('errors');
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout with valid session token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', mockSession.token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logged out' });
      expect(sessionRepository.findByToken).toHaveBeenCalledWith(
        mockSession.token,
      );
      expect(sessionRepository.delete).toHaveBeenCalledWith(mockSession.id);
    });

    it('should reject logout without authorization header', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
      expect(sessionRepository.delete).not.toHaveBeenCalled();
    });

    it('should reject logout with invalid session token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
      expect(sessionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should validate username length', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'ab', // too short
        password: 'validpassword123',
      });

      expect(response.status).toBe(422);
      expect(response.body.errors[0].message).toContain(
        'String must contain at least 3 character(s)',
      );
    });

    it('should validate password length', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'validuser',
        password: '123', // too short
      });

      expect(response.status).toBe(422);
      expect(response.body.errors[0].message).toContain(
        'String must contain at least 8 character(s)',
      );
    });

    it('should require both username and password', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'testuser',
        // missing password
      });

      expect(response.status).toBe(422);
      expect(response.body.errors[0].message).toContain('Required');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(userRepository, 'findByCredentials')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/auth/login').send({
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
    });

    it('should handle session creation errors', async () => {
      jest
        .spyOn(sessionRepository, 'create')
        .mockRejectedValue(new Error('Session creation failed'));

      const response = await request(app).post('/auth/login').send({
        username: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
    });
  });
});
