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
  // New delivery fee calculation based on the formula:
  // Payout=max(MinFloor,(B+(D_rate×dist)+(T_rate×travel_time)+C)×M_demand+I−P)
  const calculateDeliveryFee = () => {
    if (orderType !== "delivery") return 0;
    
    // Constants for the formula
    const MinFloor = 30; // Minimum payout ₹30
    const B = totalAmount < 100 ? 20 : 15; // Base pay: ₹20 for below 1km equivalent, ₹15 otherwise
    const D_rate = 50; // Distance rate ₹50/km
    const T_rate = 1; // Time rate ₹1/min
    const C = 0; // Order complexity fee (standard order)
    const I = 20; // Incentives ₹20 bonus
    const P = 0; // Cancellation penalty ₹0
    
    // Estimated values (in real app, these would come from maps API)
    const estimatedDistance = 1.5; // km
    const estimatedTravelTime = 10; // minutes
    
    // Check if it's peak hours (6-9 AM, 12-2 PM, 6-10 PM)
    const currentHour = new Date().getHours();
    const isPeakHours = (currentHour >= 6 && currentHour <= 9) || 
                       (currentHour >= 12 && currentHour <= 14) || 
                       (currentHour >= 18 && currentHour <= 22);
    const M_demand = isPeakHours ? 1.5 : 1.0; // Demand multiplier
    
    // Calculate payout using the formula
    const calculatedPayout = (B + (D_rate * estimatedDistance) + (T_rate * estimatedTravelTime) + C) * M_demand + I - P;
    const finalPayout = Math.max(MinFloor, calculatedPayout);
    
    return Math.round(finalPayout);
  };
  
  const deliveryFee = calculateDeliveryFee();
  const AmountWithDeliveryFee = totalAmount + deliveryFee;

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
        totalAmount:AmountWithDeliveryFee,
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
  <span>Subtotal</span>
  <span>{totalAmount}</span>
</div>
<div className='flex justify-between text-gray-700'>
  <span>{orderType === "delivery" ? "Delivery Fee" : "Pickup"}</span>
  <span>{orderType === "delivery" ? (deliveryFee==0?"Free":deliveryFee) : "Free"}</span>
</div>
<div className='flex justify-between text-lg font-bold text-[#ff4d2d] pt-2'>
    <span>Total</span>
  <span>{AmountWithDeliveryFee}</span>
</div>
</div>
        </section>
        <button className='w-full bg-[#ff4d2d] hover:bg-[#e64526] text-white py-3 rounded-xl font-semibold' onClick={handlePlaceOrder}> {paymentMethod=="cod"?"Place Order":"Pay & Place Order"}</button>

      </div>
    </div>
  )
}

export default CheckOut
