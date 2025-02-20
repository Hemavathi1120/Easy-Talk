const cloudinaryConfig = {
    cloudName: 'dobktsnix',
    uploadPreset: 'easy-talk',
    apiUrl: 'https://api.cloudinary.com/v1_1/dobktsnix/auto/upload'
};

const cloudinaryUtils = {
    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            const response = await fetch(cloudinaryConfig.apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            return {
                url: data.secure_url,
                publicId: data.public_id,
                resourceType: data.resource_type,
                format: data.format
            };
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw error;
        }
    },

    getFileType(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'file';
    },

    getIconForFile(fileType) {
        switch (fileType) {
            case 'image': return '🖼️';
            case 'video': return '🎥';
            case 'audio': return '🎵';
            default: return '📎';
        }
    }
};

window.cloudinaryUtils = cloudinaryUtils;
