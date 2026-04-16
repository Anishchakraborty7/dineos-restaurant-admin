document.addEventListener('DOMContentLoaded', () => {
  if (auth.getToken() && auth.getApiKey()) { window.location.href = 'dashboard.html'; return; }

  const form    = document.getElementById('loginForm');
  const errMsg  = document.getElementById('errorMsg');
  const errTxt  = document.getElementById('errorText');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');
  const togglePw = document.getElementById('togglePassword');
  const pwInput  = document.getElementById('password');

  togglePw?.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    togglePw.textContent = pwInput.type === 'password' ? '👁️' : '🙈';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.style.display = 'none';
    btnText.textContent  = 'Signing in...';
    spinner.style.display = 'inline-block';
    document.getElementById('loginBtn').disabled = true;

    const apiKey   = document.getElementById('apiKey').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!apiKey || !email || !password) {
      errTxt.textContent = 'All fields are required.';
      errMsg.style.display = 'flex';
      btnText.textContent = 'Sign In';
      spinner.style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
      return;
    }

    // Temporarily store API key so api._headers() sends it
    localStorage.setItem(CONFIG.API_KEY_STORE, apiKey);

    try {
      const res = await api.post('/admin/auth/login', { email, password });
      const { token, user, restaurant } = res.data;
      auth.setSession(token, user, restaurant, apiKey);
      toast.success(`Welcome back, ${user.name}!`);
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } catch (err) {
      localStorage.removeItem(CONFIG.API_KEY_STORE);
      errTxt.textContent = err.message || 'Invalid credentials or API key.';
      errMsg.style.display = 'flex';
    } finally {
      btnText.textContent = 'Sign In';
      spinner.style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
    }
  });
});