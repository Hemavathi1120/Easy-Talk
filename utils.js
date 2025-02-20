const utils = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatTime(timestamp) {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    generateAvatarUrl(username) {
        return `./assets/default-avatar.png`;
    },

    getInitials(username) {
        if (!username) return '?';
        return username
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    getAvatarColor(username) {
        if (!username) return '#6366f1';
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#ec4899',
            '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316'
        ];
        return colors[Math.abs(hash) % colors.length];
    }
};

window.utils = utils;
