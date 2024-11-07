import { useStorage } from '../hooks';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { validJson } from '../lib';

export function Root() {
  const storage = useStorage();
  const navigate = useNavigate();

  useEffect(() => {
    const session = storage.get('session');
    
    if (session === 'redirect-signup') {
      navigate('/signup');
    }
    else if (session === 'redirect-post') {
      navigate('/posts/new');
    }
    else if (!session || !validJson(session)) {
      navigate('/login');
    } else {
      navigate('/posts');
    }
  }, []);

  return <>Redirecting you...</>;
}

export default Root;
