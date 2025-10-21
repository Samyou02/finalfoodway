import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setShopsInMyCity } from '../redux/userSlice'
import { shopAPI } from '../api'

function useGetShopByCity() {
    const dispatch = useDispatch()
    const { currentCity } = useSelector(state => state.user)

    useEffect(() => {
        const fetchShops = async () => {
            try {
                // Fetch all shops regardless of location
                const result = await shopAPI.getAll()
                dispatch(setShopsInMyCity(result.data))
            } catch {
                // Silently ignore to avoid console noise
            }
        }
        fetchShops()
    }, [currentCity, dispatch])
}

export default useGetShopByCity
