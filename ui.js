class UISystem {
    constructor() {
        this.init();
        this.setupMobileNavigation();
        this.setupBackButton();
        this.setupProfileButton();  // Add this line
        this.setupMobileButtons();
        this.setupSettings();
        this.currentView = 'chats'; // Add this line
        this.setupMobileLogout(); // Add this line
    }

    init() {
        this.setupThemeToggle();
        this.setupAlerts();
        this.setupResponsiveDesign();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
            this.updateThemeColors('dark');
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            this.updateThemeColors(isDark ? 'dark' : 'light');
        });
    }

    updateThemeColors(theme) {
        document.body.classList.add('theme-transition');
        
        const elements = document.querySelectorAll('.message-bubble, .chat-area, .sidebar, .message-input');
        elements.forEach(el => el.classList.add('theme-transition'));

        setTimeout(() => {
            document.body.classList.remove('theme-transition');
            elements.forEach(el => el.classList.remove('theme-transition'));
        }, 300);

        // Update message bubbles with smooth transition
        document.querySelectorAll('.message').forEach(message => {
            message.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                message.style.transition = '';
            }, 300);
        });
    }

    setupAlerts() {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);

        window.showAlert = (message, type = 'info') => {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;

            alertContainer.appendChild(alert);

            setTimeout(() => {
                alert.classList.add('fade-out');
                setTimeout(() => alert.remove(), 300);
            }, 3000);
        };
    }

    setupResponsiveDesign() {
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');

        if (window.innerWidth <= 768) {
            chatArea.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });

            document.querySelector('.profile-section').addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.add('active');
            });
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
            }
        });
    }

    setupMobileNavigation() {
        if (window.innerWidth > 768) return;

        const navButtons = document.querySelectorAll('.nav-button');
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        const usersPage = document.querySelector('.users-page');

        // Add touch feedback
        const addTouchFeedback = (element) => {
            element.addEventListener('touchstart', () => {
                element.style.transform = 'scale(0.97)';
            }, { passive: true });

            element.addEventListener('touchend', () => {
                element.style.transform = '';
            }, { passive: true });
        };

        navButtons.forEach(button => {
            addTouchFeedback(button);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const view = button.id.replace('Tab', '');
                
                // Visual feedback
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Add transition class
                button.classList.add('nav-button-pressed');
                setTimeout(() => button.classList.remove('nav-button-pressed'), 200);

                this.switchView(view);
            });
        });

        // Add swipe gestures
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        }, { passive: true });

        const handleSwipeGesture = () => {
            const swipeThreshold = 100;
            const swipeDistance = touchEndX - touchStartX;

            if (Math.abs(swipeDistance) > swipeThreshold) {
                if (swipeDistance > 0 && chatArea.classList.contains('active')) {
                    // Swipe right to go back
                    this.goBackToUsers();
                }
            }
        };
    }

    switchView(view) {
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        const usersPage = document.querySelector('.users-page');

        // Hide all views first
        [sidebar, chatArea, usersPage].forEach(el => {
            if (el) el.style.display = 'none';
        });

        // Show selected view
        switch (view) {
            case 'chats':
                sidebar.style.display = 'flex';
                this.loadRecentChats();
                break;
            case 'users':
                this.showUsersPage();
                break;
            case 'profile':
                this.showProfileModal();
                if (this.currentView === 'chats') {
                    sidebar.style.display = 'flex';
                }
                break;
        }

        this.currentView = view;
    }

    setupMobileButtons() {
        const themeBtnMobile = document.getElementById('themeBtnMobile');
        const logoutBtnMobile = document.getElementById('logoutBtnMobile');

        if (themeBtnMobile) {
            themeBtnMobile.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                themeBtnMobile.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                this.updateThemeColors(isDark ? 'dark' : 'light');
            });

            // Sync initial state
            if (document.body.classList.contains('dark-mode')) {
                themeBtnMobile.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }

        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', async () => {
                if (window.authSystem) {
                    await window.authSystem.handleLogout();
                }
            });
        }
    }

    showUsersPage() {
        const existingUsersPage = document.querySelector('.users-page');
        const chatArea = document.querySelector('.chat-area');
        const sidebar = document.querySelector('.sidebar');

        // Remove existing users page if it exists
        if (existingUsersPage) {
            existingUsersPage.remove();
        }

        // Hide other views
        if (chatArea) chatArea.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';

        // Create new users page
        const usersPage = document.createElement('div');
        usersPage.className = 'users-page';
        usersPage.innerHTML = `
            <div class="users-header">
                <h2>Users</h2>
                <div class="header-actions">
                    <button id="themeBtnMobile" class="action-btn">
                        <i class="fas fa-moon"></i>
                    </button>
                    <button id="logoutBtnMobile" class="action-btn">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
            <div class="search-box">
                <input type="text" placeholder="Search users" id="searchUsers">
            </div>
            <div class="users-list" id="usersList"></div>
        `;

        document.querySelector('#appContainer').appendChild(usersPage);
        
        // Setup search functionality
        const searchInput = usersPage.querySelector('#searchUsers');
        searchInput.addEventListener('input', (e) => this.filterUsers(e.target.value));

        // Setup mobile buttons
        this.setupMobileButtons();
        
        // Load users
        if (window.chatSystem) {
            window.chatSystem.loadUsers();
        }

        // Ensure the users page is visible
        usersPage.style.display = 'flex';
    }

    filterUsers(searchTerm) {
        const userItems = document.querySelectorAll('.chat-list-item');
        searchTerm = searchTerm.toLowerCase();

        userItems.forEach(item => {
            const username = item.querySelector('h4').textContent.toLowerCase();
            if (username.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async loadRecentChats() {
        const recentChatsList = document.getElementById('recentChatsList');
        if (!recentChatsList) return;

        try {
            const currentUser = firebase.auth().currentUser;
            
            // Create a real-time listener for chats
            this.unsubscribeChats = firebase.firestore()
                .collection('chats')
                .where('participants', 'array-contains', currentUser.uid)
                .orderBy('lastActivity', 'desc')
                .onSnapshot(async snapshot => {
                    recentChatsList.innerHTML = '';
                    
                    for (const doc of snapshot.docs) {
                        const chatData = doc.data();
                        const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
                        
                        const userDoc = await firebase.firestore()
                            .collection('users')
                            .doc(otherUserId)
                            .get();
                        
                        if (userDoc.exists) {
                            const chatItem = this.createChatListItem(
                                otherUserId,
                                userDoc.data(),
                                chatData.lastMessage
                            );
                            recentChatsList.appendChild(chatItem);
                        }
                    }
                });

        } catch (error) {
            console.error("Error loading recent chats:", error);
            showAlert('Error loading recent chats', 'error');
        }
    }

    async loadUsers() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return;

            // Clear existing list
            usersList.innerHTML = '';

            // Create real-time listener for users
            this.unsubscribeUsers = firebase.firestore()
                .collection('users')
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach(change => {
                        const userData = {
                            id: change.doc.id,
                            ...change.doc.data()
                        };

                        if (userData.id !== currentUser.uid) {
                            const existingItem = usersList.querySelector(`[data-user-id="${userData.id}"]`);
                            
                            if (change.type === 'added' && !existingItem) {
                                const userItem = this.createUserListItem(userData.id, userData);
                                usersList.appendChild(userItem);
                            } else if (change.type === 'modified' && existingItem) {
                                const newItem = this.createUserListItem(userData.id, userData);
                                existingItem.replaceWith(newItem);
                            } else if (change.type === 'removed' && existingItem) {
                                existingItem.remove();
                            }
                        }
                    });
                });

        } catch (error) {
            console.error("Error loading users:", error);
            window.showAlert('Error loading users', 'error');
        }
    }

    createUserListItem(userId, userData) {
        const div = document.createElement('div');
        div.className = 'chat-list-item';
        div.dataset.userId = userId;
        
        const avatarUrl = userData.photoURL || './assets/default-avatar.png';
        
        div.innerHTML = `
            <img src="${avatarUrl}" alt="${userData.username || 'User'}" 
                 onerror="this.src='./assets/default-avatar.png'">
            <div class="chat-info">
                <h4>${userData.username || 'Anonymous'}</h4>
                <p>
                    <span class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></span>
                    ${userData.status === 'online' ? 'Online' : 'Offline'}
                </p>
            </div>
        `;

        div.addEventListener('click', () => {
            if (window.chatSystem) {
                window.chatSystem.startChat(userId, userData);
            }
        });

        return div;
    }

    createChatListItem(userId, userData, lastMessage = null) {
        const div = document.createElement('div');
        div.className = 'chat-list-item';
        
        const time = lastMessage?.timestamp ? 
            new Date(lastMessage.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            '';
        
        div.innerHTML = `
            <img src="${userData.photoURL || 'default-avatar.png'}" alt="Avatar">
            <div class="chat-info">
                <div class="chat-header">
                    <h4>${userData.username || 'Anonymous'}</h4>
                    ${time ? `<span class="chat-time">${time}</span>` : ''}
                </div>
                <p>
                    <span class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></span>
                    ${lastMessage ? 
                        `<span class="last-message">${lastMessage.text.substring(0, 30)}${lastMessage.text.length > 30 ? '...' : ''}</span>` : 
                        userData.status === 'online' ? 'Online' : 'Offline'}
                </p>
            </div>
        `;

        div.addEventListener('click', () => {
            if (window.chatSystem) {
                window.chatSystem.startChat(userId, userData);
            }
        });

        return div;
    }

    showChatArea(animate = false) {
        const chatArea = document.querySelector('.chat-area');
        const sidebar = document.querySelector('.sidebar');
        const usersPage = document.querySelector('.users-page');
        
        if (window.innerWidth <= 768) {
            // Hide other views
            if (sidebar) {
                sidebar.style.display = 'none';
            }
            if (usersPage) {
                usersPage.style.display = 'none';
            }
            
            // Show chat area
            if (chatArea) {
                chatArea.style.display = 'flex';
                chatArea.classList.add('active');
                if (animate) {
                    chatArea.style.transform = 'translateX(0)';
                }
            }

            // Update mobile navigation
            const navButtons = document.querySelectorAll('.nav-button');
            navButtons.forEach(btn => btn.classList.remove('active'));
        }
    }

    goBackToUsers() {
        const chatArea = document.querySelector('.chat-area');
        const sidebar = document.querySelector('.sidebar');
        const usersPage = document.querySelector('.users-page');

        if (window.innerWidth <= 768) {
            // Hide chat area
            if (chatArea) {
                chatArea.classList.remove('active');
                chatArea.style.display = 'none';
            }
            
            // Show appropriate view based on current tab
            const activeTab = document.querySelector('.nav-button.active');
            if (activeTab) {
                if (activeTab.id === 'chatsTab') {
                    if (sidebar) {
                        sidebar.style.display = 'block';
                    }
                } else if (activeTab.id === 'usersTab') {
                    if (usersPage) {
                        usersPage.style.display = 'block';
                    }
                }
            } else {
                // Default to showing sidebar
                if (sidebar) {
                    sidebar.style.display = 'block';
                }
            }
        }
    }

    async updateChatList(userId, lastMessage) {
        const chatItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (chatItem) {
            const messagePreview = chatItem.querySelector('.last-message');
            const timeElement = chatItem.querySelector('.chat-time');
            
            if (messagePreview && lastMessage) {
                messagePreview.textContent = lastMessage.text.substring(0, 30) + 
                    (lastMessage.text.length > 30 ? '...' : '');
            }
            
            if (timeElement && lastMessage?.timestamp) {
                timeElement.textContent = new Date(lastMessage.timestamp.toDate())
                    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
    }

    showProfileModal() {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
    
        const modal = document.createElement('div');
        modal.className = 'profile-modal';
        
        firebase.firestore().collection('users').doc(currentUser.uid).get()
            .then(doc => {
                const userData = doc.data();
                modal.innerHTML = `
                    <div class="profile-content">
                        <button class="close-modal" id="closeProfileModal">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="profile-body">
                            <div class="profile-avatar-container">
                                <img src="${userData.photoURL || './assets/default-avatar.png'}" 
                                     alt="Profile" 
                                     class="profile-avatar-img"
                                     id="profileAvatar">
                                <button class="change-avatar-btn" id="changeAvatarBtn">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                            <div class="profile-details">
                                <div class="detail-item">
                                    <label>Username</label>
                                    <p>${userData.username || 'No username set'}</p>
                                </div>
                                <div class="detail-item">
                                    <label>Email</label>
                                    <p>${userData.email}</p>
                                </div>
                                <div class="detail-item">
                                    <label>Status</label>
                                    <p>${userData.status || 'Available'}</p>
                                </div>
                            </div>
                            <button class="edit-profile-btn">
                                <i class="fas fa-edit"></i> Edit Profile
                            </button>
                        </div>
                    </div>
                `;
    
                document.body.appendChild(modal);

                // Add event listeners for closing
                const closeBtn = modal.querySelector('#closeProfileModal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.remove();
                    });
                }
    
                // Close on outside click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });
    
                this.setupProfilePictureHandlers(modal);
            })
            .catch(error => {
                console.error("Error loading profile:", error);
                window.showAlert('Error loading profile', 'error');
            });
    }

    async showEditProfileForm(modal) {
        const profileContent = modal.querySelector('.profile-content');
        const currentUser = firebase.auth().currentUser;
        
        try {
            const doc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            const userData = doc.data();
            
            const editForm = document.createElement('div');
            editForm.className = 'edit-profile-form';
            editForm.innerHTML = `
                <h3>Edit Profile</h3>
                <form id="profileEditForm">
                    <input type="text" 
                        id="editUsername" 
                        placeholder="Username" 
                        value="${userData.username || ''}" 
                        required>
                    <select id="editStatus" required>
                        <option value="online" ${userData.status === 'online' ? 'selected' : ''}>Online</option>
                        <option value="away" ${userData.status === 'away' ? 'selected' : ''}>Away</option>
                        <option value="busy" ${userData.status === 'busy' ? 'selected' : ''}>Busy</option>
                    </select>
                    <div class="edit-actions">
                        <button type="submit" class="save-profile">
                            <i class="fas fa-check"></i> Save Changes
                        </button>
                        <button type="button" class="cancel-edit">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </form>
            `;
            
            profileContent.appendChild(editForm);
            
            // Setup form submission handler
            const form = editForm.querySelector('#profileEditForm');
            const cancelBtn = editForm.querySelector('.cancel-edit');
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProfileUpdate(currentUser.uid, form, modal);
            });

            cancelBtn.addEventListener('click', () => {
                editForm.remove();
            });

        } catch (error) {
            console.error("Error showing edit form:", error);
            window.showAlert('Error loading profile data', 'error');
        }
    }

    async handleProfileUpdate(userId, form, modal) {
        const username = form.querySelector('#editUsername').value.trim();
        const status = form.querySelector('#editStatus').value;

        if (!username) {
            window.showAlert('Username cannot be empty', 'error');
            return;
        }

        try {
            // Update the user profile in Firestore
            await firebase.firestore().collection('users').doc(userId).update({
                username,
                status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update UI elements
            document.getElementById('userName').textContent = username;
            
            // Remove the edit form and modal
            modal.remove();
            
            // Show success message
            window.showAlert('Profile updated successfully!', 'success');
            
            // Refresh the profile modal to show updated information
            this.showProfileModal();

        } catch (error) {
            console.error("Error updating profile:", error);
            window.showAlert('Failed to update profile', 'error');
        }
    }

    setupProfileModalHandlers(modal) {
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.remove();
        });

        const editBtn = modal.querySelector('.edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.showEditProfileForm(modal));
        }
    }

    setupProfilePictureHandlers(modal) {
        const changeAvatarBtn = modal.querySelector('#changeAvatarBtn');
        const profileAvatar = modal.querySelector('#profileAvatar');
    
        // Create Cloudinary upload widget
        const uploadWidget = cloudinary.createUploadWidget({
            cloudName: cloudinaryConfig.cloudName,
            uploadPreset: cloudinaryConfig.uploadPreset,
            maxFiles: 1,
            sources: ['local', 'camera'],
            resourceType: 'image',
            cropping: true,
            croppingAspectRatio: 1,
            maxImageWidth: 400,
            maxImageHeight: 400
        }, async (error, result) => {
            if (!error && result && result.event === "success") {
                const imageUrl = result.info.secure_url;
                try {
                    // Update user profile in Firebase
                    const currentUser = firebase.auth().currentUser;
                    await firebase.firestore().collection('users').doc(currentUser.uid).update({
                        photoURL: imageUrl
                    });
    
                    // Update UI
                    profileAvatar.src = imageUrl;
                    document.getElementById('userAvatar').src = imageUrl;
                    window.showAlert('Profile picture updated successfully!', 'success');
                } catch (error) {
                    console.error('Error updating profile picture:', error);
                    window.showAlert('Failed to update profile picture', 'error');
                }
            }
        });
    
        // Open Cloudinary widget on button click
        changeAvatarBtn.addEventListener('click', () => {
            uploadWidget.open();
        });
    }

    // Add cleanup method
    cleanup() {
        if (this.unsubscribeUsers) {
            this.unsubscribeUsers();
        }
        if (this.unsubscribeChats) {
            this.unsubscribeChats();
        }
    }

    // Update copy functionality
    addMessageEventListeners(messageElement, messageData) {
        const copyBtn = messageElement.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const success = await utils.copyToClipboard(messageData.text);
                if (success) {
                    showAlert('Message copied to clipboard!', 'success');
                } else {
                    showAlert('Failed to copy message', 'error');
                }
            });
        }

        // ...rest of the event listeners...
    }

    // Add this new method
    setupBackButton() {
        const backButton = document.getElementById('backToUsers');
        if (backButton) {
            backButton.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.goBackToUsers();
                }
            });
        }
    }

    // Add this new method
    setupProfileButton() {
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showProfileModal();
            });
        }
    }

    setupSettings() {
        // Get all settings related elements
        const settingsMenu = document.getElementById('settingsMenu');
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsBtnMobile = document.getElementById('settingsBtnMobile');
        const closeSettings = document.getElementById('closeSettings');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        const notificationToggle = document.getElementById('notificationToggle');

        // Settings button click handlers
        const openSettings = () => {
            settingsMenu.classList.add('active');
        };

        const closeSettingsMenu = () => {
            settingsMenu.classList.remove('active');
        };

        // Add click listeners to settings buttons
        if (settingsBtn) {
            settingsBtn.addEventListener('click', openSettings);
        }
        if (settingsBtnMobile) {
            settingsBtnMobile.addEventListener('click', openSettings);
        }
        if (closeSettings) {
            closeSettings.addEventListener('click', closeSettingsMenu);
        }

        // Close on outside click
        settingsMenu.addEventListener('click', (e) => {
            if (e.target === settingsMenu) {
                closeSettingsMenu();
            }
        });

        // Initialize dark mode toggle state
        if (darkModeToggle) {
            darkModeToggle.checked = document.body.classList.contains('dark-mode');
            darkModeToggle.addEventListener('change', (e) => {
                document.body.classList.toggle('dark-mode', e.target.checked);
                localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
                this.updateThemeColors(e.target.checked ? 'dark' : 'light');
            });
        }

        // Initialize font size from localStorage
        if (fontSizeSelect) {
            const savedFontSize = localStorage.getItem('fontSize') || 'medium';
            fontSizeSelect.value = savedFontSize;
            document.body.style.fontSize = {
                small: '14px',
                medium: '16px',
                large: '18px'
            }[savedFontSize];

            fontSizeSelect.addEventListener('change', (e) => {
                const size = e.target.value;
                document.body.style.fontSize = {
                    small: '14px',
                    medium: '16px',
                    large: '18px'
                }[size];
                localStorage.setItem('fontSize', size);
            });
        }

        // Initialize notification toggle
        if (notificationToggle) {
            const notificationsEnabled = localStorage.getItem('notifications') === 'true';
            notificationToggle.checked = notificationsEnabled;
            
            notificationToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.requestNotificationPermission();
                }
                localStorage.setItem('notifications', e.target.checked);
            });
        }

        // Help & Support handlers
        document.getElementById('helpCenter').addEventListener('click', () => {
            window.open('https://help.easytalk.com', '_blank');
        });

        document.getElementById('contactSupport').addEventListener('click', () => {
            window.location.href = 'mailto:support@easytalk.com';
        });

        document.getElementById('reportBug').addEventListener('click', () => {
            this.showBugReportForm();
        });

        document.getElementById('sendFeedback').addEventListener('click', () => {
            this.showFeedbackForm();
        });

        // About section handlers
        document.getElementById('aboutUs').addEventListener('click', () => {
            this.showAboutModal();
        });

        document.getElementById('privacyPolicy').addEventListener('click', () => {
            window.open('https://easytalk.com/privacy', '_blank');
        });

        document.getElementById('termsOfService').addEventListener('click', () => {
            window.open('https://easytalk.com/terms', '_blank');
        });
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                window.showAlert('Notifications enabled!', 'success');
            } else {
                window.showAlert('Notification permission denied', 'error');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            window.showAlert('Error enabling notifications', 'error');
        }
    }

    showBugReportForm() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Report a Bug</h2>
                <form id="bugReportForm">
                    <textarea placeholder="Describe the issue you're experiencing..." required></textarea>
                    <div class="modal-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Submit Report</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Handle form submission
        const form = modal.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // Here you would normally send the bug report to your backend
            window.showAlert('Bug report submitted successfully!', 'success');
            modal.remove();
        });

        // Handle cancel
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
    }

    showFeedbackForm() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Send Feedback</h2>
                <form id="feedbackForm">
                    <textarea placeholder="Share your thoughts with us..." required></textarea>
                    <div class="modal-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Send Feedback</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Handle form submission
        const form = modal.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // Here you would normally send the feedback to your backend
            window.showAlert('Feedback submitted successfully!', 'success');
            modal.remove();
        });

        // Handle cancel
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
    }

    showAboutModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content about-content">
                <h2>About Easy Talk</h2>
                <div class="app-info">
                    <img src="./assets/logo.png" alt="Easy Talk Logo" class="app-logo">
                    <p class="version">Version 1.0.0</p>
                </div>
                <p class="description">
                    Easy Talk is a modern chat application designed to make communication simple and efficient.
                    Built with love and cutting-edge technology to provide the best chat experience.
                </p>
                <div class="credits">
                    <p>© 2024 Easy Talk. All rights reserved.</p>
                </div>
                <button class="close-btn">Close</button>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Handle close
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });
    }

    // Add this new method
    setupMobileLogout() {
        const logoutBtnMobile = document.getElementById('logoutBtnMobile');
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', async () => {
                if (confirm('Are you sure you want to log out?')) {
                    try {
                        await firebase.auth().signOut();
                        // Clear local storage
                        localStorage.removeItem('theme');
                        localStorage.removeItem('fontSize');
                        // Redirect to login page or show auth container
                        const authContainer = document.getElementById('authContainer');
                        const appContainer = document.getElementById('appContainer');
                        if (authContainer && appContainer) {
                            appContainer.classList.add('hidden');
                            authContainer.classList.remove('hidden');
                        }
                        // Clean up any active listeners or states
                        if (window.chatSystem) {
                            window.chatSystem.cleanup();
                        }
                        this.cleanup();
                    } catch (error) {
                        console.error('Logout error:', error);
                        window.showAlert('Failed to log out. Please try again.', 'error');
                    }
                }
            });
        }
    }
}

// Initialize UI system
window.uiSystem = new UISystem();

// Add some additional UI utilities
const utils = {
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '📷';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        return '📎';
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text:', err);
            return false;
        }
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")     // Fixed: Changed /</g to /</g
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Export utils for global use
window.utils = utils;