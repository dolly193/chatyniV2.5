// --- Configuração Global ---
const API_URL = ''; // Deixe em branco, o servidor servirá a API na mesma URL
const socket = io(window.location.origin, { autoConnect: false, auth: {} });

const startButton = document.getElementById('startButton');
const mainContent = document.getElementById('mainContent');
const progressContainer = document.getElementById('progressContainer');
const sidebar = document.getElementById('sidebar');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const connectionStatus = document.getElementById('connection-status');
const statusText = connectionStatus.querySelector('.status-text');

// Painéis de Conteúdo
const allPanels = document.querySelectorAll('.content-panel');

// Formulários de Autenticação
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const showRecover = document.getElementById('showRecover');
const backToLogin = document.getElementById('backToLogin');
const recoverForm = document.getElementById('recoverForm');
const userTableBody = document.getElementById('user-table-body');
const robloxUsernameForm = document.getElementById('robloxUsernameForm');
const robloxUsernameInput = document.getElementById('robloxUsernameInput');
const robloxLoginView = document.getElementById('roblox-login-view');
const chatView = document.getElementById('chat-view');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

// Elementos de Configurações
const profilePic = document.getElementById('profilePic');
const profilePicInput = document.getElementById('profilePicInput');
const changePicBtn = document.querySelector('.change-pic-btn');
const signupUsername = document.getElementById('signupUsername');
const signupEmail = document.getElementById('signupEmail');
const welcomeUsername = document.getElementById('welcomeUsername');
const usernameChangeInput = document.getElementById('username-change');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const newPassword = document.getElementById('newPassword');
const confirmNewPassword = document.getElementById('confirmNewPassword');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const reactivateAccountBtn = document.getElementById('reactivateAccountBtn');

// Itens de Navegação da Sidebar
const navLogin = document.getElementById('nav-login');
const navStory = document.getElementById('nav-story');
const navSettings = document.getElementById('nav-settings');
const navLogout = document.getElementById('nav-logout');
const navAdmin = document.getElementById('nav-admin');

// --- Gerenciamento de Estado ---
let isLoggedIn = false;
let currentUsername = '';
let isAdmin = false;
let currentUser = null; // Armazena o objeto completo do usuário logado

// --- Internacionalização (i18n) e Temas ---

const translations = {
    en: {
        navLogin: 'Login',
        navStory: 'Story',
        navSettings: 'Settings',
        navAdmin: 'Admin Panel',
        navLogout: 'Logout',
        settingsAppearanceTitle: 'Appearance',
        settingsTheme: 'Dark Mode',
        settingsLanguage: 'Language',
        settingsProfileChange: 'Change',
        // Adicione mais chaves de tradução para o inglês aqui
    },
    pt: {
        navLogin: 'Login',
        navStory: 'História',
        navSettings: 'Configurações',
        navAdmin: 'Painel Admin',
        navLogout: 'Sair',
        settingsAppearanceTitle: 'Aparência',
        settingsTheme: 'Modo Escuro',
        settingsLanguage: 'Idioma',
        settingsProfileChange: 'Alterar',
        // Adicione mais chaves de tradução para o português aqui
    }
};

function applyTranslations(lang = 'pt') {
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = translations[lang][key];
        if (translation) {
            if (el.placeholder !== undefined && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });
}

function setLanguage(lang) {
    localStorage.setItem('chatyni_language', lang);
    document.documentElement.lang = lang;
    applyTranslations(lang);
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) languageSelector.value = lang;
}

function setTheme(theme) {
    localStorage.setItem('chatyni_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.checked = theme === 'dark';
}

function addTranslateKeysToElements() {
    // Adiciona chaves de tradução a elementos gerenciados por JS.
    // O ideal é colocar `data-translate-key="suaChave"` diretamente no seu HTML.
    navLogin.dataset.translateKey = 'navLogin';
    navStory.dataset.translateKey = 'navStory';
    navSettings.dataset.translateKey = 'navSettings';
    navAdmin.dataset.translateKey = 'navAdmin';
    navLogout.dataset.translateKey = 'navLogout';
    changePicBtn.dataset.translateKey = 'settingsProfileChange';
}

function updateUIForLoginState() {
    navLogin.classList.toggle('hidden', isLoggedIn);
    navSettings.classList.toggle('hidden', !isLoggedIn);
    navLogout.classList.toggle('hidden', !isLoggedIn);
    navAdmin.classList.toggle('hidden', !isAdmin);

    if (isLoggedIn) {
        welcomeUsername.textContent = currentUsername || 'Usuário';
        setActivePanel('welcomeContent');
    } else {
        setActivePanel('loginContent');
    }
}

function setActivePanel(panelId) {
    allPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === panelId);
    });

    // Aplica traduções sempre que um painel é ativado
    applyTranslations(localStorage.getItem('chatyni_language') || 'pt');

    // Preenche o campo de nome nas configurações quando o painel é aberto
    if (panelId === 'settingsContent') {
        usernameChangeInput.value = currentUsername;
    }
    if (panelId === 'adminContent') {
        buildAdminUserTable();
    }
    // Lógica para mostrar a view correta dentro do painel de chat
    if (panelId === 'chatContent') {
        if (currentUser && currentUser.robloxUsername) {
            robloxLoginView.classList.add('hidden');
            chatView.classList.remove('hidden');
        } else {
            robloxLoginView.classList.remove('hidden');
            chatView.classList.add('hidden');
        }
    }

    // Fecha a sidebar ao selecionar um painel
    sidebar.classList.remove('show');
    hamburgerMenu.classList.remove('active');
}

async function refreshCurrentUser(token) {
    try {
        const res = await fetch(`${API_URL}/api/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Não foi possível atualizar os dados do usuário.');
        const user = await res.json();
        currentUser = user; // Update the global state object
        profilePic.src = user.avatarUrl; // Also update the profile pic in settings
        return user;
    } catch (error) {
        console.error(error);
        alert(error.message);
        return null;
    }
}

// --- Fluxo Inicial e Persistência ---
function checkInitialState() {
    // Carrega tema e idioma salvos
    const savedLang = localStorage.getItem('chatyni_language') || 'pt';
    const savedTheme = localStorage.getItem('chatyni_theme') || 'dark';
    setLanguage(savedLang);
    setTheme(savedTheme);

    addTranslateKeysToElements();

    const token = localStorage.getItem('chatyni_token');
    if (token) {
        fetchAndSetUser(token);
    }
}

async function fetchAndSetUser(token) {
    try {
        const res = await fetch(`${API_URL}/api/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Sessão inválida');
        const user = await res.json();

        currentUser = user; // Armazena o objeto do usuário
        isLoggedIn = true;
        currentUsername = user.username;
        isAdmin = user.isAdmin;
        profilePic.src = user.avatarUrl;

        // Conecta ao chat
        socket.auth.token = token;
        socket.connect();

        mainContent.style.display = 'none'; // Pula a tela de "Iniciar"
        hamburgerMenu.classList.add('show');
        updateUIForLoginState();
    } catch (error) {
        console.error(error);
        logout(); // Limpa o token inválido
    }
}

startButton.addEventListener('click', () => {
    mainContent.classList.add('hidden');

    setTimeout(() => {
        mainContent.style.display = 'none';
        progressContainer.classList.add('show');
    }, 400);

    setTimeout(() => {
        progressContainer.classList.remove('show');

        setTimeout(() => {
            hamburgerMenu.classList.add('show');
            connectionStatus.classList.add('show');
            updateUIForLoginState(); // Mostra o painel de login por padrão
        }, 400);

    }, 3400);
});

// --- Menu Hamburger ---
hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('active');
    sidebar.classList.toggle('show');
});

// --- Troca de Formulário de Autenticação ---
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('show');
    signupForm.classList.add('show');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('show');
    loginForm.classList.add('show');
});

showRecover.addEventListener('click', (e) => {
    e.preventDefault();
    setActivePanel('recoverContent');
});

backToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    setActivePanel('loginContent');
});

recoverForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    alert(`Se um usuário com o email ${email} existir, um link de recuperação foi enviado.`);
    setActivePanel('loginContent');
});


// --- Simulação de Login/Logout ---
async function handleAuth(e) {
    e.preventDefault(); // Previne o envio real do formulário
    const form = e.target;
    const isRegister = form.id === 'signupForm';
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const body = {};

    if (isRegister) {
        body.username = form.querySelector('#signupUsername').value;
        body.email = form.querySelector('#signupEmail').value;
        body.password = form.querySelector('#signupPassword').value;
    } else {
        body.email = form.querySelector('#loginEmail').value;
        body.password = form.querySelector('#loginPassword').value;
    }

    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            if (res.status === 403) {
                if (errorData.banDetails) {
                    // User is banned, show ban screen
                    document.getElementById('bannedBy').textContent = errorData.banDetails.bannedBy || 'Sistema';
                    document.getElementById('banReason').textContent = errorData.banDetails.reason || 'N/A';
                    document.getElementById('banExpires').textContent = errorData.banDetails.expiresAt ? new Date(errorData.banDetails.expiresAt).toLocaleString('pt-BR') : 'Permanente';
                    setActivePanel('bannedContent');
                    return; // Stop the login process
                }
                if (errorData.needsReactivation) {
                    // User was unbanned, show reactivation screen
                    setActivePanel('unbannedContent');
                    return; // Stop the login process
                }
            }
            throw new Error(errorData.message || 'Ocorreu um erro.');
        }

        if (isRegister) {
            alert('Cadastro realizado com sucesso! Por favor, faça o login.');
            setActivePanel('loginContent');
            form.reset();
        } else {
            const { token } = await res.json();
            localStorage.setItem('chatyni_token', token);
            await fetchAndSetUser(token);
        }
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

function logout() {
    currentUsername = '';
    isLoggedIn = false;
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('chatyni_token');
    socket.disconnect();
    updateUIForLoginState();
}

loginForm.addEventListener('submit', handleAuth);
signupForm.addEventListener('submit', handleAuth);
changePicBtn.addEventListener('click', () => {
    profilePicInput.click();
});

saveUsernameBtn.addEventListener('click', () => {
    // A lógica de salvar nome foi movida para o back-end.
    // Esta funcionalidade precisaria de um novo endpoint.
    alert('Funcionalidade de alterar nome de usuário a ser implementada no back-end.');
});

savePasswordBtn.addEventListener('click', () => {
    const newPass = newPassword.value;
    const confirmPass = confirmNewPassword.value;

    if (!newPass || !confirmPass) {
        alert('Por favor, preencha os campos de nova senha.');
        return;
    }
    if (newPass !== confirmPass) {
        alert('As senhas não coincidem.');
        return;
    }

    // A lógica de salvar senha foi movida para o back-end.
    // Esta funcionalidade precisaria de um novo endpoint.
    alert('Senha alterada com sucesso!');
});

// --- Navegação da Sidebar ---
sidebar.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const targetPanel = link.dataset.target;
    const action = link.dataset.action;

    if (targetPanel) {
        e.preventDefault();
        setActivePanel(link.dataset.target);
    } else if (action === 'logout') {
        e.preventDefault();
        logout();
    }
});

profilePicInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target.result;

            try {
                const token = localStorage.getItem('chatyni_token');
                const res = await fetch(`${API_URL}/api/users/me/avatar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ avatarData: base64String })
                });

                if (!res.ok) {
                    throw new Error(await res.text());
                }

                const data = await res.json();
                profilePic.src = data.avatarUrl; // Atualiza a foto no painel
                await refreshCurrentUser(token); // Sincroniza o usuário para atualizar o avatar em outros lugares
                alert('Foto de perfil atualizada com sucesso!');

            } catch (error) {
                console.error('Erro ao atualizar avatar:', error);
                alert(`Erro ao atualizar foto: ${error.message}`);
            }
        };
        reader.readAsDataURL(file);
    }
});

async function buildAdminUserTable() {
    try {
        const token = localStorage.getItem('chatyni_token');
        const res = await fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Não foi possível carregar os usuários.');
        const users = await res.json();

        userTableBody.innerHTML = ''; // Limpa a tabela
        users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.username = user.username;
            const isBanned = user.status === 'banned';
            if (isBanned) row.style.cssText = 'opacity: 0.5; text-decoration: line-through;';

            let actionButtonsHTML = '';
            if (user.isAdmin) {
                actionButtonsHTML = '<span>Admin</span>';
            } else {
                actionButtonsHTML = `
                    <button class="admin-btn ban">${isBanned ? 'Desbanir' : 'Banir'}</button>
                    <button class="admin-btn change-pass">Alterar Senha</button>
                    <button class="admin-btn promote">Promover</button>
                `;
            }

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.ip}</td>
                <td class="action-buttons">
                    ${actionButtonsHTML}
                </td>
            `;
            userTableBody.appendChild(row);
        });
    } catch (error) {
        alert(error.message);
    }
}

userTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.classList.contains('admin-btn')) {
        try {
            const userRow = target.closest('tr');
            const username = userRow.dataset.username;
            const token = localStorage.getItem('chatyni_token');

            if (target.classList.contains('ban')) {
                const isBanning = !target.textContent.includes('Desbanir');
                if (isBanning) {
                    const reason = prompt(`Digite o motivo para banir ${username}:`);
                    const durationDays = prompt(`Digite a duração do ban em dias (deixe em branco para permanente):`);
                    if (reason !== null) { // User didn't cancel
                        const res = await fetch(`${API_URL}/api/admin/users/${username}/ban`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason, durationDays: durationDays || null })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        alert(await res.text());
                        buildAdminUserTable();
                    }
                } else { // Unbanning
                    if (confirm(`Tem certeza que deseja desbanir ${username}?`)) {
                        const res = await fetch(`${API_URL}/api/admin/users/${username}/ban`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
                        if (!res.ok) throw new Error(await res.text());
                        alert(await res.text());
                        buildAdminUserTable();
                    }
                }
            } else if (target.classList.contains('change-pass')) {
                const newPassword = prompt(`Digite a nova senha para o usuário ${username}:`);
                if (newPassword) {
                    const res = await fetch(`${API_URL}/api/admin/users/${username}/password`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newPassword })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    alert(await res.text());
                }
            } else if (target.classList.contains('promote')) {
                if (confirm(`Tem certeza que deseja promover ${username} a administrador? Esta ação não pode ser desfeita.`)) {
                    const res = await fetch(`${API_URL}/api/admin/users/${username}/promote`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
                    if (!res.ok) throw new Error(await res.text());
                    alert(await res.text());
                    buildAdminUserTable();
                }
            }
        } catch (error) {
            alert(`Erro na ação de admin: ${error.message}`);
        }
    }
});

reactivateAccountBtn.addEventListener('click', () => {
    // Simply take the user back to the login form to log in again
    setActivePanel('loginContent');
});

// --- Lógica do Chat Global e Roblox API ---
// A lógica do Roblox foi movida para o back-end para ser associada ao perfil do usuário.
robloxUsernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = robloxUsernameInput.value.trim();
    if (!username) return;

    const submitButton = e.target.querySelector('button');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Buscando...';
    submitButton.disabled = true;

    try {
        const token = localStorage.getItem('chatyni_token');
        const res = await fetch(`${API_URL}/api/users/me/roblox`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ robloxUsername: username })
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText);
        }

        // Re-sincroniza o estado do cliente com o servidor após a atualização
        await refreshCurrentUser(token);

        // Agora que o usuário está atualizado, podemos mudar a visualização
        robloxLoginView.classList.add('hidden');
        chatView.classList.remove('hidden');

    } catch (error) {
        alert(`Erro: ${error.message}`);
    } finally {
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const messageText = chatInput.value.trim();
    if (!messageText) return;
    socket.emit('sendMessage', messageText);
    chatInput.value = '';
});

socket.on('newMessage', (data) => {
    addMessageToChat(data);
});

socket.on('connect', () => {
    console.log('Conectado ao servidor!');
    connectionStatus.classList.add('connected');
    statusText.textContent = 'Conectado';
});

socket.on('disconnect', () => {
    console.log('Desconectado do servidor.');
    connectionStatus.classList.remove('connected');
    statusText.textContent = 'Desconectado';
});

socket.on('banned', (data) => {
  console.log('Você foi banido em tempo real!', data.reason);

  // 1. Mostra uma mensagem para o usuário
  alert(`VOCÊ FOI BANIDO!\n\nMotivo: ${data.reason}\n\nVocê será deslogado.`);

  // 2. Chama a função de logout existente para limpar tudo e redefinir a UI
  logout();
});


function addMessageToChat(data) {
    const chatMessages = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    const isSelf = data.username === currentUsername;
    messageEl.classList.add('chat-message', isSelf ? 'self' : 'other');
    messageEl.innerHTML = `
        <img src="${data.avatarUrl}" alt="${data.username}" class="chat-avatar">
        <div class="chat-bubble">
            <div class="chat-username">${data.username}</div>
            <div class="chat-text">${data.text}</div>
        </div>
    `;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Rola para a mensagem mais recente
}

function initializeAppearanceSettings() {
    const settingsPanel = document.getElementById('settingsContent');
    if (!settingsPanel) return;

    const appearanceSection = document.createElement('div');
    appearanceSection.className = 'settings-section';
    appearanceSection.innerHTML = `
        <h3 data-translate-key="settingsAppearanceTitle">Aparência</h3>
        <div class="setting-item">
            <label for="themeToggle" data-translate-key="settingsTheme">Modo Escuro</label>
            <label class="switch">
                <input type="checkbox" id="themeToggle">
                <span class="slider round"></span>
            </label>
        </div>
        <div class="setting-item">
            <label for="languageSelector" data-translate-key="settingsLanguage">Idioma</label>
            <select id="languageSelector">
                <option value="pt">Português</option>
                <option value="en">English</option>
            </select>
        </div>
    `;
    
    settingsPanel.appendChild(appearanceSection);

    document.getElementById('themeToggle').addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'dark' : 'light');
    });

    document.getElementById('languageSelector').addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
}

function injectThemeStyles() {
    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = `
        /* Mova estas variáveis para o topo do seu arquivo style.css */
        :root {
            --bg-color: #1a1a1d; --panel-bg: #25282c; --text-color: #f0f0f0;
            --primary-color: #6f2dbd; --border-color: #404040; --input-bg: #33363b;
        }
        [data-theme="light"] {
            --bg-color: #f0f2f5; --panel-bg: #ffffff; --text-color: #1c1e21;
            --primary-color: #1877f2; --border-color: #ced0d4; --input-bg: #e4e6eb;
        }
        /* Aplique as variáveis nos seus elementos. Exemplo: */
        body { background-color: var(--bg-color); color: var(--text-color); }
        .content-panel, .sidebar { background-color: var(--panel-bg); border-color: var(--border-color); }
        input, select, textarea { background-color: var(--input-bg); color: var(--text-color); border-color: var(--border-color); }
        #startButton, #chat-form button { background-color: var(--primary-color); color: white; border: none; }
    `;
    document.head.appendChild(style);
}

// Inicializa as novas funcionalidades
injectThemeStyles();
initializeAppearanceSettings();

// Verifica o estado de login assim que a página carrega
checkInitialState();