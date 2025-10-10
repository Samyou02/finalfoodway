import React, { useEffect, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoLocationSharp } from "react-icons/io5";
import { useDispatch, useSelector } from 'react-redux';
import { MdDeliveryDining } from "react-icons/md";
import { FaCreditCard } from "react-icons/fa";
import axios from 'axios';
import { FaMobileScreenButton } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { addMyOrder, setTotalAmount, clearCart } from '../redux/userSlice';

function CheckOut() {
  const { cartItems ,totalAmount,userData} = useSelector(state => state.user)
  const [addressInput, setAddressInput] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [orderType, setOrderType] = useState("delivery") // delivery or pickup
  const navigate=useNavigate()
  const dispatch = useDispatch()
  // Fee breakdown per your specification
  const round2 = (n) => Math.round(n * 100) / 100
  const ownerShare = round2(totalAmount)
  const deliveryBoyShare = orderType === "delivery" ? round2(totalAmount * 0.08) : 0
  const superadminFee = round2(totalAmount * 0.20)
  const paymentFee = paymentMethod === "online" ? round2(totalAmount * 0.02) : 0
  const grandTotal = round2(ownerShare + deliveryBoyShare + superadminFee + paymentFee)

  // Fetch shop UPI details (assumes single-shop cart; uses first item's shop)
  const [shopUpi, setShopUpi] = useState({ vpa: null, payeeName: null })
  useEffect(() => {
    const fetchShopUpi = async () => {
      try {
        const firstItemShop = cartItems?.[0]?.shop
        const shopId = typeof firstItemShop === 'string' ? firstItemShop : firstItemShop?._id
        if (!shopId) return
        const res = await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`, { withCredentials: true })
        const shop = res.data?.shop
        if (shop?.upiVpa) {
          setShopUpi({ vpa: shop.upiVpa, payeeName: shop.upiPayeeName || null })
        }
      } catch (error) {
        console.log('fetch shop UPI error', error)
      }
    }
    fetchShopUpi()
  }, [cartItems])

  // UPI deep link with auto amount for online payments (from shop settings)
  const upiAmount = grandTotal.toFixed(2)
  const upiPa = shopUpi.vpa || null
  const upiPn = shopUpi.payeeName || 'FoodWay'
  const upiNote = `Order`
  const upiLink = upiPa ? `upi://pay?pa=${encodeURIComponent(upiPa)}&pn=${encodeURIComponent(upiPn)}&tn=${encodeURIComponent(upiNote)}&am=${upiAmount}&cu=INR` : null
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)

  const handlePlaceOrder=async () => {
    // Validate required fields
    if (orderType === "delivery" && (!addressInput || addressInput.trim() === '')) {
      alert('Please enter a delivery address');
      return;
    }
    
    // Validate phone number (mandatory for all orders)
    if (!phoneNumber || phoneNumber.trim() === '') {
      alert('Please enter your phone number');
      return;
    }
    
    // Validate phone number format (exactly 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }
    
    try {
      const result=await axios.post(`${serverUrl}/api/order/place-order`,{
        paymentMethod,
        orderType,
        deliveryAddress: orderType === "delivery" ? {
          text:addressInput.trim()
        } : null,
        phoneNumber: phoneNumber.trim(),
        totalAmount:grandTotal,
        cartItems
      },{withCredentials:true})

      if(paymentMethod=="cod"){
      dispatch(addMyOrder(result.data))
      dispatch(clearCart())
      navigate("/order-placed")
      }else{
        const orderId=result.data.orderId
        const razorOrder=result.data.razorOrder
          openRazorpayWindow(orderId,razorOrder)
       }
    
    } catch (error) {
      console.error("Place order error:", error)
      if (error.response) {
        alert(`Order failed: ${error.response.data.message || 'Unknown error'}`)
      } else {
        alert('Order failed: Network error')
      }
    }
  }

const openRazorpayWindow=(orderId,razorOrder)=>{
  // Check if Razorpay is available
  if (typeof window.Razorpay === 'undefined') {
    alert('Payment service is currently unavailable. Please try again later or use Cash on Delivery.');
    return;
  }

  const options={
 key:import.meta.env.VITE_RAZORPAY_KEY_ID,
 amount:razorOrder.amount,
 currency:'INR',
 name:"FoodWay",
 description:"Food Delivery Website",
 order_id:razorOrder.id,
 handler:async function (response) {
  try {
    const result=await axios.post(`${serverUrl}/api/order/verify-payment`,{
      razorpay_payment_id:response.razorpay_payment_id,
      orderId
    },{withCredentials:true})
        dispatch(addMyOrder(result.data))
        dispatch(clearCart())
      navigate("/order-placed")
  } catch (error) {
    console.log(error)
    alert('Payment verification failed. Please contact support.')
  }
 },
 modal: {
   ondismiss: function() {
     alert('Payment cancelled. You can try again or use Cash on Delivery.');
   }
 }
  }

  try {
    const rzp=new window.Razorpay(options)
    rzp.open()
  } catch (error) {
    console.error('Razorpay initialization error:', error);
    alert('Payment service error. Please try Cash on Delivery or refresh the page.');
  }
}



  return (
    <div className='min-h-screen bg-[#fff9f6] flex items-center justify-center p-6'>
      <div className=' absolute top-[20px] left-[20px] z-[10]' onClick={() => navigate("/")}>
        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
      </div>
      <div className='w-full max-w-[900px] bg-white rounded-2xl shadow-xl p-6 space-y-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Checkout</h1>

        {/* Order Type Selection */}
        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Order Type</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${orderType === "delivery" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"
              }`} onClick={() => setOrderType("delivery")}>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                <MdDeliveryDining className='text-blue-600 text-xl' />
              </span>
              <div>
                <p className='font-medium text-gray-800'>Delivery</p>
                <p className='text-xs text-gray-500'>Get food delivered to your location</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${orderType === "pickup" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"
              }`} onClick={() => setOrderType("pickup")}>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100'>
                <IoLocationSharp className='text-green-600 text-xl' />
              </span>
              <div>
                <p className='font-medium text-gray-800'>Pickup</p>
                <p className='text-xs text-gray-500'>Collect your order from restaurant</p>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Location - Only show for delivery orders */}
        {orderType === "delivery" && (
        <section>
          <h2 className='text-lg font-semibold mb-2 flex items-center gap-2 text-gray-800'><IoLocationSharp className='text-[#ff4d2d]' /> Delivery Location</h2>
          <div className='space-y-3'>
            <input 
              type="text" 
              className='w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]' 
              placeholder='Enter your complete delivery address within the university campus (e.g., Room 101, Boys Hostel Block A, XYZ University)' 
              value={addressInput} 
              onChange={(e) => setAddressInput(e.target.value)} 
            />
            <p className='text-xs text-gray-500'>
              Please provide a detailed address including building name, room number, and any landmarks to help the delivery person find you easily.
            </p>
          </div>
        </section>
        )}

        {/* Phone Number - Mandatory for all orders */}
        <section>
          <h2 className='text-lg font-semibold mb-2 flex items-center gap-2 text-gray-800'>
            <FaMobileScreenButton className='text-[#ff4d2d]' /> Phone Number *
          </h2>
          <div className='space-y-3'>
            <input 
              type="tel" 
              className='w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]' 
              placeholder='Enter your 10-digit phone number (e.g., 9876543210)' 
              value={phoneNumber} 
              onChange={(e) => {
                // Only allow digits and limit to 10 characters
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(value);
              }}
              maxLength="10"
            />
            <p className='text-xs text-gray-500'>
              Please enter a valid 10-digit phone number for order updates and delivery coordination.
            </p>
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Payment Method</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${paymentMethod === "cod" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"
              }`} onClick={() => setPaymentMethod("cod")}>

              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100'>
                <MdDeliveryDining className='text-green-600 text-xl' />
              </span>
              <div >
                <p className='font-medium text-gray-800'>Cash On Delivery</p>
                <p className='text-xs text-gray-500'>Pay when your food arrives</p>
              </div>

            </div>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${paymentMethod === "online" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"
              }`} onClick={() => setPaymentMethod("online")}>

              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100'>
                <FaMobileScreenButton className='text-purple-700 text-lg' />
              </span>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                <FaCreditCard className='text-blue-700 text-lg' />
              </span>
              <div>
                <p className='font-medium text-gray-800'>UPI / Credit / Debit Card</p>
                <p className='text-xs text-gray-500'>Pay Securely Online</p>
              </div>
            </div>
          </div>
          {paymentMethod === "online" && (
            <div className='mt-3 p-3 border rounded-xl bg-blue-50'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-semibold text-blue-800'>Pay via UPI App</p>
                  <p className='text-xs text-blue-700'>Amount: ₹{upiAmount}</p>
                </div>
                {upiLink ? (
                  isMobile ? (
                    <a href={upiLink} target='_blank' rel='noopener noreferrer' className='bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold'>Open UPI</a>
                  ) : (
                    <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(upiLink)} className='bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold'>Copy UPI Link</button>
                  )
                ) : (
                  <span className='text-xs text-red-700'>Owner has not configured UPI. Please use Card or COD.</span>
                )}
              </div>
              {!isMobile && upiLink && (
                <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center'>
                  <div className='text-xs text-blue-800'>
                    <p>Your browser can’t open UPI links. Scan this QR using any UPI app on your phone, or paste the copied link into your UPI app.</p>
                  </div>
                  <div className='flex justify-end'>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`} alt='UPI QR Code' className='border rounded-lg' />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Order Summary</h2>
<div className='rounded-xl border bg-gray-50 p-4 space-y-2'>
{cartItems.map((item,index)=>(
  <div key={index} className='flex justify-between text-sm text-gray-700'>
<span>{item.name} x {item.quantity}</span>
<span>₹{item.price*item.quantity}</span>
  </div>
 
))}
 <hr className='border-gray-200 my-2'/>
<div className='flex justify-between font-medium text-gray-800'>
  <span>Subtotal (Owner Share)</span>
  <span>{ownerShare}</span>
</div>
{orderType === "delivery" && (
  <div className='flex justify-between text-gray-700'>
    <span>Delivery Boy Share (8%)</span>
    <span>{deliveryBoyShare}</span>
  </div>
)}
<div className='flex justify-between text-gray-700'>
  <span>Superadmin Fee (20%)</span>
  <span>{superadminFee}</span>
</div>
<div className='flex justify-between text-gray-700'>
  <span>Payment Fee (2%) {paymentMethod!=="online" && "- COD"}</span>
  <span>{paymentFee}</span>
</div>
<div className='flex justify-between text-lg font-bold text-[#ff4d2d] pt-2'>
    <span>Total</span>
  <span>{grandTotal}</span>
</div>
</div>
        </section>
        <button className='w-full bg-[#ff4d2d] hover:bg-[#e64526] text-white py-3 rounded-xl font-semibold' onClick={handlePlaceOrder}> {paymentMethod=="cod"?"Place Order":"Pay & Place Order"}</button>

      </div>
    </div>
  )
}

export default CheckOut
