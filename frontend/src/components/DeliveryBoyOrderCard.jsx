import React, { useState } from 'react'
import { MdPhone, MdLocationOn } from 'react-icons/md'
import axios from 'axios'
import { serverUrl } from '../App'
import { ClipLoader } from 'react-spinners'
import { useDispatch, useSelector } from 'react-redux'
import { updateOrderStatus, setMyOrders } from '../redux/userSlice'

function DeliveryBoyOrderCard({ data, onOrderUpdate }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const dispatch = useDispatch()
    const { myOrders } = useSelector(state => state.user)
    const [showOtpBox, setShowOtpBox] = useState(false)
    const [otp, setOtp] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    const sendOtp = async () => {
        // Delivery boy should not generate OTP; only prompt for entry
        setShowOtpBox(true)
        setMessage('Ask customer to generate OTP from their app.')
    }

    const verifyOtp = async () => {
        setLoading(true)
        try {
            const result = await axios.post(`${serverUrl}/api/order/verify-delivery-otp`, { orderId: data._id, shopOrderId: data.shopOrders._id, otp }, { withCredentials: true })
            setMessage(result.data.message)
            // Update the order status locally and notify parent component
            dispatch(updateOrderStatus({ orderId: data._id, status: 'delivered' }))
            setOtp("")
            setShowOtpBox(false)
            // Call parent callback to refresh data if provided
            if (onOrderUpdate) {
                onOrderUpdate()
            }
        } catch (error) {
            setMessage(error.response?.data?.message || "Invalid OTP")
        }
        setLoading(false)
    }

    const handleDeleteOrder = async () => {
        if (!window.confirm('Delete this order permanently?')) {
            return
        }
        setIsDeleting(true)
        try {
            await axios.delete(`${serverUrl}/api/order/delete-order/${data._id}`, { withCredentials: true })
            const updatedOrders = myOrders.filter(order => order._id !== data._id)
            dispatch(setMyOrders(updatedOrders))
            alert('Order deleted successfully')
        } catch (error) {
            console.error('Error deleting order:', error)
            alert(error.response?.data?.message || 'Failed to delete order. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className='bg-white rounded-lg shadow p-4 space-y-4'>
            {/* Customer Information */}
            <div>
                <h2 className='text-lg font-semibold text-gray-800'>{data.user.fullName}</h2>
                <p className='text-sm text-gray-500'>{data.user.email}</p>
                <p className='flex items-center gap-2 text-sm text-gray-600 mt-1'>
                    <MdPhone />
                    <span>{data.user.mobile}</span>
                </p>
                <p className='text-sm text-gray-600'>
                    Payment: {data.paymentMethod === "online" ? (data.payment ? "Paid" : "Pending") : "Cash on Delivery"}
                </p>
            </div>

            {/* Delivery Address */}
            <div className='flex items-start gap-2 text-gray-600 text-sm'>
                <MdLocationOn className='mt-1 text-red-500' />
                <div>
                    <p className='font-medium'>Delivery Address:</p>
                    <p>{data?.deliveryAddress?.text}</p>
                </div>
            </div>

            {/* Shop Information */}
            <div className='bg-orange-50 p-3 rounded-lg'>
                <p className='font-semibold text-orange-800'>Shop: {data.shopOrders.shop.name}</p>
                <p className='text-sm text-orange-600'>
                    Owner: {data.shopOrders.owner.fullName} - {data.shopOrders.owner.mobile}
                </p>
                {data?.shopOrders?.receipt?.receiptNumber && (
                    <p className='text-xs text-green-700 mt-1'>Receipt: {data.shopOrders.receipt.receiptNumber}</p>
                )}
            </div>

            {/* Order Items */}
            <div className='flex space-x-4 overflow-x-auto pb-2'>
                {data.shopOrders.shopOrderItems.map((item, index) => (
                    <div key={index} className='flex-shrink-0 w-40 border rounded-lg p-2 bg-white'>
                        <img src={item.item.image} alt="" className='w-full h-24 object-cover rounded' />
                        <p className='text-sm font-semibold mt-1'>{item.name}</p>
                        <p className='text-xs text-gray-500'>Qty: {item.quantity} x ₹{item.price}</p>
                    </div>
                ))}
            </div>

            {/* Order Status and Actions */}
            <div className='flex justify-between items-center pt-3 border-t border-gray-100'>
                <div className='flex items-center gap-2'>
                    <span className='text-sm'>
                        Status: <span className='font-semibold capitalize text-[#ff4d2d]'>{data.shopOrders.status}</span>
                    </span>
                    <button 
                        className='bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50' 
                        onClick={handleDeleteOrder}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
                <span className='text-sm font-bold text-gray-800'>
                    Total: ₹{data.shopOrders.subtotal}
                </span>
            </div>

            {/* OTP Section for Out of Delivery Status */}
            {data.shopOrders.status === "out of delivery" && (
                <div className='mt-4 p-4 border rounded-xl bg-blue-50'>
                    {!showOtpBox ? (
                        <button 
                            className='w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all duration-200' 
                            onClick={sendOtp} 
                            disabled={loading}
                        >
                            {loading ? <ClipLoader size={20} color='white' /> : "Mark As Delivered"}
                        </button>
                    ) : (
                        <div className='space-y-3'>
                            <p className='text-sm font-semibold'>
                                Enter OTP from customer: <span className='text-orange-500'>{data.user.fullName}</span>
                            </p>
                            <input 
                                type="text" 
                                className='w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400' 
                                placeholder='Enter OTP' 
                                onChange={(e) => setOtp(e.target.value)} 
                                value={otp}
                            />
                            {message && (
                                <p className='text-center text-blue-700 text-sm font-medium'>{message}</p>
                            )}
                            <button 
                                className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all" 
                                onClick={verifyOtp}
                                disabled={loading}
                            >
                                {loading ? <ClipLoader size={20} color='white' /> : "Submit OTP"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Delivered Status */}
            {data.shopOrders.status === "delivered" && (
                <div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center'>
                    <p className='text-green-700 font-semibold'>✅ Order Delivered Successfully</p>
                </div>
            )}
        </div>
    )
}

export default DeliveryBoyOrderCard