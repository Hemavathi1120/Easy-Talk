// Initialize Firebase with your config
firebase.initializeApp(firebaseConfig);

class AuthSystem {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.init();
        this.setupAuthListener();
        this.createRequiredIndexes(); // Add this line
    }

    init() {
        // Set up login form listener
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('loginEmail').value.trim();
                const password = document.getElementById('loginPassword').value;
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                
                // Disable submit button and show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                
                try {
                    // Validate input
                    if (!email || !password) {
                        throw new Error('Please fill in all fields');
                    }

                    // Attempt login
                    const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                    
                    // Update user status to online
                    await this.db.collection('users').doc(userCredential.user.uid).update({
                        status: 'online',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Show success message
                    window.showAlert('Logged in successfully!', 'success');
                    
                    // Clear form
                    loginForm.reset();

                } catch (error) {
                    console.error('Login error:', error);
                    let errorMessage = 'Login failed. Please try again.';
                    
                    // Handle specific Firebase auth errors
                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage = 'No account found with this email.';
                            break;
                        case 'auth/wrong-password':
                            errorMessage = 'Invalid password.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Invalid email address.';
                            break;
                        case 'auth/user-disabled':
                            errorMessage = 'This account has been disabled.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Too many failed attempts. Please try again later.';
                            break;
                    }
                    
                    window.showAlert(errorMessage, 'error');
                } finally {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Login';
                }
            });
        }

        // Set up signup form listener
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            
            try {
                const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                await this.createUserProfile(userCredential.user.uid, {
                    username,
                    email,
                    status: 'online',
                    photoURL: 'default-avatar.png'
                });
                window.showAlert('Account created successfully!', 'success');
            } catch (error) {
                window.showAlert(error.message, 'error');
            }
        });

        // Set up logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Set up tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.tab === 'login') {
                    document.getElementById('loginForm').classList.remove('hidden');
                    document.getElementById('signupForm').classList.add('hidden');
                } else {
                    document.getElementById('loginForm').classList.add('hidden');
                    document.getElementById('signupForm').classList.remove('hidden');
                }
            });
        });
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            const authContainer = document.getElementById('authContainer');
            const appContainer = document.getElementById('appContainer');

            if (user) {
                // User is signed in
                if (authContainer) authContainer.classList.add('hidden');
                if (appContainer) appContainer.classList.remove('hidden');

                // Update UI with user info
                const userData = await this.getUserData(user.uid);
                if (userData) {
                    const userNameElement = document.getElementById('userName');
                    const userAvatar = document.getElementById('userAvatar');
                    
                    if (userNameElement) userNameElement.textContent = userData.username;
                    if (userAvatar && userData.photoURL) {
                        userAvatar.src = userData.photoURL;
                        userAvatar.onerror = () => {
                            userAvatar.src = './assets/default-avatar.png';
                        };
                    }
                }

                // Initialize chat system for mobile
                if (window.innerWidth <= 768 && window.uiSystem) {
                    window.uiSystem.showUsersPage();
                }
            } else {
                // User is signed out
                if (authContainer) authContainer.classList.remove('hidden');
                if (appContainer) appContainer.classList.add('hidden');
            }
        });
    }

    async createUserProfile(uid, data) {
        try {
            await this.db.collection('users').doc(uid).set({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error creating user profile:", error);
            throw error;
        }
    }

    async updateUserStatus(uid, status) {
        try {
            await this.db.collection('users').doc(uid).update({
                status,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating user status:", error);
        }
    }

    async getUserData(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error("Error getting user data:", error);
            return null;
        }
    }

    async handleLogout() {
        try {
            const user = this.auth.currentUser;
            if (user) {
                // Show loading state
                const logoutBtn = document.getElementById('logoutBtn');
                const logoutBtnMobile = document.getElementById('logoutBtnMobile');
                
                if (logoutBtn) {
                    logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                    logoutBtn.disabled = true;
                }
                if (logoutBtnMobile) {
                    logoutBtnMobile.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    logoutBtnMobile.disabled = true;
                }

                // Update user status to offline
                await this.db.collection('users').doc(user.uid).update({
                    status: 'offline',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });

                await this.auth.signOut();
                
                // Show success message before reload
                window.showAlert('Logged out successfully!', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            window.showAlert('Error logging out: ' + error.message, 'error');
            
            // Reset buttons on error
            const logoutBtn = document.getElementById('logoutBtn');
            const logoutBtnMobile = document.getElementById('logoutBtnMobile');
            
            if (logoutBtn) {
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                logoutBtn.disabled = false;
            }
            if (logoutBtnMobile) {
                logoutBtnMobile.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
                logoutBtnMobile.disabled = false;
            }
        }
    }

    // Add index checking and automatic creation for Firestore
    createRequiredIndexes() {
        const db = firebase.firestore();
        
        // Create composite index for chats collection
        db.collection('chats')
            .where('participants', 'array-contains', '')
            .orderBy('lastActivity', 'desc')
            .get()
            .catch(error => {
                if (error.code === 'failed-precondition') {
                    console.warn('Please create the following index in Firebase Console:', error.details);
                }
            });
    }
}

// Initialize auth system
window.authSystem = new AuthSystem();