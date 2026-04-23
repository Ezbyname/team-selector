/**
 * Authentication Module
 * Handles user authentication flow with backend API
 *
 * Flow:
 * 1. Phone entry → Send OTP
 * 2. OTP verification → New user: Register | Existing user: Login
 * 3. Session management (access token + refresh token)
 * 4. Auto-refresh on token expiration
 */

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api/auth'
  : '/api/auth';

// Auth State
const authState = {
  phone: null,
  phoneNormalized: null,
  otpSent: false,
  otpVerified: false,
  isNewUser: null,
  accessToken: null,
  user: null,
  refreshTimeout: null
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

/**
 * Initialize authentication system
 * Check for existing session and setup token refresh
 */
async function initAuth() {
  // Setup country selector listener
  const countrySelect = document.getElementById('countrySelect');
  if (countrySelect) {
    countrySelect.addEventListener('change', updatePhonePlaceholder);
    updatePhonePlaceholder(); // Set initial placeholder
  }

  // Check if user is already authenticated
  const savedToken = localStorage.getItem('accessToken');
  const savedUser = localStorage.getItem('user');

  if (savedToken && savedUser) {
    authState.accessToken = savedToken;
    authState.user = JSON.parse(savedUser);

    // Try to refresh token to ensure it's valid
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      // User is authenticated, show main app
      showMainApp();
      scheduleTokenRefresh();
    } else {
      // Token expired and refresh failed, show login
      clearAuthState();
      showAuthScreen('phone');
    }
  } else {
    // No existing session, show auth screen
    showAuthScreen('phone');
  }
}

/**
 * Update phone input placeholder based on selected country
 */
function updatePhonePlaceholder() {
  const countrySelect = document.getElementById('countrySelect');
  const phoneInput = document.getElementById('phoneInput');
  const phoneHint = document.getElementById('phoneHint');

  if (!countrySelect || !phoneInput) return;

  const country = countrySelect.value;

  // Country-specific placeholders and hints
  const countryInfo = {
    '+972': { placeholder: '501234567', hint: '10 digits (e.g., 0501234567)' },
    '+1': { placeholder: '2025551234', hint: '10 digits (e.g., 2025551234)' },
    '+44': { placeholder: '7400123456', hint: '10 digits (e.g., 07400123456)' },
    '+49': { placeholder: '1512345678', hint: '10-11 digits' },
    '+33': { placeholder: '612345678', hint: '9 digits (e.g., 0612345678)' },
    '+39': { placeholder: '3123456789', hint: '10 digits' },
    '+34': { placeholder: '612345678', hint: '9 digits' },
    '+31': { placeholder: '612345678', hint: '9 digits (e.g., 0612345678)' },
    '+32': { placeholder: '471234567', hint: '9 digits (e.g., 0471234567)' },
    '+41': { placeholder: '791234567', hint: '9 digits (e.g., 0791234567)' },
    '+43': { placeholder: '6641234567', hint: '10-11 digits (e.g., 06641234567)' },
    '+45': { placeholder: '12345678', hint: '8 digits' },
    '+46': { placeholder: '701234567', hint: '9 digits (e.g., 0701234567)' },
    '+47': { placeholder: '40612345', hint: '8 digits' },
    '+48': { placeholder: '501234567', hint: '9 digits' },
    '+61': { placeholder: '412345678', hint: '9 digits (e.g., 0412345678)' },
    '+81': { placeholder: '9012345678', hint: '10 digits (e.g., 09012345678)' },
    '+82': { placeholder: '1012345678', hint: '9-10 digits (e.g., 01012345678)' },
    '+86': { placeholder: '13812345678', hint: '11 digits' },
    '+91': { placeholder: '9876543210', hint: '10 digits' },
    '+351': { placeholder: '912345678', hint: '9 digits' },
    '+358': { placeholder: '412345678', hint: '9 digits (e.g., 0412345678)' },
    '+7': { placeholder: '9161234567', hint: '10 digits' },
  };

  const info = countryInfo[country] || { placeholder: '123456789', hint: 'Enter phone number' };
  phoneInput.placeholder = info.placeholder;
  if (phoneHint) phoneHint.textContent = info.hint;

  // Clear input when country changes
  phoneInput.value = '';
}

/**
 * Show authentication screen
 * @param {string} screen - 'phone', 'otp', 'register', or 'login'
 */
function showAuthScreen(screen) {
  // Hide all auth screens
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));

  // Show requested screen
  const screenElement = document.getElementById(`${screen}Screen`);
  if (screenElement) {
    screenElement.classList.add('active');
  }

  // Hide main app
  document.getElementById('mainContainer').style.display = 'none';

  // Hide user menu
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.style.display = 'none';
  }

  // Hide header when showing auth
  const header = document.getElementById('header');
  if (header) {
    header.style.display = 'none';
  }

  // Show auth container
  const authContainer = document.getElementById('authContainer');
  if (authContainer) {
    authContainer.style.display = 'flex';
  }
}

/**
 * Show main application (after successful auth)
 */
function showMainApp() {
  // Hide auth container
  const authContainer = document.getElementById('authContainer');
  if (authContainer) {
    authContainer.style.display = 'none';
  }

  // Show main app
  document.getElementById('mainContainer').style.display = 'block';

  // Show user menu
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.style.display = 'block';
  }

  // Update user display
  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay && authState.user) {
    userDisplay.textContent = authState.user.displayName || authState.user.phone;
  }

  // Show header
  const header = document.getElementById('header');
  if (header) {
    header.style.display = 'flex';
  }
}

/**
 * Step 1: Send OTP to phone number
 */
async function sendOTP() {
  const phoneInput = document.getElementById('phoneInput');
  const countrySelect = document.getElementById('countrySelect');
  const phone = phoneInput.value.trim();
  const countryCode = countrySelect ? countrySelect.value : '+972';

  if (!phone) {
    showError('phoneScreen', 'Please enter phone number');
    return;
  }

  // Validate digits only
  if (!/^\d+$/.test(phone)) {
    showError('phoneScreen', 'Phone number must contain only digits (no dashes or spaces)');
    return;
  }

  // Validate minimum length (most countries are 8-11 digits)
  if (phone.length < 8 || phone.length > 12) {
    showError('phoneScreen', 'Phone number must be between 8 and 12 digits');
    return;
  }

  setLoading('phoneScreen', true);
  clearError('phoneScreen');

  try {
    const response = await fetch(`${API_BASE_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, countryCode })
    });

    const data = await response.json();

    if (response.ok) {
      authState.phone = phone;
      authState.otpSent = true;

      // Show OTP screen
      showAuthScreen('otp');

      // Pre-fill phone display
      document.getElementById('otpPhoneDisplay').textContent = phone;

      // In development mode, auto-fill OTP if provided
      const otpInput = document.getElementById('otpInput');
      if (data.otpCode) {
        otpInput.value = data.otpCode;
        console.log('🔐 Development mode: OTP auto-filled:', data.otpCode);
      }

      // Focus OTP input
      otpInput.focus();

    } else {
      showError('phoneScreen', data.error || 'Failed to send OTP');
    }
  } catch (error) {
    showError('phoneScreen', 'Network error. Please try again.');
  } finally {
    setLoading('phoneScreen', false);
  }
}

/**
 * Step 2: Verify OTP code
 */
async function verifyOTP() {
  const otpInput = document.getElementById('otpInput');
  const otpCode = otpInput.value.trim();

  if (!otpCode || otpCode.length !== 6) {
    showError('otpScreen', 'Please enter 6-digit code');
    return;
  }

  setLoading('otpScreen', true);
  clearError('otpScreen');

  try {
    const countrySelect = document.getElementById('countrySelect');
    const countryCode = countrySelect ? countrySelect.value : '+972';

    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: authState.phone,
        code: otpCode,
        countryCode
      })
    });

    const data = await response.json();

    if (response.ok) {
      authState.phoneNormalized = data.phoneNormalized;
      authState.otpVerified = true;

      // Check if user exists by attempting login without password
      // If user doesn't exist, backend will return 401
      const loginCheck = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: authState.phone,
          password: '__CHECK_USER_EXISTS__'
        })
      });

      if (loginCheck.status === 401) {
        const loginData = await loginCheck.json();
        if (loginData.error && loginData.error.includes('Invalid credentials')) {
          // User exists but wrong password - show login screen
          authState.isNewUser = false;
          showAuthScreen('login');
          document.getElementById('loginPhoneDisplay').textContent = authState.phone;
        } else {
          // User doesn't exist - show register screen
          authState.isNewUser = true;
          showAuthScreen('register');
          document.getElementById('registerPhoneDisplay').textContent = authState.phone;
        }
      } else {
        // Some other response - assume new user
        authState.isNewUser = true;
        showAuthScreen('register');
        document.getElementById('registerPhoneDisplay').textContent = authState.phone;
      }

    } else {
      showError('otpScreen', data.error || 'Invalid OTP code');
    }
  } catch (error) {
    showError('otpScreen', 'Network error. Please try again.');
  } finally {
    setLoading('otpScreen', false);
  }
}

/**
 * Step 3a: Register new user
 */
async function registerUser() {
  const displayName = document.getElementById('registerNameInput').value.trim();
  const password = document.getElementById('registerPasswordInput').value;
  const confirmPassword = document.getElementById('registerConfirmPasswordInput').value;

  // Validation
  if (!displayName) {
    showError('registerScreen', 'Please enter your name');
    return;
  }

  if (!password || password.length < 8) {
    showError('registerScreen', 'Password must be at least 8 characters');
    return;
  }

  if (password !== confirmPassword) {
    showError('registerScreen', 'Passwords do not match');
    return;
  }

  setLoading('registerScreen', true);
  clearError('registerScreen');

  try {
    const countrySelect = document.getElementById('countrySelect');
    const countryCode = countrySelect ? countrySelect.value : '+972';

    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({
        phone: authState.phone,
        password,
        displayName,
        countryCode
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Save auth state
      authState.accessToken = data.accessToken;
      authState.user = data.user;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Setup token refresh
      scheduleTokenRefresh();

      // Show main app
      showMainApp();

    } else {
      showError('registerScreen', data.error || 'Registration failed');
    }
  } catch (error) {
    showError('registerScreen', 'Network error. Please try again.');
  } finally {
    setLoading('registerScreen', false);
  }
}

/**
 * Step 3b: Login existing user
 */
async function loginUser() {
  const password = document.getElementById('loginPasswordInput').value;

  if (!password) {
    showError('loginScreen', 'Please enter your password');
    return;
  }

  setLoading('loginScreen', true);
  clearError('loginScreen');

  try {
    const countrySelect = document.getElementById('countrySelect');
    const countryCode = countrySelect ? countrySelect.value : '+972';

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({
        phone: authState.phone,
        password,
        countryCode
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Save auth state
      authState.accessToken = data.accessToken;
      authState.user = data.user;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Setup token refresh
      scheduleTokenRefresh();

      // Show main app
      showMainApp();

    } else {
      showError('loginScreen', data.error || 'Login failed');
    }
  } catch (error) {
    showError('loginScreen', 'Network error. Please try again.');
  } finally {
    setLoading('loginScreen', false);
  }
}

/**
 * Logout user
 */
async function logout() {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  clearAuthState();
  showAuthScreen('phone');
}

/**
 * Clear authentication state
 */
function clearAuthState() {
  authState.phone = null;
  authState.phoneNormalized = null;
  authState.otpSent = false;
  authState.otpVerified = false;
  authState.isNewUser = null;
  authState.accessToken = null;
  authState.user = null;

  if (authState.refreshTimeout) {
    clearTimeout(authState.refreshTimeout);
    authState.refreshTimeout = null;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}

/**
 * Try to refresh access token using refresh token cookie
 * @returns {boolean} Success status
 */
async function tryRefreshToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      authState.accessToken = data.accessToken;
      authState.user = data.user;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Schedule automatic token refresh
 * Refresh 1 minute before expiration (tokens expire in 15 min)
 */
function scheduleTokenRefresh() {
  if (authState.refreshTimeout) {
    clearTimeout(authState.refreshTimeout);
  }

  // Refresh after 14 minutes (1 min before expiration)
  authState.refreshTimeout = setTimeout(async () => {
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      scheduleTokenRefresh(); // Schedule next refresh
    } else {
      // Refresh failed, logout user
      clearAuthState();
      showAuthScreen('phone');
    }
  }, 14 * 60 * 1000); // 14 minutes
}

/**
 * Make authenticated API request
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function authenticatedFetch(url, options = {}) {
  options.headers = options.headers || {};

  if (authState.accessToken) {
    options.headers['Authorization'] = `Bearer ${authState.accessToken}`;
  }

  const response = await fetch(url, options);

  // If 401 Unauthorized, try to refresh token
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      // Retry request with new token
      options.headers['Authorization'] = `Bearer ${authState.accessToken}`;
      return fetch(url, options);
    } else {
      // Refresh failed, logout
      clearAuthState();
      showAuthScreen('phone');
      throw new Error('Session expired');
    }
  }

  return response;
}

/**
 * UI Helper: Show loading state
 */
function setLoading(screenId, isLoading) {
  const screen = document.getElementById(screenId);
  if (!screen) return;

  const button = screen.querySelector('button[type="submit"], .primary-btn');
  if (button) {
    // Save original text BEFORE changing it
    if (!button.dataset.originalText && !isLoading) {
      // If we're clearing loading and originalText is missing, don't restore
      button.disabled = false;
      return;
    }

    if (isLoading && !button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = isLoading;
    button.textContent = isLoading ? 'Loading...' : button.dataset.originalText;

    // Clear saved text after restoring
    if (!isLoading) {
      delete button.dataset.originalText;
    }
  }

  const inputs = screen.querySelectorAll('input');
  inputs.forEach(input => input.disabled = isLoading);
}

/**
 * UI Helper: Show error message
 */
function showError(screenId, message) {
  const screen = document.getElementById(screenId);
  if (!screen) return;

  let errorDiv = screen.querySelector('.error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    const form = screen.querySelector('.auth-form');
    if (form) {
      form.insertBefore(errorDiv, form.firstChild);
    }
  }

  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

/**
 * UI Helper: Clear error message
 */
function clearError(screenId) {
  const screen = document.getElementById(screenId);
  if (!screen) return;

  const errorDiv = screen.querySelector('.error-message');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// Export for use in main app
window.auth = {
  sendOTP,
  verifyOTP,
  registerUser,
  loginUser,
  logout,
  authenticatedFetch,
  showAuthScreen,
  getUser: () => authState.user,
  isAuthenticated: () => !!authState.accessToken
};
