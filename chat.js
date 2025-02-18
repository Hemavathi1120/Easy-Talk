class ChatSystem {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.auth = firebase.auth(); // Add this line
        this.currentUser = null;
        
        // Listen for auth state changes
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.init();
            } else {
                this.currentUser = null;
                // Clear any existing listeners or chat data
                this.clearChatState();
            }
        });

        this.setupFileInput();
    }

    setupFileInput() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                window.showAlert('Uploading file...', 'info');
                const uploadResult = await cloudinaryUtils.uploadFile(file);
                await this.sendMediaMessage(uploadResult);
                window.showAlert('File uploaded successfully!', 'success');
            } catch (error) {
                console.error('Upload error:', error);
                window.showAlert('Failed to upload file', 'error');
            }
            
            // Clear the input
            fileInput.value = '';
        });
    }

    async sendMediaMessage(mediaData) {
        if (!this.currentChatId || !this.auth.currentUser) return;

        try {
            const messageData = {
                chatId: this.currentChatId,
                senderId: this.auth.currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                mediaUrl: mediaData.url,
                mediaType: mediaData.resourceType,
                mediaFormat: mediaData.format,
                type: 'media'
            };

            // Add message
            const messageRef = await this.db.collection('messages').add(messageData);

            // Update chat document
            await this.db.collection('chats').doc(this.currentChatId).update({
                lastMessage: {
                    type: 'media',
                    mediaType: mediaData.resourceType,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    senderId: this.auth.currentUser.uid
                },
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending media message:', error);
            throw error;
        }
    }

    clearChatState() {
        // Clear any active listeners or chat data when user logs out
        if (this.unsubscribeChats) {
            this.unsubscribeChats();
        }
        // Clear UI elements
        const chatsList = document.getElementById('chatsList');
        if (chatsList) chatsList.innerHTML = '';
    }

    init() {
        if (!this.currentUser) {
            console.log('No user authenticated');
            return;
        }
        this.chatsList = document.getElementById('chatsList');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.activeChat = document.getElementById('activeChat');
        this.noChatSelected = document.getElementById('noChatSelected');
        
        this.setupEventListeners();
        this.loadRecentChats(); // Add this line
        this.loadUsers();
        this.setupChatListeners();
    }

    setupEventListeners() {
        document.getElementById('sendMessage').addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async loadUsers() {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return;

            const chatsList = document.getElementById('chatsList');
            if (!chatsList) return;

            // Clear existing list
            chatsList.innerHTML = '';

            // Create real-time listener for users
            this.unsubscribeUsers = this.db.collection('users')
                .onSnapshot((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        const userData = {
                            id: doc.id,
                            ...doc.data()
                        };

                        // Don't show current user
                        if (userData.id !== currentUser.uid) {
                            const userItem = this.createUserListItem(userData.id, userData);
                            chatsList.appendChild(userItem);
                        }
                    });
                });

        } catch (error) {
            console.error("Error loading users:", error);
            window.showAlert('Error loading users', 'error');
        }
    }

    async loadRecentChats() {
        try {
            // Create real-time listener for user's chats
            this.unsubscribeChats = this.db.collection('chats')
                .where('participants', 'array-contains', this.currentUser.uid)
                .orderBy('lastActivity', 'desc')
                .onSnapshot(async (snapshot) => {
                    const chatsList = document.getElementById('chatsList');
                    if (!chatsList) return;

                    // Clear existing chats
                    chatsList.innerHTML = '';

                    for (const doc of snapshot.docs) {
                        const chatData = doc.data();
                        // Get the other participant's ID
                        const otherUserId = chatData.participants.find(id => id !== this.currentUser.uid);
                        
                        // Get other user's data
                        const userDoc = await this.db.collection('users').doc(otherUserId).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const chatItem = this.createUserListItem(otherUserId, userData, chatData.lastMessage);
                            chatsList.appendChild(chatItem);
                        }
                    }
                });
        } catch (error) {
            console.error("Error loading recent chats:", error);
            if (window.showAlert) {
                window.showAlert('Error loading recent chats', 'error');
            }
        }
    }

    createUserListItem(userId, userData, lastMessage = null) {
        const div = document.createElement('div');
        div.className = 'chat-list-item';
        div.dataset.userId = userId;
        
        const time = lastMessage?.timestamp ? 
            new Date(lastMessage.timestamp.toDate()).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : '';

        const avatarUrl = userData.photoURL || './assets/default-avatar.png';
        
        div.innerHTML = `
            <img src="${avatarUrl}" alt="${userData.username || 'User'}" 
                 onerror="this.src='./assets/default-avatar.png'"
                 style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
            <div class="chat-info">
                <div class="chat-header">
                    <h4>${userData.username || 'Anonymous'}</h4>
                    ${time ? `<span class="chat-time">${time}</span>` : ''}
                </div>
                <p>
                    <span class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></span>
                    <span class="last-message">
                        ${lastMessage?.text ? 
                            lastMessage.text.substring(0, 30) + (lastMessage.text.length > 30 ? '...' : '') : 
                            (userData.status === 'online' ? 'Online' : 'Offline')}
                    </span>
                </p>
            </div>
        `;

        div.addEventListener('click', () => this.startChat(userId, userData));
        return div;
    }

    async startChat(userId, userData) {
        try {
            if (!this.auth.currentUser) return;
            
            if (this.unsubscribeMessages) {
                this.unsubscribeMessages();
            }

            // Set selected chat and generate chat ID
            this.selectedChat = userId;
            this.currentChatId = [this.auth.currentUser.uid, userId].sort().join('_');

            // Update UI elements
            this.updateChatHeader(userData);

            // Clear messages container
            if (this.messagesContainer) {
                this.messagesContainer.innerHTML = '';
            }

            // Create chat document if it doesn't exist
            const chatRef = this.db.collection('chats').doc(this.currentChatId);
            const chatDoc = await chatRef.get();
            
            if (!chatDoc.exists) {
                await chatRef.set({
                    participants: [this.auth.currentUser.uid, userId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Setup messages listener
            this.unsubscribeMessages = this.db.collection('messages')
                .where('chatId', '==', this.currentChatId)
                .orderBy('timestamp', 'asc')
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const messageData = { ...change.doc.data(), id: change.doc.id };
                            this.displayMessage(messageData);
                        }
                    });
                    
                    // Scroll to bottom after loading messages
                    if (this.messagesContainer) {
                        this.scrollToBottom();
                    }
                });

            // Show chat area and hide no chat selected message
            const activeChat = document.getElementById('activeChat');
            const noChatSelected = document.getElementById('noChatSelected');
            
            if (activeChat && noChatSelected) {
                activeChat.classList.remove('hidden');
                noChatSelected.classList.add('hidden');
            }

            // Show chat area on mobile
            if (window.innerWidth <= 768 && window.uiSystem) {
                window.uiSystem.showChatArea(true);
            }

        } catch (error) {
            console.error("Error starting chat:", error);
            if (window.showAlert) {
                window.showAlert('Error loading chat', 'error');
            }
        }
    }

    updateChatHeader(userData) {
        const avatarElement = document.getElementById('activeChatAvatar');
        const nameElement = document.getElementById('activeChatName');
        const statusElement = document.getElementById('chatStatus');

        if (avatarElement) avatarElement.src = userData.photoURL || './assets/default-avatar.png';
        if (nameElement) nameElement.textContent = userData.username || 'Anonymous';
        if (statusElement) statusElement.textContent = userData.status || 'Offline';
    }

    async sendMessage() {
        if (!this.messageInput.value.trim() || !this.selectedChat) return;

        try {
            const messageText = this.messageInput.value.trim();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            // Add message
            const messageRef = await this.db.collection('messages').add({
                chatId: this.currentChatId,
                senderId: this.auth.currentUser.uid,
                text: messageText,
                timestamp,
                edited: false
            });

            // Update chat document
            await this.db.collection('chats').doc(this.currentChatId).set({
                participants: [this.auth.currentUser.uid, this.selectedChat],
                lastMessage: {
                    text: messageText,
                    timestamp,
                    senderId: this.auth.currentUser.uid
                },
                lastActivity: timestamp,
                updatedAt: timestamp
            }, { merge: true });

            this.messageInput.value = '';
            this.scrollToBottom();
        } catch (error) {
            console.error("Error sending message:", error);
            showAlert('Error sending message', 'error');
        }
    }

    addMessageEventListeners(messageElement, messageData) {
        const copyBtn = messageElement.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyMessage(messageData.text));
        }

        if (messageData.senderId === this.auth.currentUser.uid) {
            const editBtn = messageElement.querySelector('.edit-btn');
            const deleteBtn = messageElement.querySelector('.delete-btn');
            
            if (editBtn) {
                editBtn.addEventListener('click', () => this.editMessage(messageData.id, messageElement));
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteMessage(messageData.id));
            }
        }
    }

    displayMessage(messageData) {
        if (!messageData) return;

        const div = document.createElement('div');
        const isOutgoing = messageData.senderId === this.auth.currentUser.uid;
        div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        div.dataset.messageId = messageData.id;

        const time = messageData.timestamp ? 
            new Date(messageData.timestamp.toDate()).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : '';

        if (messageData.type === 'media') {
            div.innerHTML = this.createMediaMessageHTML(messageData, time, isOutgoing);
        } else {
            // Regular text message HTML
            div.innerHTML = this.createTextMessageHTML(messageData, time, isOutgoing);
        }

        this.addMessageEventListeners(div, messageData);
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    createMediaMessageHTML(messageData, time, isOutgoing) {
        let mediaContent = '';
        
        switch (messageData.mediaType) {
            case 'image':
                mediaContent = `
                    <img src="${messageData.mediaUrl}" alt="Image" 
                        class="message-media" loading="lazy"
                        onclick="window.open('${messageData.mediaUrl}', '_blank')">
                `;
                break;
            case 'video':
                mediaContent = `
                    <video controls class="message-media">
                        <source src="${messageData.mediaUrl}" type="video/${messageData.mediaFormat}">
                        Your browser does not support the video tag.
                    </video>
                `;
                break;
            case 'audio':
                mediaContent = `
                    <audio controls class="message-media">
                        <source src="${messageData.mediaUrl}" type="audio/${messageData.mediaFormat}">
                        Your browser does not support the audio tag.
                    </audio>
                `;
                break;
            default:
                mediaContent = `
                    <div class="file-message">
                        <i class="fas fa-file"></i>
                        <a href="${messageData.mediaUrl}" target="_blank">View File</a>
                    </div>
                `;
        }

        return `
            <div class="message-bubble">
                ${mediaContent}
                <div class="message-metadata">
                    <span class="message-time">${time}</span>
                </div>
            </div>
            <div class="message-actions">
                <button class="action-btn copy-btn" title="Copy Link">
                    <i class="fas fa-link"></i>
                </button>
                ${isOutgoing ? `
                    <button class="action-btn delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    createTextMessageHTML(messageData, time, isOutgoing) {
        return `
            <div class="message-bubble">
                <div class="message-text">${utils.escapeHtml(messageData.text)}</div>
                <div class="message-metadata">
                    <span class="message-time">${time}</span>
                    ${messageData.edited ? '<span class="message-edited">(edited)</span>' : ''}
                </div>
            </div>
            <div class="message-actions">
                <button class="action-btn copy-btn" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                ${isOutgoing ? `
                    <button class="action-btn edit-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    shouldAddTimeDivider(messageDate) {
        if (!messageDate) return false;
        
        const messages = this.messagesContainer.querySelectorAll('.message');
        if (messages.length === 0) return true;

        const lastMessage = messages[messages.length - 1];
        const lastMessageTime = new Date(parseInt(lastMessage.dataset.timestamp));
        
        return !this.isSameDay(messageDate, lastMessageTime) || 
               this.timeDifference(messageDate, lastMessageTime) > 60;
    }

    addTimeDivider(date) {
        const div = document.createElement('div');
        div.className = 'time-divider';
        div.innerHTML = `<span>${this.formatDateDivider(date)}</span>`;
        this.messagesContainer.appendChild(div);
    }

    shouldGroupMessages(lastMessage, newMessage) {
        const lastTime = new Date(parseInt(lastMessage.dataset.timestamp));
        const newTime = newMessage.timestamp?.toDate();
        
        return lastMessage.classList.contains(newMessage.senderId === this.auth.currentUser.uid ? 'outgoing' : 'incoming') &&
               this.timeDifference(newTime, lastTime) < 2;
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    timeDifference(date1, date2) {
        return Math.abs(date1 - date2) / 60000; // difference in minutes
    }

    formatDateDivider(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.isSameDay(date, today)) {
            return 'Today';
        } else if (this.isSameDay(date, yesterday)) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }

    updateMessage(messageId, messageData) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const bubbleElement = messageElement.querySelector('.message-bubble');
            bubbleElement.innerHTML = `
                <div class="message-text">${utils.escapeHtml(messageData.text)}</div>
                <div class="message-metadata">
                    <span class="message-time">${this.formatTime(messageData.timestamp)}</span>
                    ${messageData.edited ? '<span class="message-edited">(edited)</span>' : ''}
                </div>
            `;
        }
    }

    removeMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        return new Date(timestamp.toDate()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    async copyMessage(text) {
        try {
            await navigator.clipboard.writeText(text);
            showAlert('Message copied to clipboard!', 'success');
        } catch (err) {
            showAlert('Failed to copy message', 'error');
        }
    }

    async deleteMessage(messageId) {
        try {
            if (confirm('Are you sure you want to delete this message?')) {
                await this.db.collection('messages').doc(messageId).delete();
                document.querySelector(`[data-message-id="${messageId}"]`).remove();
                showAlert('Message deleted successfully!', 'success');
            }
        } catch (error) {
            showAlert('Failed to delete message', 'error');
        }
    }

    editMessage(messageId, messageElement) {
        const bubbleElement = messageElement.querySelector('.message-bubble');
        const textElement = bubbleElement.querySelector('.message-text');
        const originalText = textElement.textContent.trim();
        const timestamp = messageElement.querySelector('.message-time').textContent;
        
        // Create edit interface
        const editInterface = document.createElement('div');
        editInterface.className = 'edit-interface';
        editInterface.innerHTML = `
            <textarea class="edit-input" placeholder="Edit your message">${originalText}</textarea>
            <div class="edit-actions">
                <button class="edit-btn save-edit">
                    <i class="fas fa-check"></i>
                    <span>Save</span>
                </button>
                <button class="edit-btn cancel-edit">
                    <i class="fas fa-times"></i>
                    <span>Cancel</span>
                </button>
            </div>
        `;

        // Replace bubble content
        bubbleElement.innerHTML = '';
        bubbleElement.appendChild(editInterface);

        // Focus textarea and place cursor at end
        const textarea = editInterface.querySelector('.edit-input');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Handle save
        const handleSave = async () => {
            const newText = textarea.value.trim();
            if (newText && newText !== originalText) {
                try {
                    await this.db.collection('messages').doc(messageId).update({
                        text: newText,
                        edited: true,
                        editedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    bubbleElement.innerHTML = `
                        <div class="message-text">${utils.escapeHtml(newText)}</div>
                        <div class="message-metadata">
                            <span class="message-time">${timestamp}</span>
                            <span class="message-edited">(edited)</span>
                        </div>
                    `;
                    showAlert('Message updated successfully!', 'success');
                } catch (error) {
                    console.error('Error updating message:', error);
                    showAlert('Failed to update message', 'error');
                    this.cancelEdit(bubbleElement, originalText, timestamp);
                }
            } else {
                this.cancelEdit(bubbleElement, originalText, timestamp);
            }
        };

        // Handle cancel
        const handleCancel = () => {
            this.cancelEdit(bubbleElement, originalText, timestamp);
        };

        // Add event listeners
        editInterface.querySelector('.save-edit').addEventListener('click', handleSave);
        editInterface.querySelector('.cancel-edit').addEventListener('click', handleCancel);

        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            }
            if (e.key === 'Escape') {
                handleCancel();
            }
        });
    }

    cancelEdit(bubbleElement, originalText, timestamp) {
        bubbleElement.innerHTML = `
            <div class="message-text">${utils.escapeHtml(originalText)}</div>
            <div class="message-metadata">
                <span class="message-time">${timestamp}</span>
            </div>
        `;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // Add cleanup method
    cleanup() {
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        if (this.unsubscribeChats) this.unsubscribeChats();
    }

    // Add sanitization method
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add this method to update chat lists in real-time
    setupChatListeners() {
        if (!this.currentUser) {
            console.log('No user authenticated');
            return;
        }

        this.unsubscribeChats = this.db.collection('chats')
            .where('participants', 'array-contains', this.currentUser.uid)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach(async change => {
                    if (change.type === 'modified' || change.type === 'added') {
                        const chatData = change.doc.data();
                        const otherUserId = chatData.participants.find(
                            id => id !== this.auth.currentUser.uid
                        );
                        
                        const userDoc = await this.db.collection('users').doc(otherUserId).get();
                        if (userDoc.exists) {
                            this.updateChatListItem(
                                otherUserId,
                                userDoc.data(),
                                chatData.lastMessage
                            );
                        }
                    }
                });
            });
    }

    // Add method to update existing chat items
    updateChatListItem(userId, userData, lastMessage) {
        const selectors = [
            `#chatsList .chat-list-item[data-user-id="${userId}"]`,
            `#recentChatsList .chat-list-item[data-user-id="${userId}"]`
        ];

        selectors.forEach(selector => {
            const chatItem = document.querySelector(selector);
            if (chatItem) {
                const timeElement = chatItem.querySelector('.chat-time');
                const messageElement = chatItem.querySelector('.last-message');

                if (lastMessage?.timestamp) {
                    const time = new Date(lastMessage.timestamp.toDate()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    if (timeElement) timeElement.textContent = time;
                }

                if (messageElement && lastMessage?.text) {
                    messageElement.textContent = lastMessage.text.substring(0, 30) + 
                        (lastMessage.text.length > 30 ? '...' : '');
                }
            }
        });
    }
}

// Initialize chat system only after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize chat system
    window.chatSystem = new ChatSystem();
});