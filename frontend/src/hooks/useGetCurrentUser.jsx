import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { userAPI } from '../api'

function useGetCurrentUser() {
    const dispatch = useDispatch()
    
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const result = await userAPI.getCurrentUser()
                if (result.status === 200) {
                    dispatch(setUserData(result.data))
                } else if ([401, 403].includes(result.status)) {
                    // Not authenticated; clear user data silently
                    dispatch(setUserData(null))
                } else {
                    // Other errors: avoid noisy logs; keep app stable
                    dispatch(setUserData(null))
                }
            } catch {
                // Network or unexpected error; keep silent to avoid console noise
                dispatch(setUserData(null))
            }
        }
        
        // Always fetch user data on mount, regardless of current state
        fetchUser()
    }, [dispatch])
}

export default useGetCurrentUser
