class UISystem {
    constructor() {
        this.currentView = 'chats';
        this.isMobile = window.innerWidth <= 768;
        this.setupEventListeners();
        this.initializeMobileUI();
        this.setupSettingsListeners();
        this.loadUserPreferences();
    }

    setupEventListeners() {
        // Mobile navigation
        document.getElementById('chatsTab').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('chats');
        });

        document.getElementById('usersTab').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('users');
        });

        document.getElementById('profileTab').addEventListener('click', (e) => {
            e.preventDefault();
            this.showProfileModal();
        });

        // Back button in chat
        document.getElementById('backToUsers').addEventListener('click', () => {
            this.showChatArea(false);
        });

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsBtnMobile = document.getElementById('settingsBtnMobile');
        const closeSettings = document.getElementById('closeSettings');
        
        [settingsBtn, settingsBtnMobile].forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.toggleSettings());
        });

        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.toggleSettings());
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        const themeBtnMobile = document.getElementById('themeBtnMobile');
        
        [themeToggle, themeBtnMobile].forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.toggleTheme());
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.handleResize();
        });
    }

    initializeMobileUI() {
        if (this.isMobile) {
            this.showSidebar(true);
            this.showChatArea(false);
        }
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });

        document.querySelector(`#${view}Tab`).classList.add('active');

        switch (view) {
            case 'chats':
                this.showSidebar(true);
                this.showChatArea(false);
                break;
            case 'users':
                this.showUsersPage();
                break;
        }
    }

    showSidebar(show) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (show) {
                sidebar.style.display = 'flex';
                sidebar.style.transform = 'translateX(0)';
            } else {
                sidebar.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    sidebar.style.display = 'none';
                }, 300);
            }
        }
    }

    showChatArea(show) {
        const chatArea = document.querySelector('.chat-area');
        const activeChat = document.getElementById('activeChat');
        const noChatSelected = document.getElementById('noChatSelected');

        if (this.isMobile) {
            if (show) {
                this.showSidebar(false);
                chatArea.style.display = 'flex';
                activeChat.classList.remove('hidden');
                noChatSelected.classList.add('hidden');
            } else {
                chatArea.style.display = 'none';
                this.showSidebar(true);
            }
        }
    }

    showUsersPage() {
        const usersPage = document.querySelector('.users-page');
        if (usersPage) {
            usersPage.classList.add('active');
            this.showSidebar(false);
            this.showChatArea(false);
        }
    }

    toggleSettings() {
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu) {
            settingsMenu.classList.toggle('active');
        }
    }

    toggleTheme(forceDark = null) {
        const isDark = forceDark !== null ? forceDark : !document.body.classList.contains('dark-mode');
        
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        localStorage.setItem('darkMode', isDark);

        // Update all theme toggles
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = isDark;
        }

        document.querySelectorAll('#themeToggle, #themeBtnMobile').forEach(btn => {
            if (btn) btn.innerHTML = isDark ? '☀️' : '🌙';
        });
    }

    handleResize() {
        if (this.isMobile) {
            this.initializeMobileUI();
        } else {
            // Reset mobile-specific styles
            document.querySelector('.sidebar').style.transform = '';
            document.querySelector('.chat-area').style.display = '';
        }
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 
                          'info-circle'}"></i>
            ${message}
        `;

        // Position the alert
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.left = '50%';
        alert.style.transform = 'translateX(-50%)';
        alert.style.zIndex = '9999';

        document.body.appendChild(alert);

        // Remove alert after 3 seconds
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    setupSettingsListeners() {
        // Theme toggle in settings
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.toggleTheme(e.target.checked);
            });
        }

        // Font size selector
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                this.changeFontSize(e.target.value);
            });
        }
    }

    loadUserPreferences() {
        // Load theme preference
        const darkMode = localStorage.getItem('darkMode') === 'true';
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = darkMode;
        }
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.querySelectorAll('#themeToggle, #themeBtnMobile').forEach(btn => {
                if (btn) btn.innerHTML = '☀️';
            });
        }

        // Load font size preference
        const fontSize = localStorage.getItem('fontSize') || 'medium';
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) {
            fontSizeSelect.value = fontSize;
        }
        this.changeFontSize(fontSize);
    }

    changeFontSize(size) {
        const root = document.documentElement;
        const sizes = {
            small: {
                base: '14px',
                message: '13px',
                header: '16px'
            },
            medium: {
                base: '16px',
                message: '15px',
                header: '18px'
            },
            large: {
                base: '18px',
                message: '17px',
                header: '20px'
            }
        };

        if (sizes[size]) {
            root.style.setProperty('--base-font-size', sizes[size].base);
            root.style.setProperty('--message-font-size', sizes[size].message);
            root.style.setProperty('--header-font-size', sizes[size].header);
            localStorage.setItem('fontSize', size);
        }
    }
}

// Initialize UI system and make it globally available
window.uiSystem = new UISystem();
window.showAlert = (message, type) => window.uiSystem.showAlert(message, type);