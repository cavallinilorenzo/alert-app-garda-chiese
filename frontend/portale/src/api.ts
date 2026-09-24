import { api } from 'shared/api';

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

api.use({
  onRequest: ({ request }) => {
    const token = getAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  onResponse: async ({ response, request }) => {
    if (response.status === 401) {
      const refresh = getRefreshToken();
      if (refresh && !request.url.includes('/auth/token')) {
        const res = await fetch('/api/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh })
        });
        if (res.ok) {
          const data = await res.json();
          setTokens(data.access, data.refresh || refresh);
          // Retry original request
          const retryRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body
          });
          retryRequest.headers.set('Authorization', `Bearer ${data.access}`);
          return fetch(retryRequest);
        } else {
          clearTokens();
          window.dispatchEvent(new Event('auth-logout'));
        }
      } else {
        clearTokens();
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return response;
  }
});

export { api };
