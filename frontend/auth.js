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
const API_BASE_URL = '/api/auth';

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
  // Setup custom country selector dropdown
  setupCountrySelector();

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
 * Setup custom country selector with dropdown
 */
function setupCountrySelector() {
  const countrySelector = document.getElementById('countrySelector');
  const countryDropdown = document.getElementById('countryDropdown');
  const phoneInput = document.getElementById('phoneInput');
  const phonePrefix = document.getElementById('phonePrefix');
  const selectedFlag = document.getElementById('selectedFlag');
  const selectedCode = document.getElementById('selectedCode');

  if (!countrySelector || !countryDropdown || !phoneInput || !phonePrefix) {
    return;
  }

  // --- TOGGLE DROPDOWN ---
  countrySelector.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    countryDropdown.classList.toggle('hidden');
  });

  // --- SELECT COUNTRY ---
	const countryOptions = countryDropdown.querySelectorAll('.country-option');

	countryOptions.forEach(option => {
	  option.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();

		const flagSrc = option.dataset.flagSrc;
		const code = option.dataset.code;
		const prefix = option.dataset.prefix;

		// Update UI: selectedFlag is now an <img>, not a text/span emoji
		if (selectedFlag) {
		  selectedFlag.src = flagSrc;
		  selectedFlag.alt = code;
		}

		if (selectedCode) {
		  selectedCode.textContent = code;
		}

		phonePrefix.textContent = prefix;

		// Store state
		if (window.authState) {
		  authState.countryCode = prefix;
		}

		// Reset input
		phoneInput.value = '';

		// Close dropdown
		countryDropdown.classList.add('hidden');

		// Focus input for better UX
		phoneInput.focus();
	  });
	});

  // --- CLICK OUTSIDE CLOSE ---
  document.addEventListener('click', (e) => {
    const isClickInsideSelector = countrySelector.contains(e.target);
    const isClickInsideDropdown = countryDropdown.contains(e.target);

    if (!isClickInsideSelector && !isClickInsideDropdown) {
      countryDropdown.classList.add('hidden');
    }
  });

  // --- DIGITS ONLY INPUT ---
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });

  // --- PREVENT SCROLL JUMP ON MOBILE ---
  phoneInput.addEventListener('focus', () => {
    setTimeout(() => {
      phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  });

  // --- DEFAULT STATE ---
  if (window.authState) {
    authState.countryCode = '+972';
  }

  if (phonePrefix) {
    phonePrefix.textContent = '+972';
  }

  if (selectedFlag) {
    selectedFlag.src = 'https://flagcdn.com/w40/il.png';
    selectedFlag.alt = 'IL';
  }

  if (selectedCode) {
    selectedCode.textContent = 'IL';
  }
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
 * Redirect to smart dashboard after successful auth
 */
function showMainApp() {
  // Redirect to dashboard (handles resume/empty/sport selection logic)
  window.location.href = '/dashboard.html';
}

/**
 * Step 1: Send OTP to phone number
 */
async function sendOTP() {
  const phoneInput = document.getElementById('phoneInput');
  const phone = phoneInput.value.trim();
  const countryCode = authState.countryCode || '+972';

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
    const countryCode = authState.countryCode || '+972';

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
    const countryCode = authState.countryCode || '+972';

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
    const countryCode = authState.countryCode || '+972';

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
