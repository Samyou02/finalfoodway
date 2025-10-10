import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setShopsInMyCity, setUserData } from '../redux/userSlice'

function useGetShopByCity() {
    const dispatch = useDispatch()
    const { currentCity } = useSelector(state => state.user)

    useEffect(() => {
        const fetchShops = async () => {
            try {
                // Fetch all shops regardless of location
                const result = await axios.get(`${serverUrl}/api/shop/get-all`, { withCredentials: true })
                dispatch(setShopsInMyCity(result.data))
            } catch (error) {
                // Silently ignore to avoid console noise
            }
        }
        fetchShops()
    }, [currentCity, dispatch])
}

export default useGetShopByCity
