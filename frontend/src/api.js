import axios from 'axios';

// Base configuration
export const serverUrl = "http://localhost:8000";

// Create axios instance with default configuration
const api = axios.create({
  baseURL: serverUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API calls
export const authAPI = {
  signup: (userData) => api.post('/api/auth/signup', userData),
  signin: (credentials) => api.post('/api/auth/signin', credentials),
  signout: () => api.get('/api/auth/signout'),
  googleAuth: (googleData) => api.post('/api/auth/google-auth', googleData),
  sendOtp: (email) => api.post('/api/auth/send-otp', { email }),
  verifyOtp: (email, otp) => api.post('/api/auth/verify-otp', { email, otp }),
  resetPassword: (email, newPassword) => api.post('/api/auth/reset-password', { email, newPassword }),
  getUserTypes: () => api.get('/api/auth/user-types'),
};

// User API calls
export const userAPI = {
  getCurrentUser: () => api.get('/api/user/current'),
  setActive: (isActive) => api.put('/api/user/set-active', { isActive }),
  updateLocation: (lat, lon) => api.post('/api/user/update-location', { lat, lon }),
};

// Shop API calls
export const shopAPI = {
  createEdit: (formData) => api.post('/api/shop/create-edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => api.get('/api/shop/get-all'),
  getMy: () => api.get('/api/shop/get-my'),
  updateStatus: (status) => api.put('/api/shop/update-status', { status }),
};

// Item API calls
export const itemAPI = {
  addItem: (formData) => api.post('/api/item/add-item', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  editItem: (itemId, formData) => api.post(`/api/item/edit-item/${itemId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getById: (itemId) => api.get(`/api/item/get-by-id/${itemId}`),
  getByCity: (city) => api.get(`/api/item/get-by-city/${city}`),
  getByShop: (shopId) => api.get(`/api/item/get-by-shop/${shopId}`),
  deleteItem: (itemId) => api.get(`/api/item/delete/${itemId}`),
  updateStock: (itemId, inStock) => api.put(`/api/item/update-stock/${itemId}`, { inStock }),
  searchItems: (query, city) => api.get(`/api/item/search-items?query=${query}&city=${city}`),
};

// Order API calls
export const orderAPI = {
  placeOrder: (orderData) => api.post('/api/order/place-order', orderData),
  verifyPayment: (paymentData) => api.post('/api/order/verify-payment', paymentData),
  getMyOrders: () => api.get('/api/order/my-orders'),
  getOrderById: (orderId) => api.get(`/api/order/get-order-by-id/${orderId}`),
  updateStatus: (orderId, shopId, status) => api.post(`/api/order/update-status/${orderId}/${shopId}`, { status }),
  deleteOrder: (orderId) => api.delete(`/api/order/delete-order/${orderId}`),
  cancelOrder: (orderId, reason) => api.post(`/api/order/cancel-order/${orderId}`, { reason }),
  updateSpecialInstructions: (orderId, instructions) => api.put(`/api/order/update-special-instructions/${orderId}`, { instructions }),
  sendDeliveryOtp: (data) => api.post('/api/order/send-delivery-otp', data),
  verifyDeliveryOtp: (orderId, shopOrderId, otp) => api.post('/api/order/verify-delivery-otp', { orderId, shopOrderId, otp }),
  getAssignments: () => api.get('/api/order/get-assignments'),
  getCurrentOrders: () => api.get('/api/order/get-current-orders'),
  acceptOrder: (assignmentId) => api.get(`/api/order/accept-order/${assignmentId}`),
  getTodayDeliveries: () => api.get('/api/order/get-today-deliveries'),
};

// Rating API calls
export const ratingAPI = {
  getShopRatings: () => api.get('/api/rating/shop/my'),
  getDeliveryRatings: () => api.get('/api/rating/delivery/my'),
  getOrderRating: (orderId) => api.get(`/api/rating/order/${orderId}`),
  submitRating: (ratingData) => api.post('/api/rating/submit', ratingData),
};

// Categories API calls
export const categoryAPI = {
  getCategories: () => api.get('/api/categories'),
};

// Super Admin API calls
export const superAdminAPI = {
  getDashboardStats: () => api.get('/api/superadmin/dashboard-stats'),
  getPendingDeliveryBoys: () => api.get('/api/superadmin/pending-deliveryboys'),
  getPendingOwners: () => api.get('/api/superadmin/pending-owners'),
  updateDeliveryBoyStatus: (userId, action) => api.post('/api/superadmin/update-deliveryboy-status', { userId, action }),
  updateOwnerStatus: (userId, action) => api.post('/api/superadmin/update-owner-status', { userId, action }),
  getCategories: () => api.get('/api/superadmin/categories'),
  createCategory: (formData) => api.post('/api/superadmin/categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteCategory: (categoryId) => api.delete(`/api/superadmin/categories/${categoryId}`),
  updateCategory: (categoryId, formData) => api.put(`/api/superadmin/categories/${categoryId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUsers: (params) => api.get(`/api/superadmin/users?${params.toString()}`),
  getUserTypes: () => api.get('/api/superadmin/user-types'),
  createUserType: (newUserType) => api.post('/api/superadmin/user-types', newUserType),
  updateUserTypeDelivery: (userTypeId, deliveryAllowed) => api.put(`/api/superadmin/user-types/${userTypeId}/delivery`, { deliveryAllowed }),
  deleteUserType: (userTypeId) => api.delete(`/api/superadmin/user-types/${userTypeId}`),
};

// Export the configured axios instance for custom requests
export default api;