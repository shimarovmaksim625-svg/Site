import { createSupabaseClient, isSupabaseConfigured } from './supabase-client.js';

const authModal = document.getElementById('account-modal');
const requestModal = document.getElementById('request-modal');
const authForm = document.getElementById('auth-form');
const requestForm = document.getElementById('request-form');
const authGuest = document.getElementById('auth-guest');
const accountView = document.getElementById('account-view');
const authNameField = document.getElementById('auth-name-field');
const authName = document.getElementById('auth-name');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authMessage = document.getElementById('auth-message');
const authConfigWarning = document.getElementById('auth-config-warning');
const authSubmit = document.getElementById('auth-submit');
const accountEmail = document.getElementById('account-email');
const requestList = document.getElementById('request-list');
const requestListMessage = document.getElementById('request-list-message');
const requestMessage = document.getElementById('request-message');
const requestSubmit = requestForm.querySelector('[type="submit"]');
const formWrap = document.getElementById('modal-form-wrap');
const formSuccess = document.getElementById('form-success');

let authMode = 'login';
let session = null;
let requestAfterAuth = false;
let backendReady = false;
let supabase = null;

const setMessage = (element, message, state = 'error') => {
  element.textContent = message;
  element.dataset.state = state;
  element.hidden = !message;
};

const showDialog = (dialog) => {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
};

const closeDialog = (dialog) => {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
};

const setAuthMode = (mode) => {
  authMode = mode;
  const isSignup = mode === 'signup';
  authNameField.hidden = !isSignup;
  authName.required = isSignup;
  authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
  authSubmit.textContent = isSignup ? 'Создать аккаунт' : 'Войти';
  setMessage(authMessage, '');

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('btn--primary', active);
    button.classList.toggle('btn--ghost', !active);
  });
};

const formatDate = (value) => new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value));

const serviceLabels = {
  placement: 'Размещение материалов',
  video: 'Видеоролик',
  analytics: 'Аналитика и мониторинг',
  complex: 'Комплексная кампания',
  other: 'Другое'
};

const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Завершена',
  cancelled: 'Отменена'
};

const renderRequests = (requests) => {
  requestList.replaceChildren();

  if (!requests.length) {
    setMessage(requestListMessage, 'У вас пока нет заявок.', 'info');
    return;
  }

  setMessage(requestListMessage, '', 'info');
  requests.forEach((request) => {
    const item = document.createElement('li');
    const heading = document.createElement('strong');
    const details = document.createElement('span');
    const date = document.createElement('time');

    heading.textContent = request.name;
    details.textContent =
      `${serviceLabels[request.service] || request.service} · ${statusLabels[request.status] || request.status}`;
    date.dateTime = request.created_at;
    date.textContent = formatDate(request.created_at);
    item.append(heading, details, date);
    requestList.append(item);
  });
};

const loadRequests = async () => {
  if (!supabase || !session) return;

  setMessage(requestListMessage, 'Загружаем заявки…', 'info');
  const { data, error } = await supabase
    .from('requests')
    .select('name, service, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load user requests:', error);
    setMessage(requestListMessage, 'Не удалось загрузить заявки. Попробуйте позже.');
    return;
  }

  renderRequests(data);
};

const updateSession = (nextSession) => {
  session = nextSession;
  const signedIn = Boolean(session);
  authGuest.hidden = signedIn;
  accountView.hidden = !signedIn;

  if (!signedIn) return;

  accountEmail.textContent = session.user.email || 'Вход выполнен';
  void loadRequests();

  if (requestAfterAuth) {
    requestAfterAuth = false;
    closeDialog(authModal);
    openRequestModal();
  }
};

const openAccountModal = () => {
  setMessage(authMessage, '');
  authConfigWarning.hidden = backendReady;
  if (!isSupabaseConfigured) {
    authConfigWarning.textContent =
      'Подключение не настроено. Заполните URL проекта и публичный ключ в assets/supabase-config.js.';
  } else if (!backendReady) {
    authConfigWarning.textContent =
      'Сервис авторизации недоступен. Проверьте подключение к интернету и настройки проекта.';
  }

  if (session) {
    authGuest.hidden = true;
    accountView.hidden = false;
    accountEmail.textContent = session.user.email || 'Вход выполнен';
    void loadRequests();
  } else {
    authGuest.hidden = false;
    accountView.hidden = true;
    setAuthMode(authMode);
  }

  showDialog(authModal);
};

const openRequestModal = () => {
  requestForm.reset();
  setMessage(requestMessage, '');
  formWrap.hidden = false;
  formSuccess.hidden = true;
  showDialog(requestModal);
  document.body.classList.add('modal-open');
};

document.querySelectorAll('[data-auth-mode]').forEach((button) => {
  button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

document.querySelectorAll('[data-open-account]').forEach((button) => {
  button.addEventListener('click', openAccountModal);
});

document.querySelectorAll('[data-close-account]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(authModal));
});

authModal.addEventListener('click', (event) => {
  if (event.target === authModal) closeDialog(authModal);
});

authModal.addEventListener('close', () => {
  if (!session) requestAfterAuth = false;
});

document.querySelectorAll('[data-open-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    if (backendReady && session) {
      openRequestModal();
      return;
    }

    requestAfterAuth = backendReady;
    openAccountModal();
    if (backendReady) {
      setMessage(authMessage, 'Войдите или создайте аккаунт, чтобы оставить заявку.', 'info');
    }
  });
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(requestModal));
});

requestModal.addEventListener('click', (event) => {
  if (event.target === requestModal) closeDialog(requestModal);
});

requestModal.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!backendReady) {
    setMessage(authMessage, 'Сначала настройте подключение к базе данных.');
    return;
  }
  if (!authForm.reportValidity()) return;

  authSubmit.disabled = true;
  setMessage(authMessage, authMode === 'signup' ? 'Создаём аккаунт…' : 'Выполняем вход…', 'info');

  try {
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({
          email: authEmail.value.trim(),
          password: authPassword.value,
          options: { data: { full_name: authName.value.trim() } }
        })
      : await supabase.auth.signInWithPassword({
          email: authEmail.value.trim(),
          password: authPassword.value
        });

    if (result.error) throw result.error;

    if (authMode === 'signup' && !result.data.session) {
      setMessage(authMessage, 'Проверьте почту и подтвердите адрес, затем войдите.', 'success');
      authForm.reset();
      return;
    }

    setMessage(authMessage, authMode === 'signup' ? 'Аккаунт создан.' : 'Вход выполнен.', 'success');
    updateSession(result.data.session);
  } catch (error) {
    console.error('Authentication failed:', error);
    setMessage(authMessage, error.message || 'Не удалось выполнить запрос. Попробуйте ещё раз.');
  } finally {
    authSubmit.disabled = false;
  }
});

document.getElementById('sign-out').addEventListener('click', async () => {
  if (!supabase) return;

  const signOutButton = document.getElementById('sign-out');
  signOutButton.disabled = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    updateSession(null);
    setAuthMode('login');
    authForm.reset();
    setMessage(authMessage, 'Вы вышли из аккаунта.', 'success');
  } catch (error) {
    console.error('Sign out failed:', error);
    setMessage(requestListMessage, 'Не удалось выйти из аккаунта. Попробуйте ещё раз.');
  } finally {
    signOutButton.disabled = false;
  }
});

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requestForm.reportValidity()) return;

  if (!backendReady || !supabase || !session) {
    setMessage(requestMessage, 'Сервис базы данных не настроен или вход в аккаунт завершён.');
    return;
  }

  const values = new FormData(requestForm);
  const request = {
    name: String(values.get('name')).trim(),
    contact: String(values.get('contact')).trim(),
    company: String(values.get('company') || '').trim(),
    service: String(values.get('service')),
    message: String(values.get('message') || '').trim(),
    consent_given: values.get('consent') === 'on'
  };

  if (!request.name || !request.contact || !request.consent_given) {
    setMessage(requestMessage, 'Укажите имя и контакт и подтвердите согласие на обработку данных.');
    return;
  }

  requestSubmit.disabled = true;
  setMessage(requestMessage, 'Отправляем заявку…', 'info');

  try {
    const { error } = await supabase.from('requests').insert(request);
    if (error) throw error;

    formWrap.hidden = true;
    formSuccess.hidden = false;
    requestModal.scrollTop = 0;
    void loadRequests();
  } catch (error) {
    console.error('Request submission failed:', error);
    setMessage(requestMessage, error.message || 'Не удалось отправить заявку. Попробуйте ещё раз.');
  } finally {
    requestSubmit.disabled = false;
  }
});

const initializeBackend = async () => {
  if (!isSupabaseConfigured) return;

  try {
    supabase = await createSupabaseClient();
    backendReady = Boolean(supabase);
    if (!backendReady) return;

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => updateSession(nextSession), 0);
    });

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    updateSession(data.session);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    authConfigWarning.textContent =
      'Не удалось подключиться к Supabase. Проверьте URL, ключ и доступность сервиса.';
    authConfigWarning.hidden = false;
  }
};

void initializeBackend();
setAuthMode('login');
