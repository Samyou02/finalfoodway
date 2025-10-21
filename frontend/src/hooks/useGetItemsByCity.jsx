import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setItemsInMyCity } from '../redux/userSlice'
import { itemAPI } from '../api'

function useGetItemsByCity() {
    const dispatch=useDispatch()
    const {currentCity}=useSelector(state=>state.user)
  useEffect(()=>{
  const fetchItems=async () => {
    if(!currentCity || currentCity === null || currentCity === undefined) {
        return;
    }
  try {
           const result=await itemAPI.getByCity(currentCity)
            dispatch(setItemsInMyCity(result.data))
   } catch {
        // Silently fail to avoid console noise
    }
}
fetchItems()
 
  },[currentCity, dispatch])
}

export default useGetItemsByCity
