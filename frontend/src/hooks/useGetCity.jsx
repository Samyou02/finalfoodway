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
                const latitude = position.coords.latitude
                const longitude = position.coords.longitude
                dispatch(setLocation({ lat: latitude, lon: longitude }))
                // Do not reverse-geocode to avoid CORS/errors; keep default city
            }, (error) => {
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
