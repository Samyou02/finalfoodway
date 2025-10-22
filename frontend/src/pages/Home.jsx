import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import UserDashboard from '../components/UserDashboard'
import OwnerDashboard from '../components/OwnerDashboard'
import DeliveryBoy from '../components/DeliveryBoy'

function Home() {
    const {userData}=useSelector(state=>state.user)
    const navigate = useNavigate()

    // Redirect superadmin to their dashboard
    useEffect(() => {
        if(userData?.role === 'superadmin') {
            navigate('/superadmin')
        }
    }, [userData?.role, navigate])

  return (
    <div className='w-[100vw] min-h-[100vh] pt-[100px] flex flex-col items-center bg-[#fff9f6]'>
      {userData.role=="user" && <UserDashboard/>}
      {userData.role=="owner" && <OwnerDashboard/>}
      {userData.role=="deliveryBoy" && <DeliveryBoy/>}
    </div>
  )
}

export default Home
