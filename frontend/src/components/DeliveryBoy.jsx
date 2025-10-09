import React from 'react'
import Nav from './Nav'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { setUserData } from '../redux/userSlice'
import { useEffect } from 'react'
import { useState } from 'react'

import { ClipLoader } from 'react-spinners'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function DeliveryBoy() {
  const {userData,socket}=useSelector(state=>state.user)
  const dispatch = useDispatch()
  const [currentOrder,setCurrentOrder]=useState()
  const [showOtpBox,setShowOtpBox]=useState(false)
  const [availableAssignments,setAvailableAssignments]=useState(null)
  const [otp,setOtp]=useState("")
  const [todayDeliveries,setTodayDeliveries]=useState({ totalDeliveries: 0, chartData: [], deliveries: [] })

const [loading,setLoading]=useState(false)
const [message,setMessage]=useState("")
  const [isActive,setIsActive]=useState(userData?.isActive || false)
  const [ratingSummary,setRatingSummary]=useState({ average:0, count:0 })
  // Removed geolocation tracking since we're using text-based addresses






  const getAssignments=async () => {
    try {
      const result=await axios.get(`${serverUrl}/api/order/get-assignments`,{withCredentials:true})
      
      setAvailableAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const toggleActive = async () => {
    try {
      setLoading(true)
      const newActive = !isActive
      const result = await axios.put(`${serverUrl}/api/user/set-active`, { isActive: newActive }, { withCredentials: true })
      setIsActive(newActive)
      // Update userData in store minimally without changing other code
      dispatch(setUserData({ ...userData, isActive: newActive }))
      // Refresh assignments to reflect potential new broadcasts
      await getAssignments()
      setMessage(newActive ? 'You are now Active and will receive new orders' : 'You are now Inactive and won\'t receive orders')
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }
  const getCurrentOrder=async () => {
     try {
      const result=await axios.get(`${serverUrl}/api/order/get-current-order`,{withCredentials:true})
      setCurrentOrder(result.data)
    } catch (error) {
      // Gracefully ignore 400 when no current assignment is found
      if (error.response && error.response.status === 400) {
        setCurrentOrder(null)
      } else {
        console.log(error)
      }
    }
  }


  const acceptOrder=async (assignmentId) => {
    try {
      const result=await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`,{withCredentials:true})
    console.log(result.data)
    await getCurrentOrder()
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(()=>{
    socket.on('newAssignment',(data)=>{
      setAvailableAssignments(prev=>([...prev,data]))
    })
    
    socket.on('assignmentTaken',(data)=>{
      // Remove the assignment from available assignments when taken by another delivery boy
      setAvailableAssignments(prev => prev.filter(assignment => assignment.assignmentId !== data.assignmentId))
    })
    
    return ()=>{
      socket.off('newAssignment')
      socket.off('assignmentTaken')
    }
  },[socket])
  
  const sendOtp=async () => {
    // Delivery boy should not generate OTP; only prompt for entry
    setShowOtpBox(true)
    setLoading(false)
    setMessage(`Ask customer ${currentOrder.user.fullName} to generate OTP from their app.`)
  }
   const verifyOtp=async () => {
    setMessage("")
    try {
      const result=await axios.post(`${serverUrl}/api/order/verify-delivery-otp`,{
        orderId:currentOrder._id,shopOrderId:currentOrder.shopOrder._id,otp
      },{withCredentials:true})
    console.log(result.data)
    setMessage(result.data.message)
    // Update state instead of refreshing the page
    setCurrentOrder(null)
    setOtp("")
    setShowOtpBox(false)
    // Refresh data to get updated assignments and today's deliveries
    await getAssignments()
    await handleTodayDeliveries()
    } catch (error) {
      // Only log unexpected errors
      if (error.response && error.response.status !== 400) {
        console.log('OTP verification error:', error)
      }
      
      // Show appropriate error message based on status
      if (error.response && error.response.status === 400) {
        setMessage(error.response.data.message || "Invalid OTP. Please check and try again.")
      } else {
        setMessage("Failed to verify OTP. Please try again.")
      }
    }
  }


   const handleTodayDeliveries=async () => {
    
    try {
      const result=await axios.get(`${serverUrl}/api/order/get-today-deliveries`,{withCredentials:true})
    console.log(result.data)
   setTodayDeliveries(result.data)
    } catch (error) {
      console.log(error)
    }
  }
 

  useEffect(()=>{
    // Fetch rating summary for delivery boy
    (async()=>{
      try{
        const res=await axios.get(`${serverUrl}/api/rating/delivery/my`,{withCredentials:true})
        setRatingSummary(res.data?.summary || { average:0, count:0 })
      }catch(err){
        console.log('fetch delivery rating error',err)
      }
    })()
getAssignments()
getCurrentOrder()
handleTodayDeliveries()
  },[userData])
  return (
    <div className='w-screen min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto'>
      <Nav/>
      <div className='w-full max-w-[800px] flex flex-col gap-5 items-center'>
    <div className='bg-white rounded-2xl shadow-md p-5 flex flex-col justify-start items-center w-[90%] border border-orange-100 text-center gap-2'>
<h1 className='text-xl font-bold text-[#ff4d2d]'>Welcome, {userData.fullName}</h1>
<p className='text-gray-600'>Ready to deliver orders in your area</p>
    <div className='mt-3 flex items-center gap-3'>
      <span className={`px-3 py-1 rounded-full text-sm ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
      <button onClick={toggleActive} className={`px-4 py-2 rounded-lg text-white ${isActive ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'}`} disabled={loading}>
        {isActive ? 'Go Inactive' : 'Go Active'}
      </button>
    </div>

    {/* Rating Summary */}
<div className='w-[90%] grid grid-cols-1 md:grid-cols-3 gap-4'>
  <div className='bg-white rounded-xl p-4 shadow border'>
    <p className='text-sm text-gray-600 mb-1'>My Rating</p>
    <div className='inline-flex items-center gap-2'>
      <span className='inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded bg-yellow-50 text-yellow-700 border border-yellow-200'>
        ★ {Number(ratingSummary.average || 0).toFixed(1)}
      </span>
      <span className='text-xs text-gray-500'>({ratingSummary.count || 0} reviews)</span>
    </div>
  </div>
</div>
    </div>

<div className='bg-white rounded-2xl shadow-md p-5 w-[90%] mb-6 border border-orange-100'>
  <h1 className='text-lg font-bold mb-3 text-[#ff4d2d] '>Today Deliveries</h1>

  <ResponsiveContainer width="100%" height={200}>
   <BarChart data={todayDeliveries.chartData}>
  <CartesianGrid strokeDasharray="3 3"/>
  <XAxis dataKey="hour" tickFormatter={(h)=>`${h}:00`}/>
    <YAxis  allowDecimals={false}/>
    <Tooltip formatter={(value)=>[value,"orders"]} labelFormatter={label=>`${label}:00`}/>
      <Bar dataKey="count" fill='#ff4d2d'/>
   </BarChart>
  </ResponsiveContainer>


</div>


{!currentOrder && <div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100'>
<h1 className='text-lg font-bold mb-4 flex items-center gap-2'>Available Orders</h1>

<div className='space-y-4'>
{availableAssignments?.length>0
?
(
availableAssignments.map((a,index)=>(
  <div className='border rounded-lg p-4 flex justify-between items-center' key={index}>
   <div>
    <p className='text-sm font-semibold'>{a?.shopName}</p>
    <p className='text-sm text-gray-500'><span className='font-semibold'>Delivery Address:</span> {a?.deliveryAddress.text}</p>
<p className='text-xs text-gray-400'>{a.items.length} items | {a.subtotal}</p>
   </div>
   <button className='bg-orange-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-orange-600' onClick={()=>acceptOrder(a.assignmentId)}>Accept</button>

  </div>
))
):<p className='text-gray-400 text-sm'>No Available Orders</p>}
</div>
</div>}

{currentOrder && <div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100'>
<h2 className='text-lg font-bold mb-3'>📦Current Order</h2>
<div className='border rounded-lg p-4 mb-3'>
  <p className='font-semibold text-sm'>{currentOrder?.shopOrder.shop.name}</p>
  <p className='text-sm text-gray-500'>{currentOrder.deliveryAddress.text}</p>
 <p className='text-xs text-gray-400'>{currentOrder.shopOrder.shopOrderItems.length} items | {currentOrder.shopOrder.subtotal}</p>
</div>

 <div className='mt-4 p-4 border rounded-xl bg-blue-50'>
  <h3 className='font-semibold text-sm mb-2'>📍 Delivery Information</h3>
  <p className='text-sm text-gray-600 mb-1'><span className='font-medium'>Delivery Address:</span> {currentOrder.deliveryAddress.text}</p>
  <p className='text-sm text-gray-600'><span className='font-medium'>Customer:</span> {currentOrder.user.fullName}</p>
 </div>
{!showOtpBox ? <button className='mt-4 w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all duration-200' onClick={sendOtp} disabled={loading}>
{loading?<ClipLoader size={20} color='white'/> :"Mark As Delivered"}
 </button>:<div className='mt-4 p-4 border rounded-xl bg-gray-50'>
<p className='text-sm font-semibold mb-2'>Enter Otp send to <span className='text-orange-500'>{currentOrder.user.fullName}</span></p>
<input type="text" className='w-full border px-3 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400' placeholder='Enter OTP' onChange={(e)=>setOtp(e.target.value)} value={otp}/>
{message && <p className='text-center text-green-400 text-2xl mb-4'>{message}</p>}

<button className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all" onClick={verifyOtp}>Submit OTP</button>
  </div>}

  </div>}


      </div>
    </div>
  )
}

export default DeliveryBoy
