import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/userSlice';
import { authAPI, superAdminAPI } from '../api';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Dashboard data
    const [dashboardStats, setDashboardStats] = useState({
        userCount: 0,
        ownerCount: 0,
        deliveryBoyCount: 0,
        pendingOwnerCount: 0,
        categoryCount: 0
    });

    // Delivery boy approvals data
    const [pendingDeliveryBoys, setPendingDeliveryBoys] = useState([]);
    const [pendingOwners, setPendingOwners] = useState([]);

    // Categories data
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState({ name: '', description: '', image: null });
    const [categoryImagePreview, setCategoryImagePreview] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editCategoryData, setEditCategoryData] = useState({ name: '', description: '', image: null });
    const [editCategoryImagePreview, setEditCategoryImagePreview] = useState(null);

    // User management data
    const [users, setUsers] = useState([]);
    const [searchRole, setSearchRole] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // User types data
    const [userTypes, setUserTypes] = useState([]);
    const [newUserType, setNewUserType] = useState({ name: '', description: '', deliveryAllowed: false });



    // Effects moved below to avoid referencing callbacks before initialization

    const showMessage = (message, type = 'success') => {
        if (type === 'success') {
            setSuccess(message);
            setError('');
        } else {
            setError(message);
            setSuccess('');
        }
        setTimeout(() => {
            setSuccess('');
            setError('');
        }, 3000);
    };

    const handleLogout = async () => {
        try {
            await authAPI.signout();
            dispatch(logout());
            navigate('/signin');
        } catch (error) {
            console.error('Logout error:', error);
            showMessage('Error logging out', 'error');
        }
    };

    // Fetch dashboard statistics
    const fetchDashboardStats = useCallback(async () => {
        try {
            setLoading(true);
            const response = await superAdminAPI.getDashboardStats();
            setDashboardStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            showMessage('Error fetching dashboard statistics', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch pending delivery boys
    const fetchPendingDeliveryBoys = useCallback(async () => {
        try {
            setLoading(true);
            const response = await superAdminAPI.getPendingDeliveryBoys();
            setPendingDeliveryBoys(response.data);
        } catch (error) {
            console.error('Error fetching pending delivery boys:', error);
            showMessage('Error fetching pending delivery boys', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch pending owners
    const fetchPendingOwners = useCallback(async () => {
        try {
            setLoading(true);
            const response = await superAdminAPI.getPendingOwners();
            setPendingOwners(response.data);
        } catch (error) {
            console.error('Error fetching pending owners:', error);
            showMessage('Error fetching pending owners', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Update delivery boy status
    const updateDeliveryBoyStatus = async (userId, action) => {
        try {
            setLoading(true);
            await superAdminAPI.updateDeliveryBoyStatus(userId, action);
            showMessage(`Delivery boy ${action}d successfully`);
            fetchPendingDeliveryBoys(); // Refresh the list
            fetchDashboardStats(); // Refresh stats
        } catch (error) {
            console.error('Error updating delivery boy status:', error);
            showMessage('Error updating delivery boy status', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Update owner status
    const updateOwnerStatus = async (userId, action) => {
        try {
            setLoading(true);
            await superAdminAPI.updateOwnerStatus(userId, action);
            showMessage(`Owner ${action}d successfully`);
            fetchPendingOwners(); // Refresh the list
            fetchDashboardStats(); // Refresh stats
        } catch (error) {
            console.error('Error updating owner status:', error);
            showMessage('Error updating owner status', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const response = await superAdminAPI.getCategories();
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            showMessage('Error fetching categories', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Create category
    const createCategory = async () => {
        if (!newCategory.name.trim()) {
            showMessage('Category name is required', 'error');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', newCategory.name);
            formData.append('description', newCategory.description);
            if (newCategory.image) {
                formData.append('image', newCategory.image);
            }
            
            await superAdminAPI.createCategory(formData);
            showMessage('Category created successfully');
            setNewCategory({ name: '', description: '', image: null });
            setCategoryImagePreview(null);
            fetchCategories(); // Refresh the list
            fetchDashboardStats(); // Refresh stats
        } catch (error) {
            console.error('Error creating category:', error);
            const errorMessage = error.response?.data?.message || 'Error creating category';
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Delete category
    const deleteCategory = async (categoryId) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        try {
            setLoading(true);
            await superAdminAPI.deleteCategory(categoryId);
            showMessage('Category deleted successfully');
            fetchCategories(); // Refresh the list
            fetchDashboardStats(); // Refresh stats
        } catch (error) {
            console.error('Error deleting category:', error);
            showMessage('Error deleting category', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Start editing category
    const startEditCategory = (category) => {
        setEditingCategory(category._id);
        setEditCategoryData({
            name: category.name,
            description: category.description,
            image: null
        });
        setEditCategoryImagePreview(category.image);
    };

    // Cancel editing category
    const cancelEditCategory = () => {
        setEditingCategory(null);
        setEditCategoryData({ name: '', description: '', image: null });
        setEditCategoryImagePreview(null);
    };

    // Update category
    const updateCategory = async (categoryId) => {
        if (!editCategoryData.name.trim()) {
            showMessage('Category name is required', 'error');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', editCategoryData.name);
            formData.append('description', editCategoryData.description);
            if (editCategoryData.image) {
                formData.append('image', editCategoryData.image);
            }
            
            await superAdminAPI.updateCategory(categoryId, formData);
            showMessage('Category updated successfully');
            setEditingCategory(null);
            setEditCategoryData({ name: '', description: '', image: null });
            setEditCategoryImagePreview(null);
            fetchCategories(); // Refresh the list
            fetchDashboardStats(); // Refresh stats
        } catch (error) {
            console.error('Error updating category:', error);
            const errorMessage = error.response?.data?.message || 'Error updating category';
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchRole !== 'all') params.append('role', searchRole);
            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            
            const response = await superAdminAPI.getUsers(params);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showMessage('Error fetching users', 'error');
        } finally {
            setLoading(false);
        }
    }, [searchRole, searchTerm]);

    // Fetch user types
    const fetchUserTypes = useCallback(async () => {
        try {
            setLoading(true);
            const response = await superAdminAPI.getUserTypes();
            setUserTypes(response.data);
        } catch (error) {
            console.error('Error fetching user types:', error);
            showMessage('Error fetching user types', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch initial dashboard stats and set auto-refresh
    useEffect(() => {
        fetchDashboardStats();
        const interval = setInterval(fetchDashboardStats, 30000);
        return () => clearInterval(interval);
    }, [fetchDashboardStats]);

    // Fetch data based on active tab
    useEffect(() => {
        if (activeTab === 'deliveryboys') {
            fetchPendingDeliveryBoys();
        } else if (activeTab === 'owners') {
            fetchPendingOwners();
        } else if (activeTab === 'categories') {
            fetchCategories();
        } else if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'usertypes') {
            fetchUserTypes();
        }
    }, [activeTab, fetchPendingDeliveryBoys, fetchPendingOwners, fetchCategories, fetchUsers, fetchUserTypes]);

    // Debounced search for users
    useEffect(() => {
        if (activeTab === 'users') {
            const debounceTimer = setTimeout(() => {
                fetchUsers();
            }, 500);
            return () => clearTimeout(debounceTimer);
        }
    }, [searchRole, searchTerm, activeTab, fetchUsers]);

    // Create user type
    const createUserType = async () => {
        if (!newUserType.name.trim()) {
            showMessage('User type name is required', 'error');
            return;
        }

        try {
            setLoading(true);
            await superAdminAPI.createUserType(newUserType);
            showMessage('User type created successfully');
            setNewUserType({ name: '', description: '', deliveryAllowed: false });
            fetchUserTypes(); // Refresh the list
        } catch (error) {
            console.error('Error creating user type:', error);
            showMessage('Error creating user type', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Update user type delivery status
    const updateUserTypeDelivery = async (userTypeId, deliveryAllowed) => {
        try {
            setLoading(true);
            await superAdminAPI.updateUserTypeDelivery(userTypeId, deliveryAllowed);
            showMessage(`Delivery ${deliveryAllowed ? 'enabled' : 'disabled'} successfully`);
            fetchUserTypes(); // Refresh the list
        } catch (error) {
            console.error('Error updating user type delivery:', error);
            showMessage('Error updating delivery status', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Delete user type
    const deleteUserType = async (userTypeId) => {
        if (!window.confirm('Are you sure you want to delete this user type?')) return;

        try {
            setLoading(true);
            await superAdminAPI.deleteUserType(userTypeId);
            showMessage('User type deleted successfully');
            fetchUserTypes(); // Refresh the list
        } catch (error) {
            console.error('Error deleting user type:', error);
            showMessage('Error deleting user type', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-8">
                        {[
                            { id: 'dashboard', label: 'Dashboard' },
                            { id: 'deliveryboys', label: 'Delivery Boy Approvals' },
                            { id: 'owners', label: 'Owner Approvals' },
                            { id: 'categories', label: 'Categories' },
                            { id: 'users', label: 'User Management' },
                            { id: 'usertypes', label: 'User Types' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                {/* Dashboard Overview */}
                {activeTab === 'dashboard' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                                <p className="text-2xl font-bold text-blue-600">{dashboardStats.userCount}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Total Owners</h3>
                                <p className="text-2xl font-bold text-green-600">{dashboardStats.ownerCount}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Delivery Boys</h3>
                                <p className="text-2xl font-bold text-purple-600">{dashboardStats.deliveryBoyCount}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Pending Owners</h3>
                                <p className="text-2xl font-bold text-orange-600">{dashboardStats.pendingOwnerCount}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Categories</h3>
                                <p className="text-2xl font-bold text-indigo-600">{dashboardStats.categoryCount}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delivery Boy Approvals */}
                {activeTab === 'deliveryboys' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Pending Delivery Boy Approvals</h2>
                        {loading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : pendingDeliveryBoys.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No pending approvals</div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {pendingDeliveryBoys.map((deliveryBoy) => (
                                        <li key={deliveryBoy._id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">{deliveryBoy.fullName}</h3>
                                                    <p className="text-sm text-gray-500">{deliveryBoy.email}</p>
                                                    <p className="text-sm text-gray-500">{deliveryBoy.mobile}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => updateDeliveryBoyStatus(deliveryBoy._id, 'approve')}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                                                        disabled={loading}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => updateDeliveryBoyStatus(deliveryBoy._id, 'reject')}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                                                        disabled={loading}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Owner Approvals */}
                {activeTab === 'owners' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Pending Owner Approvals</h2>
                        {loading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : pendingOwners.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No pending approvals</div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {pendingOwners.map((owner) => (
                                        <li key={owner._id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">{owner.fullName}</h3>
                                                    <p className="text-sm text-gray-500">{owner.email}</p>
                                                    <p className="text-sm text-gray-500">{owner.mobile}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => updateOwnerStatus(owner._id, 'approve')}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                                                        disabled={loading}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => updateOwnerStatus(owner._id, 'reject')}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                                                        disabled={loading}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Categories */}
                {activeTab === 'categories' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Category Management</h2>
                        
                        {/* Add Category Form */}
                        <div className="bg-white p-6 rounded-lg shadow mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Category Name"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            {/* Image Upload Section */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setNewCategory({ ...newCategory, image: file });
                                            setCategoryImagePreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                />
                                {categoryImagePreview && (
                                    <div className="mt-2">
                                        <img 
                                            src={categoryImagePreview} 
                                            alt="Category preview" 
                                            className="w-32 h-32 object-cover rounded-lg border"
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={createCategory}
                                disabled={loading}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                            >
                                Add Category
                            </button>
                        </div>

                        {/* Categories List */}
                        {loading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {categories.map((category) => (
                                        <li key={category._id} className="px-6 py-4">
                                            {editingCategory === category._id ? (
                                                // Edit Mode
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Category Name"
                                                            value={editCategoryData.name}
                                                            onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                                                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={editCategoryData.description}
                                                            onChange={(e) => setEditCategoryData({ ...editCategoryData, description: e.target.value })}
                                                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    
                                                    {/* Image Upload Section for Edit */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setEditCategoryData({ ...editCategoryData, image: file });
                                                                    setEditCategoryImagePreview(URL.createObjectURL(file));
                                                                }
                                                            }}
                                                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                        />
                                                        {editCategoryImagePreview && (
                                                            <div className="mt-2">
                                                                <img 
                                                                    src={editCategoryImagePreview} 
                                                                    alt="Category preview" 
                                                                    className="w-32 h-32 object-cover rounded-lg border"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => updateCategory(category._id)}
                                                            disabled={loading}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelEditCategory}
                                                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        {category.image && (
                                                            <img 
                                                                src={category.image} 
                                                                alt={category.name}
                                                                className="w-16 h-16 object-cover rounded-lg border"
                                                            />
                                                        )}
                                                        <div>
                                                            <h3 className="text-lg font-medium text-gray-900">
                                                                {category.name} 
                                                                <span className="text-sm text-blue-600 ml-2">
                                                                    (ID: {category.categoryId || category._id})
                                                                </span>
                                                            </h3>
                                                            <p className="text-sm text-gray-500">{category.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => startEditCategory(category)}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                                                            disabled={loading}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCategory(category._id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                                                            disabled={loading}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* User Management */}
                {activeTab === 'users' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">User Management</h2>
                        
                        {/* Search and Filter */}
                        <div className="bg-white p-6 rounded-lg shadow mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select
                                    value={searchRole}
                                    onChange={(e) => setSearchRole(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="user">Users</option>
                                    <option value="owner">Owners</option>
                                    <option value="deliveryBoy">Delivery Boys</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Users List */}
                        {loading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No users found</div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <li key={user._id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">{user.fullName}</h3>
                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                    <p className="text-sm text-gray-500">{user.mobile}</p>
                                                    <div className="flex items-center space-x-4 mt-2">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                            user.role === 'user' ? 'bg-blue-100 text-blue-800' :
                                                            user.role === 'owner' ? 'bg-green-100 text-green-800' :
                                                            user.role === 'deliveryBoy' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {user.role}
                                                        </span>
                                                        {user.role === 'owner' && (
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                                user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {user.isApproved ? 'Approved' : 'Pending'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* User Types Management */}
                {activeTab === 'usertypes' && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">User Types Management</h2>
                        
                        {/* Add User Type Form */}
                        <div className="bg-white p-6 rounded-lg shadow mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User Type</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="User Type Name"
                                    value={newUserType.name}
                                    onChange={(e) => setNewUserType({ ...newUserType, name: e.target.value })}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={newUserType.description}
                                    onChange={(e) => setNewUserType({ ...newUserType, description: e.target.value })}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mt-4 flex items-center">
                                <input
                                    type="checkbox"
                                    id="deliveryAllowed"
                                    checked={newUserType.deliveryAllowed}
                                    onChange={(e) => setNewUserType({ ...newUserType, deliveryAllowed: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="deliveryAllowed" className="ml-2 block text-sm text-gray-900">
                                    Allow Delivery for this User Type
                                </label>
                            </div>
                            <button
                                onClick={createUserType}
                                disabled={loading}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                            >
                                Add User Type
                            </button>
                        </div>

                        {/* User Types List */}
                        {loading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : userTypes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No user types found</div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {userTypes.map((userType) => (
                                        <li key={userType._id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">{userType.name}</h3>
                                                    <p className="text-sm text-gray-500">{userType.description}</p>
                                                    <div className="mt-2">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                            userType.deliveryAllowed 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            Delivery: {userType.deliveryAllowed ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => updateUserTypeDelivery(userType._id, !userType.deliveryAllowed)}
                                                        className={`px-4 py-2 rounded-lg text-white ${
                                                            userType.deliveryAllowed 
                                                                ? 'bg-red-600 hover:bg-red-700' 
                                                                : 'bg-green-600 hover:bg-green-700'
                                                        }`}
                                                        disabled={loading}
                                                    >
                                                        {userType.deliveryAllowed ? 'Disable Delivery' : 'Enable Delivery'}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUserType(userType._id)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                                                        disabled={loading}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminDashboard;