// Initialize Firebase with your config
firebase.initializeApp(firebaseConfig);

class AuthSystem {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.init();
        this.createRequiredIndexes(); // Add this line
    }

    init() {
        // Set up login form listener
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                window.showAlert('Logged in successfully!', 'success');
                this.updateUserStatus(userCredential.user.uid, 'online');
            } catch (error) {
                window.showAlert(error.message, 'error');
            }
        });

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

        // Set up auth state observer
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                document.getElementById('authContainer').classList.add('hidden');
                document.getElementById('appContainer').classList.remove('hidden');
                
                const userData = await this.getUserData(user.uid);
                if (userData) {
                    document.getElementById('userName').textContent = userData.username;
                    if (userData.photoURL) {
                        document.getElementById('userAvatar').src = userData.photoURL;
                    }
                }

                // Initialize chat system for mobile
                if (window.innerWidth <= 768 && window.uiSystem) {
                    window.uiSystem.showUsersPage();
                }
            } else {
                document.getElementById('authContainer').classList.remove('hidden');
                document.getElementById('appContainer').classList.add('hidden');
            }
        });

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
                // Update user status to offline
                await this.db.collection('users').doc(user.uid).update({
                    status: 'offline',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await this.auth.signOut();
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            window.showAlert('Error logging out: ' + error.message, 'error');
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