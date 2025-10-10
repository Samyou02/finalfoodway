import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'

// Bottom popup prompting user to rate delivery boy post-delivery
function DeliveryRatingPopup() {
  const { myOrders } = useSelector(state => state.user)
  const [candidate, setCandidate] = useState(null) // { orderId, shopOrderId, deliveryBoyId, shopName }
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  // Find latest eligible delivered shopOrder with assigned delivery boy
  const latestEligible = useMemo(() => {
    if (!myOrders || myOrders.length === 0) return null
    for (const order of myOrders) {
      if (order?.shopOrders?.length) {
        for (const so of order.shopOrders) {
          if (so.status === 'delivered' && so.assignedDeliveryBoy) {
            return {
              orderId: order._id,
              shopOrderId: so._id,
              deliveryBoyId: so.assignedDeliveryBoy._id,
              shopName: so.shop?.name || 'Restaurant'
            }
          }
        }
      }
    }
    return null
  }, [myOrders])

  useEffect(() => {
    const checkAndShow = async () => {
      if (!latestEligible) {
        setVisible(false)
        setCandidate(null)
        return
      }
      const key = `deliveryRatingPrompt_${latestEligible.shopOrderId}`
      const expiresRaw = localStorage.getItem(key)
      const now = Date.now()

      try {
        // Check if already rated to avoid showing popup
        const res = await axios.get(`${serverUrl}/api/rating/order/${latestEligible.orderId}`, { withCredentials: true })
        const ratedStars = res?.data?.map?.[`${latestEligible.shopOrderId}-deliveryBoy`]
        if (ratedStars) {
          localStorage.removeItem(key)
          setVisible(false)
          setCandidate(null)
          return
        }
      } catch {
        // Non-blocking; continue with popup based on local storage
      }

      // Determine visibility with 2-minute persistence
      if (expiresRaw && Number(expiresRaw) > now) {
        setCandidate(latestEligible)
        setVisible(true)
      } else {
        const expires = now + 2 * 60 * 1000
        localStorage.setItem(key, String(expires))
        setCandidate(latestEligible)
        setVisible(true)
      }
    }

    checkAndShow()
    // Re-check on order changes
  }, [latestEligible])

  const submitRating = async (stars) => {
    if (!candidate) return
    setLoading(true)
    try {
      await axios.post(`${serverUrl}/api/rating/submit`, {
        orderId: candidate.orderId,
        shopOrderId: candidate.shopOrderId,
        type: 'deliveryBoy',
        targetId: candidate.deliveryBoyId,
        stars
      }, { withCredentials: true })
    } catch {
      // Non-blocking; still hide popup
    } finally {
      const key = `deliveryRatingPrompt_${candidate.shopOrderId}`
      localStorage.removeItem(key)
      setVisible(false)
      setCandidate(null)
      setLoading(false)
    }
  }

  if (!visible || !candidate) return null

  return (
    <div className='fixed bottom-4 left-0 right-0 flex justify-center z-50'>
      <div className='w-[95%] max-w-md bg-white border border-gray-200 shadow-xl rounded-2xl p-3 flex items-center justify-between'>
        <div className='flex-1 pr-3'>
          <p className='text-sm font-semibold text-gray-800'>Rate your delivery</p>
          <p className='text-xs text-gray-500'>How was the delivery from {candidate.shopName}?</p>
        </div>
        <div className='flex items-center gap-1'>
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              className={`text-xl ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} text-yellow-500`}
              onClick={() => !loading && submitRating(star)}
              disabled={loading}
            >★</button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DeliveryRatingPopup