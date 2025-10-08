import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { setMyShopData } from '../redux/ownerSlice'

function useGetMyshop() {
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    
    useEffect(() => {
        const fetchShop = async () => {
            try {
                const result = await axios.get(`${serverUrl}/api/shop/get-my`, { withCredentials: true })
                dispatch(setMyShopData(result.data))
            } catch (error) {
                // Only log errors that are not expected (400 means no shop exists for user)
                if (error.response && error.response.status !== 400) {
                    console.log('Error fetching shop:', error)
                }
                // For 400 errors, just set empty shop data
                if (error.response && error.response.status === 400) {
                    dispatch(setMyShopData(null))
                }
            }
        }
        
        // Only fetch if user is authenticated
        if (userData && userData._id) {
            fetchShop()
        } else if (userData === null) {
            // Clear shop data if user is not authenticated
            dispatch(setMyShopData(null))
        }
    }, [userData, dispatch])
}

export default useGetMyshop
