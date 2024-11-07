import { expect, test } from '@playwright/test';
import exp = require('constants');

test.use({
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
});

const apiUrl = (url: string) => `http://localhost:3000${url}`;

const testUser = {
  username: 'testuser',
  password: 'testpassword',
};

test.describe('Before Login', () => {
  
  test('login failed with correct password', async ({ page }) => {
    const invalidCredentials = page.getByText(
      'Invalid credentials',
    );
    try {
      await page.goto('/login');
      await page.getByPlaceholder('Username').fill(testUser.username+"juan");
      await page.getByPlaceholder('Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/login');

      await expect(invalidCredentials).toBeVisible();
      await expect(invalidCredentials).toContainText('Invalid credentials');

    } catch (error) {
      await page.screenshot({
        path: `./test-results/layout-elements-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('login failed with short password', async ({ page }) => {
    const shortMessage = page.getByText('String must contain at least');
    try {
      await page.goto('/login');
      await page.getByPlaceholder('Username').fill(testUser.username+"juan");
      await page.getByPlaceholder('Password').fill('123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/login');

      await expect(shortMessage).toBeVisible();
      await expect(shortMessage).toContainText('String must contain at least 8 character(s)');

    } catch (error) {
      await page.screenshot({
        path: `./test-results/layout-elements-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

});

test.describe('Posts Home Screen', () => {
  // Initialize session token for API calls
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login via API to get auth token for cleanup operations
    const loginResponse = await request.post(apiUrl('/auth/login'), {
      data: {
        username: 'testuser',
        password: 'testpassword',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const session = await loginResponse.json();
    authToken = session.token;
  });

  test.beforeEach(async ({ page, request }) => {
    // Clean up existing posts via API
    try {
      const postsResponse = await request.get(apiUrl('/posts'), {
        headers: {
          Authorization: authToken,
        },
      });
      const posts = await postsResponse.json();

      // Delete each post
      for (const post of posts) {
        await request.delete(apiUrl(`/posts/${post.id}`), {
          headers: {
            Authorization: authToken,
          },
        });
      }
    } catch (error) {
      console.error('Failed to cleanup posts:', error);
    }

    // Login via UI
    try {
      await page.goto('/login');
      await page.getByPlaceholder('Username').fill(testUser.username);
      await page.getByPlaceholder('Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/posts');
    } catch (error) {
      await page.screenshot({
        path: `./test-results/login-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('displays correct layout and elements', async ({ page }) => {
    try {
      await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Create Post' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Posts' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    } catch (error) {
      await page.screenshot({
        path: `./test-results/layout-elements-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('shows empty state when no posts exist', async ({ page }) => {
    try {
      const emptyStateText = page.getByText(
        'No posts found. Create your first post!',
      );
      await expect(emptyStateText).toBeVisible();
    } catch (error) {
      await page.screenshot({
        path: `./test-results/empty-state-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('displays posts in correct format', async ({ page }) => {
    try {
      // Create a test post
      await page.getByRole('button', { name: 'Create Post' }).click();
      await page
        .getByPlaceholder('Enter your post title')
        .fill('Test Post Title');
      await page
        .getByPlaceholder('Write your post content here...')
        .fill('Test post content');
      await page.getByRole('button', { name: 'Create Post' }).click();

      // Verify post appears in list
      await expect(
        page.getByRole('heading', { name: 'Test Post Title' }),
      ).toBeVisible();
      await expect(page.getByText('Test post content')).toBeVisible();

      // Check post card elements
      const postCard = page.getByRole('article').first();
      await expect(postCard.locator('.edit-button')).toBeVisible();
      await expect(postCard.locator('.delete-button')).toBeVisible();
      await expect(postCard.getByText(/Created on/)).toBeVisible();
    } catch (error) {
      await page.screenshot({
        path: `./test-results/post-display-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('supports post management actions', async ({ page }) => {
    try {
      await page.getByRole('button', { name: 'Create Post' }).click();
      await expect(page).toHaveURL('/posts/new');

      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page).toHaveURL('/posts');
    } catch (error) {
      await page.screenshot({
        path: `./test-results/post-management-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('navigation works correctly', async ({ page }) => {
    try {
      // Test profile navigation
      await page.getByRole('link', { name: 'Profile' }).click();
      await expect(page).toHaveURL('/profile');

      // Return to posts
      await page.getByRole('link', { name: 'Posts' }).click();
      await expect(page).toHaveURL('/posts');

      // Test logout
      await page.getByRole('button', { name: 'Logout' }).click();
      await expect(page).toHaveURL('/login');
    } catch (error) {
      await page.screenshot({
        path: `./test-results/navigation-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('correct layout and elements for profile', async ({ page }) => {
    try {
      // Test profile navigation
      await page.getByRole('link', { name: 'Profile' }).click();
      await expect(page).toHaveURL('/profile');

      const userText = page.getByText(
        'testuser',
      );
      const userID = page.getByText(
        'User ID',
      );
      const accountStatus = page.getByText(
        'Account Status',
      );
      const favoriteBook = page.getByText(
        'Favorite Book',
      ).first()

      await expect(userText).toBeVisible();
      await expect(userText).toContainText('testuser');

      await expect(accountStatus).toBeVisible();
      await expect(accountStatus).toContainText('Account Status');

      await expect(userID).toBeVisible();
      await expect(userID).toContainText('User ID');

      await expect(favoriteBook).toBeVisible();
      await expect(favoriteBook).toContainText('Favorite Book');
      
      await expect(page.locator('button').nth(1)).toBeVisible();

    } catch (error) {
      await page.screenshot({
        path: `./test-results/navigation-failure-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  // Cleanup after each test (belt and suspenders approach)
  test.afterEach(async ({ request }, testInfo) => {
    // Additional cleanup after each test if needed
    try {
      const postsResponse = await request.get(apiUrl('/posts'), {
        headers: {
          Authorization: authToken,
        },
      });
      const posts = await postsResponse.json();

      for (const post of posts) {
        await request.delete(apiUrl(`/posts/${post.id}`), {
          headers: {
            Authorization: authToken,
          },
        });
      }
    } catch (error) {
      console.error('Failed to cleanup posts after test:', error);
    }

    // Debug information for failed tests
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log(`Test "${testInfo.title}" failed`);
    }
  });

  // Final cleanup and logout
  test.afterAll(async ({ request }) => {
    try {
      // Logout to cleanup session
      await request.post(apiUrl('/auth/logout'), {
        headers: {
          Authorization: authToken,
        },
      });
    } catch (error) {
      console.error('Failed to logout after tests:', error);
    }
  });
});
