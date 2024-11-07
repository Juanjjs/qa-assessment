import axios from 'axios';
import { Post, Session } from '@qa-assessment/shared';
import { expect, test } from '@playwright/test';
import exp = require('constants');

describe('Posts API', () => {
  let authToken: string;
  let userId: string;
  let postId: string;

  beforeAll(async () => {
    // Register a test user
    const username = `testuser_${Math.random().toString(36).substring(7)}`;
    const password = 'password123';

    const registerResponse = await axios.post<Session>('/users', {
      username,
      password,
    });

    expect(registerResponse.status).toBe(200);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.userId;

    // Configure axios to use the auth token for subsequent requests
    axios.defaults.headers.common['Authorization'] = authToken;
  });

  afterAll(() => {
    // Clean up axios headers
    delete axios.defaults.headers.common['Authorization'];
  });

  describe('POST /posts', () => {
    it('should create a new post successfully', async () => {
      // Prepare test data
      const postData = {
        title: 'Test Post Title',
        content: 'This is a test post content.',
      };

      // Create post
      const createResponse = await axios.post<Post>('/posts', postData);

      // Verify response status
      expect(createResponse.status).toBe(201);

      // Verify response data
      const createdPost = createResponse.data;
      expect(createdPost).toMatchObject({
        title: postData.title,
        content: postData.content,
        authorId: userId,
      });

      // Verify post properties
      expect(createdPost.id).toBeDefined();
      expect(createdPost.createdAt).toBeDefined();
      expect(createdPost.updatedAt).toBeDefined();

      // Verify we can fetch the created post
      const getResponse = await axios.get<Post>(`/posts/${createdPost.id}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data).toEqual(createdPost);
    });

    it('should reject post creation with invalid data', async () => {
      // Test with empty title
      const invalidPost = {
        title: '',
        content: 'Test content',
      };

      try {
        await axios.post('/posts', invalidPost);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.errors).toBeDefined();
      }
    });

    it('should reject unauthorized post creation', async () => {
      // Remove auth token
      delete axios.defaults.headers.common['Authorization'];

      try {
        await axios.post('/posts', {
          title: 'Unauthorized Post',
          content: 'This should fail',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Restore auth token for subsequent tests
      axios.defaults.headers.common['Authorization'] = authToken;
    });

    it('should delete a post successfully', async () => {
      const deleteResponse = await axios.delete(`/posts/${postId}`);
      expect(deleteResponse.status).toBe(200);

      try {
        await axios.get(`/posts/${postId}`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should allow updates post', async () => {
      // Create a post
      const postData = {
        title: 'Initial Title',
        content: 'Initial content',
      };
      const createResponse = await axios.post<Post>('/posts', postData);
      expect(createResponse.status).toBe(201);

      const createdPost = createResponse.data;
      postId = createdPost.id;

      // Update the post
      const updatedData = {
        title: 'New Title by Juan',
        content: 'New content by Juan',
      };
      const updateResponse = await axios.put<Post>(`/posts/${postId}`, updatedData);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data).toMatchObject(updatedData);
    });

    it('should reject update on non-existent post', async () => {
      try {
        await axios.put('/posts/nonexistent', {
          title: 'Should fail',
          content: 'This should not work',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        // Using 422 for invalid update attempt on non-existent resource
        expect(error.response.status).toBe(404);
      }
    });
  });
});
