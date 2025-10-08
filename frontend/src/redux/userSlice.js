import { createSlice, current } from "@reduxjs/toolkit";

// Helper functions for localStorage
const saveCartToLocalStorage = (cartItems, totalAmount) => {
  try {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    localStorage.setItem('totalAmount', totalAmount.toString());
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

const loadCartFromLocalStorage = () => {
  try {
    const cartItems = localStorage.getItem('cartItems');
    const totalAmount = localStorage.getItem('totalAmount');
    return {
      cartItems: cartItems ? JSON.parse(cartItems) : [],
      totalAmount: totalAmount ? parseFloat(totalAmount) : 0
    };
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return { cartItems: [], totalAmount: 0 };
  }
};

// Helper functions for OTP persistence
const saveOtpDataToLocalStorage = (otpData) => {
  const dataToSave = {
    ...otpData,
    savedAt: Date.now()
  };
  localStorage.setItem('deliveryOtpData', JSON.stringify(dataToSave));
};

const loadOtpDataFromLocalStorage = () => {
  try {
    const savedData = localStorage.getItem('deliveryOtpData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      // Check if OTP is still valid based on otpExpires timestamp
      if (parsedData.otpExpires && Date.now() < parsedData.otpExpires) {
        return parsedData;
      } else {
        // OTP has expired, remove it
        localStorage.removeItem('deliveryOtpData');
        return null;
      }
    }
  } catch (error) {
    console.error('Error loading OTP data from localStorage:', error);
    localStorage.removeItem('deliveryOtpData');
  }
  return null;
};

const clearOtpDataFromLocalStorage = () => {
  localStorage.removeItem('deliveryOtpData');
};

// Load initial cart state from localStorage
const initialCartState = loadCartFromLocalStorage();

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopInMyCity: null,
    itemsInMyCity: null,
    cartItems: initialCartState.cartItems,
    totalAmount: initialCartState.totalAmount,
    myOrders: [],
    searchItems: null,
    socket: null
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload
    },
    setShopsInMyCity: (state, action) => {
      state.shopInMyCity = action.payload
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload
    },
    setSocket: (state, action) => {
      state.socket = action.payload
    },
    addToCart: (state, action) => {
      const cartItem = action.payload
      const existingItem = state.cartItems.find(i => i.id == cartItem.id)
      if (existingItem) {
        existingItem.quantity += cartItem.quantity
      } else {
        state.cartItems.push(cartItem)
      }

      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      
      // Save to localStorage
      saveCartToLocalStorage(state.cartItems, state.totalAmount)
    },

    setTotalAmount: (state, action) => {
      state.totalAmount = action.payload
    }

    ,

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload
      const item = state.cartItems.find(i => i.id == id)
      if (item) {
        item.quantity = quantity
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      
      // Save to localStorage
      saveCartToLocalStorage(state.cartItems, state.totalAmount)
    },

    removeCartItem: (state, action) => {
      state.cartItems = state.cartItems.filter(i => i.id !== action.payload)
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      
      // Save to localStorage
      saveCartToLocalStorage(state.cartItems, state.totalAmount)
    },

    clearCart: (state) => {
      state.cartItems = []
      state.totalAmount = 0
      
      // Clear localStorage
      try {
        localStorage.removeItem('cartItems')
        localStorage.removeItem('totalAmount')
      } catch (error) {
        console.error('Error clearing cart from localStorage:', error)
      }
    },

    setMyOrders: (state, action) => {
      // Ensure myOrders is always an array
      state.myOrders = Array.isArray(action.payload) ? action.payload : []
      
      // Merge persisted OTP data if available
      const persistedOtpData = loadOtpDataFromLocalStorage();
      if (persistedOtpData && persistedOtpData.orderId && persistedOtpData.shopOrderId) {
        const order = state.myOrders.find(o => o._id === persistedOtpData.orderId);
        if (order) {
          // Handle both array and object formats for shopOrders
          let shopOrder;
          if (Array.isArray(order.shopOrders)) {
            shopOrder = order.shopOrders.find(so => so._id === persistedOtpData.shopOrderId);
          } else if (order.shopOrders && order.shopOrders._id === persistedOtpData.shopOrderId) {
            shopOrder = order.shopOrders;
          }
          
          if (shopOrder && shopOrder.status === "out of delivery") {
            shopOrder.deliveryOtp = persistedOtpData.deliveryOtp;
            shopOrder.otpExpires = persistedOtpData.otpExpires;
          }
        }
      }
      
      // Scan for new OTP data to save
      state.myOrders.forEach(order => {
        if (order.shopOrders) {
          // Handle both array and object formats for shopOrders
          const shopOrdersArray = Array.isArray(order.shopOrders) ? order.shopOrders : [order.shopOrders];
          
          shopOrdersArray.forEach(shopOrder => {
            if (shopOrder.status === "out of delivery" && shopOrder.deliveryOtp && shopOrder.otpExpires) {
              // Only save if we don't already have persisted data for this order
              if (!persistedOtpData || persistedOtpData.orderId !== order._id || persistedOtpData.shopOrderId !== shopOrder._id) {
                saveOtpDataToLocalStorage({ 
                  orderId: order._id, 
                  shopOrderId: shopOrder._id, 
                  deliveryOtp: shopOrder.deliveryOtp, 
                  otpExpires: shopOrder.otpExpires 
                });
              }
            }
          });
        }
      });
    },
    addMyOrder: (state, action) => {
      state.myOrders = [action.payload, ...state.myOrders]
      
      // Check if the new order has any shop orders with "out of delivery" status and OTP
      const newOrder = action.payload;
      if (newOrder.shopOrders) {
        // Handle both array and object formats for shopOrders
        const shopOrdersArray = Array.isArray(newOrder.shopOrders) ? newOrder.shopOrders : [newOrder.shopOrders];
        
        shopOrdersArray.forEach(shopOrder => {
          if (shopOrder.status === "out of delivery" && shopOrder.deliveryOtp && shopOrder.otpExpires) {
            saveOtpDataToLocalStorage({ 
              orderId: newOrder._id, 
              shopOrderId: shopOrder._id, 
              deliveryOtp: shopOrder.deliveryOtp, 
              otpExpires: shopOrder.otpExpires 
            });
          }
        });
      }
    }

    ,
    updateOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        // Handle both array and object formats for shopOrders
        if (Array.isArray(order.shopOrders)) {
          const shopOrder = order.shopOrders.find(so => so.shop._id == shopId);
          if (shopOrder) {
            shopOrder.status = status;
          }
        } else if (order.shopOrders && order.shopOrders.shop._id == shopId) {
          order.shopOrders.status = status;
        }
      }
    },

    updateRealtimeOrderStatus: (state, action) => {
      const { orderId, shopId, status, deliveryOtp, otpExpires } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        // Handle both array and object formats for shopOrders
        let shopOrder;
        if (Array.isArray(order.shopOrders)) {
          shopOrder = order.shopOrders.find(so => so.shop._id == shopId);
        } else if (order.shopOrders && order.shopOrders.shop._id == shopId) {
          shopOrder = order.shopOrders;
        }
        
        if (shopOrder) {
          shopOrder.status = status
          
          // If OTP data is provided, update it and save to localStorage
          if (deliveryOtp && otpExpires) {
            shopOrder.deliveryOtp = deliveryOtp
            shopOrder.otpExpires = otpExpires
            saveOtpDataToLocalStorage({ 
              orderId, 
              shopOrderId: shopOrder._id, 
              deliveryOtp, 
              otpExpires 
            });
          }
          
          // If status is "out of delivery" and OTP exists, save it
          if (status === "out of delivery" && shopOrder.deliveryOtp && shopOrder.otpExpires) {
            saveOtpDataToLocalStorage({ 
              orderId, 
              shopOrderId: shopOrder._id, 
              deliveryOtp: shopOrder.deliveryOtp, 
              otpExpires: shopOrder.otpExpires 
            });
          }
          
          // Clear OTP data if order is delivered
          if (status === "delivered") {
            clearOtpDataFromLocalStorage();
          }
        }
      }
    },

    setSearchItems: (state, action) => {
      state.searchItems = action.payload
    },

    saveOtpData: (state, action) => {
      const { orderId, shopOrderId, deliveryOtp, otpExpires } = action.payload;
      saveOtpDataToLocalStorage({ orderId, shopOrderId, deliveryOtp, otpExpires });
    },

    clearPersistedOtpData: (state) => {
      clearOtpDataFromLocalStorage();
    },

    logout: (state) => {
      state.userData = null;
      state.currentCity = null;
      state.currentState = null;
      state.currentAddress = null;
      state.shopInMyCity = null;
      state.itemsInMyCity = null;
      state.cartItems = [];
      state.totalAmount = 0;
      state.myOrders = [];
      state.searchItems = null;
      state.socket = null;
      
      // Clear localStorage
      localStorage.removeItem('cartItems');
      localStorage.removeItem('totalAmount');
      clearOtpDataFromLocalStorage();
    }
  }
})

export const { setUserData, setCurrentAddress, setCurrentCity, setCurrentState, setShopsInMyCity, setItemsInMyCity, addToCart, updateQuantity, removeCartItem, clearCart, setMyOrders, addMyOrder, updateOrderStatus, setSearchItems, setTotalAmount, setSocket, updateRealtimeOrderStatus, saveOtpData, clearPersistedOtpData, logout } = userSlice.actions
export default userSlice.reducer