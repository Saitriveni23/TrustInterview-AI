import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        
        // Store authentication data compatible with TrustInterview-AI's auth system
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('zta_token', token);
        sessionStorage.setItem('ztaToken', token);
        sessionStorage.setItem('ztaRole', 'candidate');
        sessionStorage.setItem('ztaIssuedAt', Date.now().toString());
        sessionStorage.setItem('googleUser', JSON.stringify(user));
        sessionStorage.setItem('candidateEmail', user.email);
        sessionStorage.setItem('candidateName', user.name);
        
        console.log('[Google Auth] User authenticated:', user.email);
        
        // Redirect to upload page (protected route)
        navigate('/', { replace: true });
      } catch (error) {
        console.error('[Google Auth] Failed to parse user data:', error);
        navigate('/login', { replace: true });
      }
    } else {
      console.error('[Google Auth] Missing token or user data');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.loader}>
        <div style={styles.spinner} />
        <p style={styles.text}>Completing authentication...</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  loader: {
    textAlign: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid rgba(139, 92, 246, 0.1)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  text: {
    color: 'var(--text-muted)',
    fontSize: 14,
  },
};
