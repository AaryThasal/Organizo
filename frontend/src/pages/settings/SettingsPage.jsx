import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateProfile, getCurrentUser } from '../../store/authSlice';
import { showToast } from '../../store/uiSlice';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';

// Settings page for profile, password, and org settings
function SettingsPage() {
    const dispatch = useDispatch();
    const { user, organization, isLoading } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);

    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [orgData, setOrgData] = useState({
        name: '',
        joinCode: '',
    });
    const [saving, setSaving] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingOrg, setSavingOrg] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    // Profile image states
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [removingImage, setRemovingImage] = useState(false);

    // Organization logo states
    const [logoPreview, setLogoPreview] = useState(null);
    const [selectedLogo, setSelectedLogo] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [removingLogo, setRemovingLogo] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileData({
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                email: user.email || '',
            });
        }

        if (user?.role === 'admin') {
            fetchOrgData();
        }
    }, [user]);

    // Fetch org name and join code (admin only)
    const fetchOrgData = async () => {
        try {
            const [orgRes, codeRes] = await Promise.all([
                api.get('/organization'),
                api.get('/organization/join-code'),
            ]);
            setOrgData({
                name: orgRes.data.data.name,
                joinCode: codeRes.data.data.joinCode,
                logoUrl: orgRes.data.data.logo_url || null,
            });
        } catch (error) {
            console.error('Failed to fetch org data:', error);
        }
    };

    // Handle file selection for profile image
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            dispatch(showToast({ type: 'error', message: 'Please select an image file' }));
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            dispatch(showToast({ type: 'error', message: 'Image must be less than 5MB' }));
            return;
        }

        setSelectedFile(file);
        // Create preview URL
        setImagePreview(URL.createObjectURL(file));
    };

    // Upload image to server
    const handleImageUpload = async () => {
        if (!selectedFile) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

            await api.post('/users/profile/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            dispatch(showToast({ type: 'success', message: 'Profile image updated!' }));
            // Refresh user data to get new image URL
            dispatch(getCurrentUser());
            // Clear preview
            setSelectedFile(null);
            setImagePreview(null);
        } catch (error) {
            dispatch(showToast({
                type: 'error',
                message: error.response?.data?.message || 'Failed to upload image'
            }));
        }
        setUploadingImage(false);
    };

    // Remove profile image
    const handleRemoveImage = async () => {
        if (!user?.profile_image_url) return;
        if (!window.confirm('Remove your profile picture?')) return;

        setRemovingImage(true);
        try {
            await api.delete('/users/profile/image');
            dispatch(showToast({ type: 'success', message: 'Profile image removed!' }));
            dispatch(getCurrentUser());
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Failed to remove image' }));
        }
        setRemovingImage(false);
    };

    // Cancel image selection
    const handleCancelImage = () => {
        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const result = await dispatch(updateProfile(profileData));

        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Profile updated successfully' }));
        } else {
            dispatch(showToast({ type: 'error', message: result.payload || 'Failed to update profile' }));
        }

        setSaving(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            dispatch(showToast({ type: 'error', message: 'Passwords do not match' }));
            return;
        }

        if (passwordData.newPassword.length < 6) {
            dispatch(showToast({ type: 'error', message: 'Password must be at least 6 characters' }));
            return;
        }

        setSavingPassword(true);

        const result = await dispatch(updateProfile({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
        }));

        if (!result.error) {
            dispatch(showToast({ type: 'success', message: 'Password updated successfully' }));
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } else {
            dispatch(showToast({ type: 'error', message: result.payload || 'Failed to update password' }));
        }

        setSavingPassword(false);
    };

    const handleOrgSubmit = async (e) => {
        e.preventDefault();
        setSavingOrg(true);

        try {
            await api.put('/organization', { name: orgData.name });
            dispatch(showToast({ type: 'success', message: 'Organization name updated' }));
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Failed to update organization' }));
        }

        setSavingOrg(false);
    };

    const handleRegenerateCode = async () => {
        if (!window.confirm('Are you sure you want to regenerate the join code? The old code will no longer work.')) {
            return;
        }

        setRegenerating(true);

        try {
            const res = await api.post('/organization/regenerate-code');
            setOrgData({ ...orgData, joinCode: res.data.data.joinCode });
            dispatch(showToast({ type: 'success', message: 'Join code regenerated successfully' }));
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Failed to regenerate code' }));
        }

        setRegenerating(false);
    };

    const copyJoinCode = () => {
        navigator.clipboard.writeText(orgData.joinCode);
        dispatch(showToast({ type: 'success', message: 'Join code copied to clipboard!' }));
    };

    // Handle logo file selection
    const handleLogoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            dispatch(showToast({ type: 'error', message: 'Please select an image file' }));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            dispatch(showToast({ type: 'error', message: 'Image must be less than 5MB' }));
            return;
        }

        setSelectedLogo(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    // Upload logo to server
    const handleLogoUpload = async () => {
        if (!selectedLogo) return;

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', selectedLogo);

            await api.post('/organization/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            dispatch(showToast({ type: 'success', message: 'Organization logo updated!' }));
            dispatch(getCurrentUser());
            setSelectedLogo(null);
            setLogoPreview(null);
            fetchOrgData();
        } catch (error) {
            dispatch(showToast({
                type: 'error',
                message: error.response?.data?.message || 'Failed to upload logo'
            }));
        }
        setUploadingLogo(false);
    };

    // Remove organization logo
    const handleRemoveLogo = async () => {
        if (!window.confirm('Remove the organization logo?')) return;

        setRemovingLogo(true);
        try {
            await api.delete('/organization/logo');
            dispatch(showToast({ type: 'success', message: 'Organization logo removed!' }));
            dispatch(getCurrentUser());
            setOrgData({ ...orgData, logoUrl: null });
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Failed to remove logo' }));
        }
        setRemovingLogo(false);
    };

    // Cancel logo selection
    const handleCancelLogo = () => {
        setSelectedLogo(null);
        setLogoPreview(null);
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    return (
        <div className="animate-fade-in max-w-3xl">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-description">Manage your account and organization settings</p>
            </div>

            {/* Profile Section */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-6">Profile Information</h2>

                {/* Profile Image Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-dark-elevated rounded-xl">
                    {/* Current/Preview Image */}
                    <div className="relative">
                        {imagePreview ? (
                            // Show preview of selected image
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-20 h-20 rounded-full object-cover border-2 border-primary-500"
                            />
                        ) : (
                            // Show current profile image or avatar
                            <Avatar
                                firstName={user?.first_name}
                                lastName={user?.last_name}
                                profileImageUrl={user?.profile_image_url}
                                size="xl"
                            />
                        )}
                    </div>

                    <div className="flex-1">
                        <p className="font-medium text-text-primary">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-sm text-text-secondary">{user?.email}</p>
                        <p className="text-xs text-text-muted capitalize mt-1">{user?.role}</p>

                        {/* Image Upload Controls */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {selectedFile ? (
                                // Show upload/cancel when file is selected
                                <>
                                    <Button
                                        size="sm"
                                        onClick={handleImageUpload}
                                        loading={uploadingImage}
                                    >
                                        Upload Image
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleCancelImage}
                                        disabled={uploadingImage}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                // Show choose/remove buttons
                                <>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {user?.profile_image_url ? 'Change Photo' : 'Upload Photo'}
                                    </Button>
                                    {user?.profile_image_url && (
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={handleRemoveImage}
                                            loading={removingImage}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
    
                    </div>
                </div>

                <form onSubmit={handleProfileSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            required
                        />
                        <Input
                            label="Last Name"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                            required
                        />
                    </div>
                    <Input
                        label="Email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        required
                    />
                    <Button type="submit" loading={saving}>
                        Save Changes
                    </Button>
                </form>
            </div>

            {/* Password Section */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-6">Change Password</h2>

                <form onSubmit={handlePasswordSubmit}>
                    <Input
                        label="Current Password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                    />
                    <Input
                        label="New Password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                    />
                    <Input
                        label="Confirm New Password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                    />
                    <Button type="submit" loading={savingPassword}>
                        Update Password
                    </Button>
                </form>
            </div>

            {/* Organization Section (Admin Only) */}
            {user?.role === 'admin' && (
                <div className="card">
                    <h2 className="text-lg font-semibold text-text-primary mb-6">Organization Settings</h2>

                    {/* Organization Logo Section */}
                    <div className="mb-6 p-4 bg-dark-elevated rounded-xl">
                        <label className="block text-sm font-medium text-text-primary mb-3">
                            Organization Logo
                        </label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Current/Preview Logo */}
                            <div className="relative">
                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="Logo preview"
                                        className="w-16 h-16 rounded-full object-cover border-2 border-primary-500"
                                    />
                                ) : orgData.logoUrl ? (
                                    <img
                                        src={orgData.logoUrl}
                                        alt="Organization logo"
                                        className="w-16 h-16 rounded-full object-cover ring-2 ring-dark-border"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-dark-card border-2 border-dashed border-dark-border flex items-center justify-center">
                                        <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <p className="text-sm text-text-secondary mb-2">
                                    Upload a logo for your organization. It will appear in the navbar for all members.
                                </p>

                                {/* Logo Upload Controls */}
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoSelect}
                                        className="hidden"
                                    />

                                    {selectedLogo ? (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={handleLogoUpload}
                                                loading={uploadingLogo}
                                            >
                                                Upload Logo
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={handleCancelLogo}
                                                disabled={uploadingLogo}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => logoInputRef.current?.click()}
                                            >
                                                {orgData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                            </Button>
                                            {orgData.logoUrl && (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={handleRemoveLogo}
                                                    loading={removingLogo}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleOrgSubmit} className="mb-6">
                        <Input
                            label="Organization Name"
                            value={orgData.name}
                            onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                            required
                        />
                        <Button type="submit" loading={savingOrg}>
                            Update Organization Name
                        </Button>
                    </form>

                    <div className="border-t border-dark-border pt-6">
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Organization Join Code
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-dark-elevated rounded-xl">
                                <code className="text-lg font-mono font-bold text-primary-400 tracking-widest">
                                    {orgData.joinCode || '------'}
                                </code>
                                <button
                                    type="button"
                                    onClick={copyJoinCode}
                                    className="p-2 rounded-lg text-text-muted hover:bg-dark-border hover:text-text-primary transition-colors"
                                    title="Copy to clipboard"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleRegenerateCode}
                                loading={regenerating}
                            >
                                Regenerate
                            </Button>
                        </div>
                        <p className="text-xs text-text-secondary mt-2">
                            Share this code with team members to let them join your organization.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SettingsPage;
