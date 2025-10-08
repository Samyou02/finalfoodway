import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import DeliveryBoyOrderCard from '../components/DeliveryBoyOrderCard';
import ErrorBoundary from '../components/ErrorBoundary';
import useGetMyOrders from '../hooks/useGetMyOrders';
import { setMyOrders, updateOrderStatus, updateRealtimeOrderStatus } from '../redux/userSlice';


function MyOrders() {
  const { userData, myOrders,socket} = useSelector(state => state.user)
  const navigate = useNavigate()
const dispatch=useDispatch()
  
  // Fetch orders data
  useGetMyOrders()
  
  // Debug logging
  useEffect(() => {
    console.log('MyOrders - User data:', userData)
    console.log('MyOrders - User role:', userData?.role)
    console.log('MyOrders - Orders:', myOrders)
    console.log('MyOrders - Orders length:', myOrders?.length)
  }, [userData, myOrders])
  useEffect(()=>{
    socket?.on('newOrder',(data)=>{
      if(data.shopOrders?.owner._id==userData._id){
        dispatch(setMyOrders([data,...myOrders]))
      }
    })

    socket?.on('update-status',({orderId,shopId,status,userId,deliveryOtp,otpExpires})=>{
      if(userId==userData._id){
        dispatch(updateRealtimeOrderStatus({orderId,shopId,status,deliveryOtp,otpExpires}))
      }
    })

    return ()=>{
      socket?.off('newOrder')
      socket?.off('update-status')
    }
  },[socket])



  
  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-[800px] p-4'>

        <div className='flex items-center gap-[20px] mb-6 '>
          <div className=' z-[10] ' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold  text-start'>My Orders</h1>
        </div>
        <div className='space-y-6'>
          {myOrders && myOrders.length > 0 ? (
            myOrders.map((order,index)=>(
              <ErrorBoundary key={`error-boundary-${index}`}>
                {userData.role=="user" ?
                  (
                    <UserOrderCard data={order} key={index}/>
                  )
                  :
                  userData.role=="owner"? (
                    <OwnerOrderCard data={order} key={index}/>
                  )
                  :
                  userData.role=="deliveryBoy"? (
                    <DeliveryBoyOrderCard data={order} key={index}/>
                  )
                  :
                  null
                }
              </ErrorBoundary>
            ))
          ) : (
            <div className='bg-white rounded-lg shadow-md p-8 text-center'>
              <div className='text-gray-500 text-lg mb-2'>No orders found</div>
              <div className='text-gray-400 text-sm'>
                {userData.role === "user" && "You haven't placed any orders yet."}
                {userData.role === "owner" && "No orders have been placed for your restaurant yet."}
                {userData.role === "deliveryBoy" && "No delivery orders have been assigned to you yet."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyOrders
