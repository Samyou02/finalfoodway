import axios from 'axios'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setMyOrders } from '../redux/userSlice'
import { useSelector } from 'react-redux'

function UserOrderCard({ data }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { myOrders } = useSelector(state => state.user)
    const [selectedRating, setSelectedRating] = useState({})//itemId:rating
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [isEditingInstructions, setIsEditingInstructions] = useState(false)
    const [specialInstructions, setSpecialInstructions] = useState(data.specialInstructions || '')

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleString('en-GB', {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })

    }

    const handleRating = async (itemId, rating) => {
        try {
            const result = await axios.post(`${serverUrl}/api/item/rating`, { itemId, rating }, { withCredentials: true })
            setSelectedRating(prev => ({
                ...prev, [itemId]: rating
            }))
        } catch (error) {
            console.log(error)
        }
    }

    const handleDeleteOrder = async () => {
        if (!window.confirm('Are you sure you want to delete this order?')) {
            return
        }
        
        setIsDeleting(true)
        try {
            await axios.delete(`${serverUrl}/api/order/delete-order/${data._id}`, { withCredentials: true })
            // Remove the order from the local state
            const updatedOrders = myOrders.filter(order => order._id !== data._id)
            dispatch(setMyOrders(updatedOrders))
        } catch (error) {
            console.error('Error deleting order:', error)
            alert('Failed to delete order. Please try again.')
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
            const response = await axios.put(`${serverUrl}/api/order/update-special-instructions/${data._id}`, 
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

                                {shopOrder.status == "delivered" && <div className='flex space-x-1 mt-2'>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button className={`text-lg ${selectedRating[item.item._id] >= star ? 'text-yellow-400' : 'text-gray-400'}`} onClick={() => handleRating(item.item._id,star)}>★</button>
                                    ))}
                                </div>}



                            </div>
                        ))}
                    </div>
                    <div className='flex justify-between items-center border-t pt-2'>
                        <p className='font-semibold'>Subtotal: {shopOrder.subtotal}</p>
                        <span className='text-sm font-medium text-blue-600'>
                            {data.isCancelled ? 'cancelled' : shopOrder.status}
                        </span>
                    </div>
                    
                    {/* OTP Display for Out of Delivery Status */}
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
