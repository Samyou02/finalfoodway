import axios from 'axios'
import React, { useEffect, useRef } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setMyOrders, setUserData } from '../redux/userSlice'
import { setMyShopData } from '../redux/ownerSlice'

function useGetMyOrders() {
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    const lastFetchedUserId = useRef(null)
    
    useEffect(() => {
        // Skip if no userData or if it's the same user we already fetched for
        if (!userData || !userData._id) {
            return
        }
        
        // Skip if we already fetched for this user
        if (lastFetchedUserId.current === userData._id) {
            return
        }
        
        let isCancelled = false
        
        const fetchOrders = async () => {
            try {
                const result = await axios.get(`${serverUrl}/api/order/my-orders`, { withCredentials: true })
                
                // Check if component is still mounted and request wasn't cancelled
                if (!isCancelled) {
                    dispatch(setMyOrders(result.data))
                    lastFetchedUserId.current = userData._id
                }
            } catch (error) {
                if (!isCancelled) {
                    // Always set empty orders silently on error to avoid console noise
                    dispatch(setMyOrders([]))
                }
            }
        }
        
        fetchOrders()
        
        // Cleanup function to cancel request if component unmounts
        return () => {
            isCancelled = true
        }
    }, [userData, dispatch])
}

export default useGetMyOrders
