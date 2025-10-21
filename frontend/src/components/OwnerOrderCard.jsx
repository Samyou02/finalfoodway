import React from 'react'
import { MdPhone } from "react-icons/md";
import { useDispatch, useSelector } from 'react-redux';
import { updateOrderStatus, setMyOrders } from '../redux/userSlice';
import { orderAPI } from '../api';
import { useState } from 'react';
import { useEffect } from 'react';
function OwnerOrderCard({ data }) {
    const [availableBoys,setAvailableBoys]=useState([])
    const [isDeleting, setIsDeleting] = useState(false)
    const dispatch=useDispatch()
    const { myOrders } = useSelector(state => state.user)
    
    // Remove noisy debug logs
    useEffect(() => {
        // Intentionally silent
    }, [data])
    
    const handleUpdateStatus=async (orderId,shopId,status) => {
        try {
            const result=await orderAPI.updateStatus(orderId, shopId, status)
             dispatch(updateOrderStatus({orderId,shopId,status}))
             setAvailableBoys(result.data.availableBoys)
             // Refresh orders for key status changes
             if(['confirmed','preparing','out of delivery','delivered'].includes(status)){
                const res = await orderAPI.getMyOrders()
                dispatch(setMyOrders(res.data))
             }
        } catch {
            // Silently ignore to avoid console noise
        }
    }

    const handleDeleteOrder = async () => {
        if (!window.confirm('Delete this order permanently?')) {
            return
        }
        setIsDeleting(true)
        try {
            await orderAPI.deleteOrder(data._id)
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
            <div>
                <h2 className='text-lg font-semibold text-gray-800'>{data?.user?.fullName || 'Unknown Customer'}</h2>
                <p className='text-sm text-gray-500'>{data?.user?.email || 'No email'}</p>
                <p className='flex items-center gap-2 text-sm text-gray-600 mt-1'><MdPhone /><span>{data?.user?.mobile || 'No phone'}</span></p>
                {data?.paymentMethod === "online" ? 
                    <p className='gap-2 text-sm text-gray-600'>payment: {data?.payment ? "true" : "false"}</p> : 
                    <p className='gap-2 text-sm text-gray-600'>Payment Method: {data?.paymentMethod || 'Unknown'}</p>
                }
            </div>

            <div className='flex items-start flex-col gap-2 text-gray-600 text-sm'>
                <p><span className='font-medium'>Delivery Address:</span> {data?.deliveryAddress?.text || 'No address provided'}</p>
            </div>

            {/* Special Instructions Section */}
            {data?.specialInstructions && (
                <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg p-4'>
                    <div className='flex items-start gap-2'>
                        <div className='bg-blue-100 rounded-full p-1 mt-0.5'>
                            <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                                <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
                            </svg>
                        </div>
                        <div className='flex-1'>
                            <h4 className='text-sm font-semibold text-blue-800 mb-1'>📝 Special Instructions</h4>
                            <p className='text-sm text-blue-700 leading-relaxed'>{data.specialInstructions}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className='flex space-x-4 overflow-x-auto pb-2'>
                {data?.shopOrders?.shopOrderItems && Array.isArray(data.shopOrders.shopOrderItems) && data.shopOrders.shopOrderItems.length > 0 ? (
                    data.shopOrders.shopOrderItems.map((item, index) => (
                        <div key={index} className='flex-shrink-0 w-40 border rounded-lg p-2 bg-white'>
                            <img src={item.item?.image || '/placeholder-food.jpg'} alt={item.name || 'Food item'} className='w-full h-24 object-cover rounded' />
                            <p className='text-sm font-semibold mt-1'>{item.name || item.item?.name || 'Unknown Item'}</p>
                            <p className='text-xs text-gray-500'>Qty: {item.quantity || 0} x ₹{item.price || item.item?.price || 0}</p>
                            
                            {/* Display item rating */}
                            {item.item?.rating && (item.item.rating.count > 0 || item.item.rating.average > 0) && (
                                <div className='flex items-center gap-1 mt-1'>
                                    <span className='text-yellow-500 text-xs'>★</span>
                                    <span className='text-xs text-gray-600'>
                                        {item.item.rating.average.toFixed(1)} ({item.item.rating.count})
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className='text-gray-500'>No items found</div>
                )}
            </div>

            <div className='flex justify-between items-center mt-auto pt-3 border-t border-gray-100'>
                <span className='text-sm'>Status: <span className='font-semibold capitalize text-[#ff4d2d]'>
                    {data?.isCancelled ? 'cancelled' : (data?.shopOrders?.status || 'Unknown')}
                </span></span>
                {/* Allow status changes unless status is out of delivery or rejected */}
                {(!data?.isCancelled && (data?.shopOrders?.status !== "out of delivery" && data?.shopOrders?.status !== "rejected")) ? (
                    <select className='rounded-md border px-3 py-1 text-sm focus:outline-none focus:ring-2 border-[#ff4d2d] text-[#ff4d2d]' onChange={(e)=>handleUpdateStatus(data._id,data?.shopOrders?.shop?._id,e.target.value)}>
                        <option value="">Change Status</option>
                        {/* From pending: can choose confirmed, rejected, preparing, out of delivery */}
                        {(!data?.shopOrders?.status || data?.shopOrders?.status === "pending") && <>
                          <option value="confirmed">Confirm</option>
                          <option value="rejected">Reject</option>
                          <option value="preparing">Preparing</option>
                          {data?.deliveryAddress?.text && <option value="out of delivery">Out Of Delivery</option>}
                        </>}
                        {/* From confirmed: can switch to preparing, out of delivery, or reject */}
                        {data?.shopOrders?.status === "confirmed" && <>
                          <option value="preparing">Preparing</option>
                          {data?.deliveryAddress?.text && <option value="out of delivery">Out Of Delivery</option>}
                          <option value="rejected">Reject</option>
                        </>}
                        {/* From preparing: can switch to out of delivery or reject */}
                        {data?.shopOrders?.status === "preparing" && <>
                          {data?.deliveryAddress?.text && <option value="out of delivery">Out Of Delivery</option>}
                          <option value="rejected">Reject</option>
                        </>}
                    </select>
                ) : (
                    <span className='text-xs text-gray-500 italic'>
                        {data?.isCancelled ? 'Order cancelled by customer' : 
                         data?.shopOrders?.status === "out of delivery" ? 'Order is out for delivery' : 
                         'Status cannot be changed'}
                    </span>
                )}
                {/* For PICKUP orders, provide a direct "Mark as Delivered" action */}
                {(!data?.isCancelled && !data?.deliveryAddress?.text && !['delivered','rejected'].includes(data?.shopOrders?.status)) && (
                    <button
                        className='ml-3 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs transition-colors duration-200'
                        onClick={() => handleUpdateStatus(data._id, data?.shopOrders?.shop?._id, 'delivered')}
                    >
                        Mark as Delivered (Pickup)
                    </button>
                )}
            </div>

            {/* Receipt Details for Owner */}
            {data?.shopOrders?.receipt?.receiptNumber && (
                <div className='mt-3 p-3 border rounded-lg bg-green-50 text-sm'>
                    <p className='font-semibold text-green-800'>Receipt Generated</p>
                    <p className='text-green-700'>Number: {data.shopOrders.receipt.receiptNumber}</p>
                    <p className='text-green-700'>Items: {data.shopOrders.receipt.items?.length || 0} | Subtotal: ₹{data.shopOrders.receipt.subtotal}</p>
                </div>
            )}

            {data?.shopOrders?.status === "out of delivery" && 
                <div className="mt-3 p-3 border rounded-lg text-sm bg-orange-50">
                    <div className='mb-2'>
                        {data?.shopOrders?.assignedDeliveryBoy ? (
                            <p className='font-medium text-orange-800'>Assigned Delivery Boy:</p>
                        ) : (
                            <p className='font-medium text-orange-800'>Available Delivery Boys:</p>
                        )}
                    </div>
                    <div className='space-y-1'>
                        {availableBoys && Array.isArray(availableBoys) && availableBoys.length > 0 ? (
                            availableBoys.map((b, index) => (
                                <div key={index} className='text-gray-800 bg-white p-2 rounded border'>
                                    <span className='font-medium'>{b.fullName || 'Unknown'}</span> - <span className='text-gray-600'>{b.mobile || 'No phone'}</span>
                                </div>
                            ))
                        ) : data?.shopOrders?.assignedDeliveryBoy ? (
                            <div className='text-gray-800 bg-white p-2 rounded border'>
                                <span className='font-medium'>{data.shopOrders.assignedDeliveryBoy.fullName || 'Unknown'}</span> - <span className='text-gray-600'>{data.shopOrders.assignedDeliveryBoy.mobile || 'No phone'}</span>
                            </div>
                        ) : (
                            <div className='text-orange-600 italic'>Waiting for delivery boy to accept</div>
                        )}
                    </div>
                </div>
            }

            <div className='flex justify-between items-center font-bold text-gray-800 text-sm mt-4 pt-3 border-t border-gray-100'>
                <button 
                    className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-xs disabled:opacity-50 transition-colors duration-200' 
                    onClick={handleDeleteOrder}
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Deleting...' : 'Delete Order'}
                </button>
                <span className='text-lg font-bold text-[#ff4d2d]'>Total: ₹{data?.shopOrders?.subtotal || 0}</span>
            </div>
        </div>
    )
}

export default OwnerOrderCard
