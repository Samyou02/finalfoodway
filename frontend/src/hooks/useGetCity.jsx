import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentAddress, setCurrentCity, setCurrentState, setUserData } from '../redux/userSlice'
import { setAddress, setLocation } from '../redux/mapSlice'

function useGetCity() {
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    const { currentCity } = useSelector(state => state.user)
    const apiKey = import.meta.env.VITE_GEOAPIKEY
    
    useEffect(() => {
        // Only get location if user is authenticated and we don't already have location data
        if (userData && userData._id && !currentCity) {
            // Set default city immediately to prevent race condition
            dispatch(setCurrentCity('Hyderabad'))
            dispatch(setCurrentState('Telangana'))
            dispatch(setCurrentAddress('Hyderabad, Telangana'))
            dispatch(setAddress('Hyderabad, Telangana'))
            
            // Then try to get actual location in background
            navigator.geolocation.getCurrentPosition(async (position) => {
                console.log(position)
                const latitude = position.coords.latitude
                const longitude = position.coords.longitude
                dispatch(setLocation({ lat: latitude, lon: longitude }))
                
                try {
                    // Use free OpenStreetMap Nominatim API without credentials
                    const result = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
                        withCredentials: false
                    })
                    
                    console.log('Geocoding result:', result.data)
                    
                    const address = result.data.address || {}
                    const city = address.city || address.town || address.village || address.county || 'Hyderabad'
                    const state = address.state || 'Telangana'
                    const fullAddress = result.data.display_name || `${city}, ${state}`
                    
                    // Only update if we got a different city
                    if (city !== 'Hyderabad') {
                        dispatch(setCurrentCity(city))
                        dispatch(setCurrentState(state))
                        dispatch(setCurrentAddress(fullAddress))
                        dispatch(setAddress(fullAddress))
                    }
                } catch (error) {
                    console.log('Geocoding API error - keeping default location:', error.response?.status || error.message)
                    // Keep default city when API fails (already set above)
                }
            }, (error) => {
                console.log('Geolocation permission error - keeping default location:', error)
                // Keep default location when geolocation fails (already set above)
            })
        } else if (userData === null) {
            // Clear location data if user is not authenticated
            dispatch(setCurrentCity(''))
            dispatch(setCurrentState(''))
            dispatch(setCurrentAddress(''))
            dispatch(setAddress(''))
        }
    }, [userData, currentCity, dispatch])
}

export default useGetCity
