const BASE_URL = 'http://localhost:3000/api/auth';

async function test() {
  // Login
  const login = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '058-999-1111', password: 'TestPass123!' })
  });

  const setCookieHeader = login.headers.get('set-cookie');
  console.log('Login Set-Cookie:', setCookieHeader);
  
  if (!setCookieHeader) {
    console.log('No cookie set!');
    return;
  }

  // Extract refresh token from cookie
  const match = setCookieHeader.match(/refresh_token=([^;]+)/);
  const refreshToken = match ? match[1] : null;
  console.log('Extracted token:', refreshToken ? 'Yes' : 'No');

  // Try refresh with cookie
  const refresh = await fetch(`${BASE_URL}/refresh`, {
    method: 'POST',
    headers: {
      'Cookie': `refresh_token=${refreshToken}`
    }
  });

  console.log('Refresh status:', refresh.status);
  const refreshData = await refresh.json();
  console.log('Refresh response:', refreshData);
}

test();
