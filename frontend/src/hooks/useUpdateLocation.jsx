import axios from 'axios'
import React, { useEffect, useRef } from 'react'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'

function useUpdateLocation() {
    const {userData}=useSelector(state=>state.user)
    const lastSentRef = useRef(0)
    const watchIdRef = useRef(null)
 
    useEffect(()=>{
const updateLocation=async (lat,lon) => {
    try {
        await axios.post(`${serverUrl}/api/user/update-location`,{lat,lon},{withCredentials:true})
    } catch (error) {
        // Only log errors that are not authentication-related (401/403)
        if (error.response && ![401, 403].includes(error.response.status)) {
            console.log('Error updating location:', error)
        }
    }
}

// Only update location if user is authenticated
if(userData && navigator.geolocation) {
    // Throttle updates to once every 30 seconds
    watchIdRef.current = navigator.geolocation.watchPosition((pos)=>{
        const now = Date.now()
        if (now - lastSentRef.current >= 30000) {
            lastSentRef.current = now
            updateLocation(pos.coords.latitude,pos.coords.longitude)
        }
    }, () => {
        // Suppress geolocation errors to keep console clean
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 })
}

return () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
    }
}
    },[userData])
}

export default useUpdateLocation
