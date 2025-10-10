import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import DeliveryBoyOrderCard from '../components/DeliveryBoyOrderCard';
import ErrorBoundary from '../components/ErrorBoundary';
import useGetMyOrders from '../hooks/useGetMyOrders';
import { setMyOrders, updateOrderStatus, updateRealtimeOrderStatus } from '../redux/userSlice';
import DeliveryRatingPopup from '../components/DeliveryRatingPopup';


function MyOrders() {
  const { userData, myOrders,socket} = useSelector(state => state.user)
  const navigate = useNavigate()
const dispatch=useDispatch()
  const [searchTerm, setSearchTerm] = useState('')
  
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



  // Filter orders for owners by customer name or receipt number
  const filteredOrders = useMemo(() => {
    if (!myOrders) return []
    if (userData?.role !== 'owner') return myOrders
    const term = searchTerm.trim().toLowerCase()
    if (!term) return myOrders
    return myOrders.filter((order) => {
      const nameMatch = (order?.user?.fullName || '').toLowerCase().includes(term)
      // Owner view may expose a single shopOrder under order.shopOrders
      let receiptMatch = false
      const so = order?.shopOrders
      if (Array.isArray(so)) {
        receiptMatch = so.some(s => (s?.receipt?.receiptNumber || '').toLowerCase().includes(term))
      } else {
        receiptMatch = ((so?.receipt?.receiptNumber || '').toLowerCase().includes(term))
      }
      return nameMatch || receiptMatch
    })
  }, [myOrders, searchTerm, userData?.role])

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-[800px] p-4'>

        <div className='flex items-center gap-[20px] mb-6 '>
          <div className=' z-[10] ' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold  text-start'>My Orders</h1>
        </div>
        {/* Owner search input */}
        {userData?.role === 'owner' && (
          <div className='mb-4'>
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search by Customer Name or Receipt Number'
              className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]'
            />
          </div>
        )}

        <div className='space-y-6'>
          {filteredOrders && filteredOrders.length > 0 ? (
            filteredOrders.map((order,index)=>(
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
                {userData.role === "owner" && (searchTerm ? "No matching orders." : "No orders have been placed for your restaurant yet.")}
                {userData.role === "deliveryBoy" && "No delivery orders have been assigned to you yet."}
              </div>
            </div>
          )}
        </div>
      </div>
      {userData?.role === 'user' && <DeliveryRatingPopup />}
    </div>
  )
}

export default MyOrders
