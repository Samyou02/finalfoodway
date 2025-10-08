import axios from 'axios';
import { serverUrl } from './App';

// Fetch categories from server
export const fetchCategories = async () => {
    try {
        const response = await axios.get(`${serverUrl}/api/categories`, {
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Return empty array if server fails
        return [];
    }
};

// Legacy static categories for fallback (can be removed once server is stable)
export const categories = [];
