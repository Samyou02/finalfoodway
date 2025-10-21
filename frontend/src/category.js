import { categoryAPI } from './api';

// Function to get categories
export const getCategories = async () => {
  try {
    const response = await categoryAPI.getCategories();
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Legacy static categories for fallback (can be removed once server is stable)
export const categories = [];
