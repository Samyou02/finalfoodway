import axios from 'axios';

const baseURL = 'http://localhost:8000';
let authToken = '';

// Create axios instance
const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test results storage
const testResults = {
  auth: {},
  user: {},
  shop: {},
  order: {},
  superadmin: {},
  categories: {}
};

// Helper function to log test results
function logTest(category, endpoint, status, data = null, error = null) {
  const result = {
    endpoint,
    status,
    timestamp: new Date().toISOString(),
    data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 200) : data) : null,
    error: error ? error.message : null
  };
  
  if (!testResults[category]) testResults[category] = {};
  testResults[category][endpoint] = result;
  
  console.log(`[${category.toUpperCase()}] ${endpoint}: ${status}`);
  if (error) console.log(`  Error: ${error.message}`);
}

// Authentication Tests
async function testAuth() {
  console.log('\n=== TESTING AUTHENTICATION APIs ===');
  
  try {
    // Test signin with super admin
    const signinResponse = await api.post('/api/auth/signin', {
      email: 'superadmin@foodway.com',
      password: 'superadmin123'
    });
    
    logTest('auth', 'POST /api/auth/signin', 'SUCCESS', signinResponse.data);
    
    // Extract token from cookies if available
    const cookies = signinResponse.headers['set-cookie'];
    if (cookies) {
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        authToken = tokenCookie.split('token=')[1].split(';')[0];
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }
    }
    
  } catch (error) {
    logTest('auth', 'POST /api/auth/signin', 'FAILED', null, error);
  }
  
  try {
    // Test user types
    const userTypesResponse = await api.get('/api/auth/user-types');
    logTest('auth', 'GET /api/auth/user-types', 'SUCCESS', userTypesResponse.data);
  } catch (error) {
    logTest('auth', 'GET /api/auth/user-types', 'FAILED', null, error);
  }
  
  try {
    // Test signout
    const signoutResponse = await api.get('/api/auth/signout');
    logTest('auth', 'GET /api/auth/signout', 'SUCCESS', signoutResponse.data);
  } catch (error) {
    logTest('auth', 'GET /api/auth/signout', 'FAILED', null, error);
  }
}

// User Management Tests
async function testUser() {
  console.log('\n=== TESTING USER APIs ===');
  
  // Re-authenticate for user tests
  try {
    await api.post('/api/auth/signin', {
      email: 'superadmin@foodway.com',
      password: 'superadmin123'
    });
  } catch (error) {
    console.log('Failed to re-authenticate for user tests');
  }
  
  try {
    const currentUserResponse = await api.get('/api/user/current');
    logTest('user', 'GET /api/user/current', 'SUCCESS', currentUserResponse.data);
  } catch (error) {
    logTest('user', 'GET /api/user/current', 'FAILED', null, error);
  }
  
  try {
    const updateLocationResponse = await api.post('/api/user/update-location', {
      lat: 17.385044,
      lon: 78.486671
    });
    logTest('user', 'POST /api/user/update-location', 'SUCCESS', updateLocationResponse.data);
  } catch (error) {
    logTest('user', 'POST /api/user/update-location', 'FAILED', null, error);
  }
}

// Super Admin Tests
async function testSuperAdmin() {
  console.log('\n=== TESTING SUPER ADMIN APIs ===');
  
  // Re-authenticate for super admin tests
  try {
    await api.post('/api/auth/signin', {
      email: 'superadmin@foodway.com',
      password: 'superadmin123'
    });
  } catch (error) {
    console.log('Failed to re-authenticate for super admin tests');
  }
  
  const superAdminEndpoints = [
    'GET /api/superadmin/dashboard-stats',
    'GET /api/superadmin/pending-owners',
    'GET /api/superadmin/pending-deliveryboys',
    'GET /api/superadmin/categories',
    'GET /api/superadmin/users',
    'GET /api/superadmin/user-types'
  ];
  
  for (const endpoint of superAdminEndpoints) {
    const [method, path] = endpoint.split(' ');
    try {
      const response = await api.get(path);
      logTest('superadmin', endpoint, 'SUCCESS', response.data);
    } catch (error) {
      logTest('superadmin', endpoint, 'FAILED', null, error);
    }
  }
}

// Shop Tests
async function testShop() {
  console.log('\n=== TESTING SHOP APIs ===');
  
  try {
    const allShopsResponse = await api.get('/api/shop/get-all');
    logTest('shop', 'GET /api/shop/get-all', 'SUCCESS', allShopsResponse.data);
  } catch (error) {
    logTest('shop', 'GET /api/shop/get-all', 'FAILED', null, error);
  }
  
  try {
    const myShopResponse = await api.get('/api/shop/get-my');
    logTest('shop', 'GET /api/shop/get-my', 'SUCCESS', myShopResponse.data);
  } catch (error) {
    logTest('shop', 'GET /api/shop/get-my', 'FAILED', null, error);
  }
}

// Order Tests
async function testOrder() {
  console.log('\n=== TESTING ORDER APIs ===');
  
  try {
    const myOrdersResponse = await api.get('/api/order/my-orders');
    logTest('order', 'GET /api/order/my-orders', 'SUCCESS', myOrdersResponse.data);
  } catch (error) {
    logTest('order', 'GET /api/order/my-orders', 'FAILED', null, error);
  }
}

// Categories Tests
async function testCategories() {
  console.log('\n=== TESTING CATEGORIES APIs ===');
  
  try {
    const categoriesResponse = await api.get('/api/categories');
    logTest('categories', 'GET /api/categories', 'SUCCESS', categoriesResponse.data);
  } catch (error) {
    logTest('categories', 'GET /api/categories', 'FAILED', null, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting comprehensive API testing...\n');
  
  await testAuth();
  await testUser();
  await testSuperAdmin();
  await testShop();
  await testOrder();
  await testCategories();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(JSON.stringify(testResults, null, 2));
  
  // Count results
  let totalTests = 0;
  let passedTests = 0;
  
  Object.values(testResults).forEach(category => {
    Object.values(category).forEach(test => {
      totalTests++;
      if (test.status === 'SUCCESS') passedTests++;
    });
  });
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
}

// Run tests
runAllTests().catch(console.error);