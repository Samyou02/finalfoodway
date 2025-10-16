import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setMyOrders } from '../redux/userSlice'
import { useSelector } from 'react-redux'
import { ClipLoader } from 'react-spinners'

function UserOrderCard({ data }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { myOrders } = useSelector(state => state.user)
    const [entityRatings, setEntityRatings] = useState({}) // keys: `${shopOrderId}-shop`, `${shopOrderId}-deliveryBoy`, `${itemId}-item`
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [isEditingInstructions, setIsEditingInstructions] = useState(false)
    const [specialInstructions, setSpecialInstructions] = useState(data.specialInstructions || '')
    const [otpMessage, setOtpMessage] = useState("")
    const [otpLoading, setOtpLoading] = useState(false)

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleString('en-GB', {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })

    }

    // Load any existing ratings for this order (persist star colors)
    useEffect(() => {
        const fetchExistingRatings = async () => {
            try {
                const res = await axios.get(`${serverUrl}/api/rating/order/${data._id}`, { withCredentials: true })
                if (res.data?.map) {
                    setEntityRatings(res.data.map)
                }
            } catch (e) {
                // non-blocking
                console.log('load order ratings error', e?.response?.data || e)
            }
        }
        if (data?.shopOrders?.length) fetchExistingRatings()
    }, [data?._id, data?.shopOrders?.length])

    const handleItemRating = async (shopOrder, itemId, stars) => {
        try {
            await axios.post(`${serverUrl}/api/rating/submit`, {
                orderId: data._id,
                shopOrderId: shopOrder._id,
                type: 'item',
                targetId: itemId,
                stars
            }, { withCredentials: true })
            setEntityRatings(prev => ({ ...prev, [`${itemId}-item`]: stars }))
        } catch (error) {
            console.log('submit item rating error', error?.response?.data || error)
        }
    }

    const handleEntityRating = async (shopOrder, type, stars) => {
        try {
            const targetId = type === 'shop' ? shopOrder.shop._id : shopOrder.assignedDeliveryBoy?._id
            if (!targetId) return
            await axios.post(`${serverUrl}/api/rating/submit`, {
                orderId: data._id,
                shopOrderId: shopOrder._id,
                type,
                targetId,
                stars
            }, { withCredentials: true })
            setEntityRatings(prev => ({ ...prev, [`${shopOrder._id}-${type}`]: stars }))
        } catch (error) {
            console.log('submit rating error', error?.response?.data || error)
        }
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

    const handleCancelOrder = async () => {
        if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
            return
        }
        
        setIsCancelling(true)
        try {
            await axios.post(`${serverUrl}/api/order/cancel-order/${data._id}`, { reason: 'User cancelled' }, { withCredentials: true })
            // Update the order status in local state
            const updatedOrders = myOrders.map(order => {
                if (order._id === data._id) {
                    return {
                        ...order,
                        isCancelled: true,
                        cancellationReason: 'User cancelled',
                        shopOrders: order.shopOrders.map(shopOrder => ({
                            ...shopOrder,
                            status: 'cancelled'
                        }))
                    }
                }
                return order
            })
            dispatch(setMyOrders(updatedOrders))
            alert('Order cancelled successfully')
        } catch (error) {
            console.error('Error cancelling order:', error)
            alert(error.response?.data?.message || 'Failed to cancel order. Please try again.')
        } finally {
            setIsCancelling(false)
        }
    }

    const handleUpdateSpecialInstructions = async () => {
        try {
            await axios.put(`${serverUrl}/api/order/update-special-instructions/${data._id}`, 
                { specialInstructions }, 
                { withCredentials: true }
            )
            
            // Update the order in local state
            const updatedOrders = myOrders.map(order => {
                if (order._id === data._id) {
                    return {
                        ...order,
                        specialInstructions: specialInstructions
                    }
                }
                return order
            })
            dispatch(setMyOrders(updatedOrders))
            setIsEditingInstructions(false)
            alert('Special instructions updated successfully')
        } catch (error) {
            console.error('Error updating special instructions:', error)
            alert(error.response?.data?.message || 'Failed to update special instructions')
        }
    }

    const handleGenerateOtp = async (shopOrderId) => {
        setOtpMessage("")
        setOtpLoading(true)
        try {
            const result = await axios.post(`${serverUrl}/api/order/send-delivery-otp`, {
                orderId: data._id,
                shopOrderId
            }, { withCredentials: true })
            if (result.data.isExisting) {
                setOtpMessage('Existing OTP resent successfully.')
            } else {
                setOtpMessage('New OTP generated and sent successfully.')
            }
        } catch (error) {
            setOtpMessage(error.response?.data?.message || 'Failed to generate OTP')
        } finally {
            setOtpLoading(false)
        }
    }

    const canEditInstructions = () => {
        return data.shopOrders.some(shopOrder => 
            shopOrder.status === 'pending' || shopOrder.status === 'preparing'
        ) && !data.isCancelled
    }


    return (
        <div className='bg-white rounded-lg shadow p-4 space-y-4'>
            <div className='flex justify-between border-b pb-2'>
                <div>
                    <p className='font-semibold'>
                        order #{data.orderId || data._id.slice(-6)}
                    </p>
                    <p className='text-sm text-gray-500'>
                        Date: {formatDate(data.createdAt)}
                    </p>
                </div>
                <div className='text-right'>
                    {data.paymentMethod == "cod" ? <p className='text-sm text-gray-500'>{data.paymentMethod?.toUpperCase()}</p> : <p className='text-sm text-gray-500 font-semibold'>Payment: {data.payment ? "true" : "false"}</p>}

                    <p className='font-medium text-blue-600'>
                        {data.isCancelled ? 'cancelled' : data.shopOrders?.[0].status}
                    </p>
                </div>
            </div>

            {data.shopOrders.map((shopOrder, index) => (
                <div className='"border rounded-lg p-3 bg-[#fffaf7] space-y-3' key={index}>
                    <p>{shopOrder.shop.name}</p>

                    <div className='flex space-x-4 overflow-x-auto pb-2'>
                        {shopOrder.shopOrderItems.map((item, index) => (
                            <div key={index} className='flex-shrink-0 w-40 border rounded-lg p-2 bg-white"'>
                                <img src={item.item.image} alt="" className='w-full h-24 object-cover rounded' />
                                <p className='text-sm font-semibold mt-1'>{item.name}</p>
                                <p className='text-xs text-gray-500'>Qty: {item.quantity} x ₹{item.price}</p>

                                {shopOrder.status == "delivered" && (
                                    <div className='flex space-x-1 mt-2'>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                className={`text-lg ${ (entityRatings[`${item.item._id}-item`] || 0) >= star ? 'text-yellow-400' : 'text-gray-400'}`}
                                                onClick={() => handleItemRating(shopOrder, item.item._id, star)}
                                            >★</button>
                                        ))}
                                    </div>
                                )}



                            </div>
                        ))}
                    </div>
                    <div className='flex justify-between items-center border-t pt-2'>
                        <p className='font-semibold'>Subtotal: {shopOrder.subtotal}</p>
                        <span className='text-sm font-medium text-blue-600'>
                            {data.isCancelled ? 'cancelled' : shopOrder.status}
                        </span>
                    </div>

                    {/* Receipt Details for User */}
                    {shopOrder?.receipt?.receiptNumber && (
                        <div className='mt-3 p-3 border rounded-lg bg-green-50 text-sm'>
                            <p className='font-semibold text-green-800'>Receipt Generated</p>
                            <p className='text-green-700'>Number: {shopOrder.receipt.receiptNumber}</p>
                            <p className='text-green-700'>Items: {shopOrder.receipt.items?.length || 0} | Subtotal: ₹{shopOrder.receipt.subtotal}</p>
                        </div>
                    )}

                    {/* Rate Restaurant after delivery */}
                    {shopOrder.status === 'delivered' && (
                        <div className='mt-3'>
                            <div className='p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-lg'>
                                <p className='text-sm font-semibold text-indigo-800 mb-1'>Rate Restaurant</p>
                                <div className='flex space-x-1'>
                                    {[1,2,3,4,5].map(star => (
                                        <button key={star} className={`text-xl ${ (entityRatings[`${shopOrder._id}-shop`] || 0) >= star ? 'text-yellow-400' : 'text-gray-300' }`}
                                            onClick={() => handleEntityRating(shopOrder, 'shop', star)}>★</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* OTP for Out of Delivery Status */}
                    {shopOrder.status === "out of delivery" && shopOrder.deliveryOtp && (
                        <div className='mt-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-lg'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <h4 className='text-lg font-bold text-orange-800 mb-1'>🔐 Delivery OTP</h4>
                                    <p className='text-sm text-orange-600 mb-2'>Share this OTP with your delivery person</p>
                                </div>
                                <div className='text-right'>
                                    <div className='bg-white px-4 py-2 rounded-lg border-2 border-orange-300 shadow-sm'>
                                        <span className='text-2xl font-bold text-orange-800 tracking-wider'>{shopOrder.deliveryOtp}</span>
                                    </div>
                                    {shopOrder.otpExpires && (
                                        <p className='text-xs text-orange-500 mt-1'>
                                            Expires: {new Date(shopOrder.otpExpires).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {shopOrder.status === "out of delivery" && !shopOrder.deliveryOtp && (
                        <div className='mt-3 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <h4 className='text-lg font-bold text-orange-800 mb-1'>Generate Delivery OTP</h4>
                                    <p className='text-sm text-orange-600'>Tap to generate and share with delivery person</p>
                                </div>
                                <button 
                                    className='bg-orange-500 text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 disabled:opacity-50'
                                    onClick={() => handleGenerateOtp(shopOrder._id)}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? <ClipLoader size={20} color='white' /> : 'Generate OTP'}
                                </button>
                            </div>
                            {otpMessage && (
                                <p className='text-sm text-orange-700 mt-2'>{otpMessage}</p>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Special Instructions Section */}
            {(data.specialInstructions || canEditInstructions()) && (
                <div className='mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg'>
                    <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                            <h4 className='text-lg font-bold text-blue-800 mb-2 flex items-center'>
                                📝 Special Instructions
                            </h4>
                            {isEditingInstructions ? (
                                <div className='space-y-3'>
                                    <textarea
                                        value={specialInstructions}
                                        onChange={(e) => setSpecialInstructions(e.target.value)}
                                        placeholder="Add any special instructions for your order..."
                                        className='w-full p-3 border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                                        rows={3}
                                        maxLength={500}
                                    />
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={handleUpdateSpecialInstructions}
                                            className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm'
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingInstructions(false)
                                                setSpecialInstructions(data.specialInstructions || '')
                                            }}
                                            className='bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm'
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className='bg-white p-3 rounded-lg border border-blue-200 shadow-sm'>
                                    <p className='text-blue-700 text-sm leading-relaxed'>
                                        {data.specialInstructions || 'No special instructions added'}
                                    </p>
                                </div>
                            )}
                        </div>
                        {canEditInstructions() && !isEditingInstructions && (
                            <button
                                onClick={() => setIsEditingInstructions(true)}
                                className='ml-3 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm'
                            >
                                Edit
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className='flex justify-between items-center border-t pt-2'>
                <p className='font-semibold'>Total: ₹{data.totalAmount}</p>
                <div className='flex gap-2'>
                    {/* Show cancel button only for pending orders and not cancelled orders */}
                    {data.shopOrders.some(shopOrder => shopOrder.status === 'pending') && !data.isCancelled && (
                        <button 
                            className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50' 
                            onClick={handleCancelOrder}
                            disabled={isCancelling}
                        >
                            {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                    )}
                    <button 
                        className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50' 
                        onClick={handleDeleteOrder}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-4 py-2 rounded-lg text-sm' onClick={() => navigate(`/track-order/${data._id}`)}>Track Order</button>
                </div>
            </div>



        </div>
    )
}

export default UserOrderCard
