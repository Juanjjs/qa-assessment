import { render } from '@testing-library/react';
import { useStorage } from '../hooks';
import { useNavigate } from 'react-router-dom';
import Root from './root';
import { describe, expect, it, vi } from 'vitest';
import { Mock } from '@vitest/spy';

vi.mock('../hooks', () => ({
  useStorage: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

describe('Root Component', () => {
  const mockNavigate = vi.fn();
  const mockStorage = {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useNavigate as Mock).mockReturnValue(mockNavigate);
    (useStorage as Mock).mockReturnValue(mockStorage);
  });

  it('should redirect to /login when no session exists', () => {
    mockStorage.get.mockReturnValue(null);
    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledWith('session');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockNavigate).not.toHaveBeenCalledWith('/posts');
  });

  it('Should display index.html content for unknown routes', () => {
    mockStorage.get.mockReturnValue(null);
    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledWith('session');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockNavigate).not.toHaveBeenCalledWith('/profile');
  });

  it('Should not redirect to /posts/new', () => {
    mockStorage.get.mockReturnValue(null);
    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledWith('session');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockNavigate).not.toHaveBeenCalledWith('/posts/new');
  });

  it('Should redirect to /posts/new', () => {
    mockStorage.get.mockReturnValue('redirect-post');
    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledWith('session');
    expect(mockNavigate).toHaveBeenCalledWith('/posts/new');
    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });

  it('Should redirect to /signup', () => {
    mockStorage.get.mockReturnValue('redirect-signup');
    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledWith('session');
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });

  it('should redirect to /posts when session exists', () => {
    mockStorage.get.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        userId: '123',
      }),
    );

    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledWith('session');
    expect(mockNavigate).toHaveBeenCalledWith('/posts');
    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });

  it('should check session only once on initial render', () => {
    mockStorage.get.mockReturnValue(null);
    render(<Root />);

    expect(mockStorage.get).toHaveBeenCalledTimes(1);
  });

  it('should display loading text while redirecting', () => {
    mockStorage.get.mockReturnValue(null);
    const { container } = render(<Root />);

    expect(container.textContent).toBe('Redirecting you...');
  });

  it('should handle malformed session data gracefully', () => {
    mockStorage.get.mockReturnValue('invalid-json');
    render(<Root />);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
