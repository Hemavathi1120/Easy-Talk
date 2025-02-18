class UISystem {
    constructor() {
        this.init();
        this.setupMobileNavigation();
        this.setupBackButton();
        this.setupProfileButton();  // Add this line
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

        this.showUsersPage();

        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                switch (button.id) {
                    case 'chatsTab':
                    case 'usersTab':
                        this.showUsersPage();
                        break;
                    case 'profileTab':
                        this.showProfileModal();
                        break;
                }
            });
        });
    }

    setupMobileButtons() {
        const themeBtnMobile = document.getElementById('themeBtnMobile');
        const logoutBtnMobile = document.getElementById('logoutBtnMobile');

        if (themeBtnMobile) {
            themeBtnMobile.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                themeBtnMobile.innerHTML = isDark ? 
                    '<i class="fas fa-sun"></i>' : 
                    '<i class="fas fa-moon"></i>';
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                this.updateThemeColors(isDark ? 'dark' : 'light');
            });
        }

        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', async () => {
                try {
                    const user = firebase.auth().currentUser;
                    if (user) {
                        await firebase.firestore().collection('users')
                            .doc(user.uid)
                            .update({ status: 'offline' });
                    }
                    await firebase.auth().signOut();
                    window.location.reload();
                } catch (error) {
                    console.error('Logout error:', error);
                    showAlert('Error logging out', 'error');
                }
            });
        }
    }

    showUsersPage() {
        const existingUsersPage = document.querySelector('.users-page');
        if (existingUsersPage) {
            existingUsersPage.remove();
        }

        const usersPage = document.createElement('div');
        usersPage.className = 'users-page';
        usersPage.innerHTML = `
            <div class="users-header">
                <h2>WhatsApp</h2>
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
                <input type="text" placeholder="Search or start new chat" id="searchUsers">
            </div>
            <div class="chat-sections">
                <div id="usersList" class="users-list"></div>
            </div>
        `;

        document.querySelector('#appContainer').appendChild(usersPage);

        // Setup search functionality
        const searchInput = usersPage.querySelector('#searchUsers');
        searchInput.addEventListener('input', (e) => this.filterUsers(e.target.value));

        this.setupMobileButtons();
        
        // Hide chat area
        const chatArea = document.querySelector('.chat-area');
        if (chatArea) {
            chatArea.style.display = 'none';
        }

        // Load users
        if (window.chatSystem) {
            window.chatSystem.loadUsers();
        }
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
            
            // Create a real-time listener for users
            const unsubscribe = firebase.firestore()
                .collection('users')
                .onSnapshot((snapshot) => {
                    usersList.innerHTML = ''; // Clear existing list
                    
                    snapshot.forEach(doc => {
                        const userData = doc.data();
                        // Don't show current user
                        if (doc.id !== currentUser.uid) {
                            const userItem = this.createUserListItem(doc.id, userData);
                            usersList.appendChild(userItem);
                        }
                    });
                });

            // Store unsubscribe function for cleanup
            this.unsubscribeUsers = unsubscribe;
        } catch (error) {
            console.error("Error loading users:", error);
            showAlert('Error loading users', 'error');
        }
    }

    createUserListItem(userId, userData) {
        const div = document.createElement('div');
        div.className = 'chat-list-item';
        div.innerHTML = `
            <img src="${userData.photoURL || 'default-avatar.png'}" alt="Avatar">
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
        const usersPage = document.querySelector('.users-page');
        const chatArea = document.querySelector('.chat-area');
        const sidebar = document.querySelector('.sidebar');
        
        if (window.innerWidth <= 768) {
            if (sidebar) {
                sidebar.classList.remove('active');
            }
            
            if (usersPage) {
                if (animate) {
                    usersPage.style.transition = 'transform 0.3s ease-out';
                    usersPage.style.transform = 'translateX(-100%)';
                    setTimeout(() => {
                        usersPage.style.display = 'none';
                        usersPage.style.transform = '';
                    }, 300);
                } else {
                    usersPage.style.display = 'none';
                }
            }
        }

        if (chatArea) {
            chatArea.style.display = 'flex';
            if (animate) {
                chatArea.style.transition = 'transform 0.3s ease-out';
                chatArea.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    chatArea.style.transform = '';
                }, 50);
            }
        }

        // Ensure message container is visible
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.style.display = 'flex';
        }

        // Show action buttons on desktop
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons && window.innerWidth > 768) {
            actionButtons.style.display = 'flex';
        }
    }

    goBackToUsers() {
        const chatArea = document.querySelector('.chat-area');
        const usersPage = document.querySelector('.users-page');

        // Add slide-out animation
        if (chatArea) {
            chatArea.style.transition = 'transform 0.3s ease-out';
            chatArea.style.transform = 'translateX(100%)';
            setTimeout(() => {
                chatArea.style.display = 'none';
                chatArea.style.transform = '';
                chatArea.classList.remove('active');
            }, 300);
        }

        // Show users page with animation
        if (usersPage) {
            usersPage.style.display = 'block';
            usersPage.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                usersPage.style.transform = '';
                // Refresh the users list
                if (window.chatSystem) {
                    window.chatSystem.loadUsers();
                }
            }, 50);
        }

        // Clear the active chat area
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
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