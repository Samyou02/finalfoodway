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
  const [currentOrders,setCurrentOrders]=useState([])
  const [availableAssignments,setAvailableAssignments]=useState(null)
  const [otpValues,setOtpValues]=useState({})
  const [showOtpFor,setShowOtpFor]=useState({})
  const [messages,setMessages]=useState({})
  const [todayDeliveries,setTodayDeliveries]=useState({ totalDeliveries: 0, chartData: [], deliveries: [] })

const [loading,setLoading]=useState(false)
  const [isActive,setIsActive]=useState(userData?.isActive || false)
  const [ratingSummary,setRatingSummary]=useState({ average:0, count:0 })
  const [deliveryRatings, setDeliveryRatings] = useState([])
  // UPI support per current order (keyed by `${orderId}-${shopOrderId}`)
  const [upiByKey, setUpiByKey] = useState({})
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
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
      await axios.put(`${serverUrl}/api/user/set-active`, { isActive: newActive }, { withCredentials: true })
      setIsActive(newActive)
      // Update userData in store minimally without changing other code
      dispatch(setUserData({ ...userData, isActive: newActive }))
      // Refresh assignments to reflect potential new broadcasts
      await getAssignments()
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }
  const getCurrentOrders=async () => {
    try {
      const { data } = await axios.get(`${serverUrl}/api/order/get-current-orders`,{withCredentials:true})
      setCurrentOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log(error)
    }
  }


  const acceptOrder=async (assignmentId) => {
    try {
      await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`,{withCredentials:true})
    await getCurrentOrders()
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

  // When current orders change, fetch shop UPI details and build deep links per order
  useEffect(() => {
    const round2 = (n) => Math.round(n * 100) / 100
    const buildLinks = async () => {
      const next = {}
      for (const co of currentOrders || []) {
        try {
          const key = `${co.orderId}-${co.shopOrder._id}`
          const so = co.shopOrder
          const subtotal = Number(so.subtotal || 0)
          const ownerShare = round2(subtotal) // equals subtotal
          const deliveryBoyShare = round2(Number(so.deliveryBoyShare || 0))
          const superadminFee = round2(Number(so.superadminFee || 0))
          const paymentFee = round2(Number(so.paymentFee || 0))
          const grandTotal = round2(ownerShare + deliveryBoyShare + superadminFee + paymentFee)
          const amount = grandTotal.toFixed(2)

          const rawShop = so.shop
          const shopId = typeof rawShop === 'string' ? rawShop : rawShop?._id
          if (!shopId) continue
          const res = await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`, { withCredentials: true })
          const shop = res.data?.shop
          const vpa = shop?.upiVpa || null
          const pn = shop?.upiPayeeName || shop?.name || 'FoodWay'
          if (vpa) {
            const tn = `Delivery Order`
            const link = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(pn)}&tn=${encodeURIComponent(tn)}&am=${amount}&cu=INR`
            next[key] = { amount, vpa, pn, link }
          }
        } catch (err) {
          // Non-blocking: continue building other links
          console.log('build UPI link error', err)
        }
      }
      setUpiByKey(next)
    }
    if (currentOrders && currentOrders.length > 0) {
      buildLinks()
    } else {
      setUpiByKey({})
    }
  }, [currentOrders])
  
  // Delivery boy does not generate OTP; per-order UI handles OTP entry
  // Legacy verifyOtp function removed in favor of per-order OTP handling


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
        setDeliveryRatings(res.data?.ratings || [])
      }catch(err){
        console.log('fetch delivery rating error',err)
      }
    })()
getAssignments()
getCurrentOrders()
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
  {/* Ratings List */}
  <div className='md:col-span-2 bg-white rounded-xl p-4 shadow border'>
    <p className='text-sm font-semibold text-gray-700 mb-2'>Latest Reviews</p>
    {deliveryRatings && deliveryRatings.length > 0 ? (
      <div className='space-y-2'>
        {deliveryRatings.slice(0,5).map((r, idx) => (
          <div key={idx} className='flex items-start justify-between border rounded-lg p-2 bg-gray-50'>
            <div>
              <div className='inline-flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 text-xs font-semibold'>★ {r.stars}</span>
                {r.comment && <span className='text-xs text-gray-600'>{r.comment}</span>}
              </div>
              <p className='text-[11px] text-gray-500 mt-1'>Order: {String(r.order).slice(-6)} • {new Date(r.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className='text-xs text-gray-500'>No reviews yet</p>
    )}
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


<div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100'>
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
{a.receiptNumber && (
  <p className='text-xs text-green-700 mt-1'>Receipt: {a.receiptNumber}</p>
)}
   </div>
   <button className='bg-orange-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-orange-600' onClick={()=>acceptOrder(a.assignmentId)}>Accept</button>

  </div>
))
):<p className='text-gray-400 text-sm'>No Available Orders</p>}
</div>
</div>

<div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100'>
<h2 className='text-lg font-bold mb-3'>📦 Current Orders</h2>
{currentOrders && currentOrders.length > 0 ? (
  currentOrders.map((co) => {
    const key = `${co.orderId}-${co.shopOrder._id}`
    return (
      <div key={key} className='border rounded-lg p-4 mb-4'>
        <div className='flex justify-between items-start'>
          <div>
            <p className='font-semibold text-sm'>{co?.shopOrder.shop.name}</p>
            <p className='text-sm text-gray-500'>{co.deliveryAddress.text}</p>
            <p className='text-xs text-gray-400'>{co.shopOrder.shopOrderItems.length} items | {co.shopOrder.subtotal}</p>
          </div>
        </div>

        <div className='mt-3 p-3 border rounded-xl bg-blue-50'>
          <h3 className='font-semibold text-sm mb-2'>📍 Delivery Information</h3>
          <p className='text-sm text-gray-600 mb-1'><span className='font-medium'>Delivery Address:</span> {co.deliveryAddress.text}</p>
          <p className='text-sm text-gray-600'><span className='font-medium'>Customer:</span> {co.user.fullName}</p>
        </div>

        {/* UPI Payment for this shop/owner */}
        <div className='mt-3 p-3 border rounded-xl bg-orange-50'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-semibold text-orange-800'>Collect Payment via UPI</p>
              <p className='text-xs text-orange-700'>Amount: ₹{upiByKey[key]?.amount || (co.shopOrder.subtotal)}</p>
            </div>
            {upiByKey[key]?.link ? (
              isMobile ? (
                <a href={upiByKey[key].link} target='_blank' rel='noopener noreferrer' className='bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-semibold'>Open UPI</a>
              ) : (
                <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(upiByKey[key].link)} className='bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-semibold'>Copy Link</button>
              )
            ) : (
              <span className='text-xs text-red-700'>UPI not configured by owner</span>
            )}
          </div>
          {!isMobile && upiByKey[key]?.link && (
            <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center'>
              <div className='text-xs text-orange-800'>
                <p>Scan this QR using any UPI app or paste the copied link.</p>
              </div>
              <div className='flex justify-end'>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiByKey[key].link)}`} alt='UPI QR Code' className='border rounded-lg' />
              </div>
            </div>
          )}
        </div>

        {!showOtpFor[key] ? (
          <button className='mt-4 w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all duration-200' onClick={() => setShowOtpFor(prev => ({ ...prev, [key]: true }))} disabled={loading}>
            {loading ? <ClipLoader size={20} color='white'/> : 'Mark As Delivered'}
          </button>
        ) : (
          <div className='mt-4 p-4 border rounded-xl bg-gray-50'>
            <p className='text-sm font-semibold mb-2'>Enter OTP sent to <span className='text-orange-500'>{co.user.fullName}</span></p>
            <input type="text" className='w-full border px-3 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400' placeholder='Enter OTP' onChange={(e)=>setOtpValues(prev => ({ ...prev, [key]: e.target.value }))} value={otpValues[key] || ''}/>
            {messages[key] && <p className='text-center text-green-400 text-2xl mb-4'>{messages[key]}</p>}
            <button className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all" onClick={async () => {
              try {
                setLoading(true)
                const res = await axios.post(`${serverUrl}/api/order/verify-delivery-otp`, { orderId: co.orderId, shopOrderId: co.shopOrder._id, otp: otpValues[key] }, { withCredentials: true })
                setMessages(prev => ({ ...prev, [key]: res.data.message }))
                // Remove from current orders on success
                setCurrentOrders(prev => prev.filter(o => `${o.orderId}-${o.shopOrder._id}` !== key))
                setOtpValues(prev => { const n = { ...prev }; delete n[key]; return n })
                setShowOtpFor(prev => { const n = { ...prev }; delete n[key]; return n })
                await getAssignments()
                await handleTodayDeliveries()
              } catch (error) {
                setMessages(prev => ({ ...prev, [key]: error.response?.data?.message || 'Failed to verify OTP' }))
              } finally {
                setLoading(false)
              }
            }}>Submit OTP</button>
          </div>
        )}
      </div>
    )
  })
) : (
  <p className='text-sm text-gray-500'>No current orders</p>
)}

</div>


      </div>
    </div>
  )
}

export default DeliveryBoy
