import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { clearCartNotification } from '../redux/userSlice'
import { FaInfoCircle, FaTimes } from 'react-icons/fa'

function CartNotification() {
  const dispatch = useDispatch()
  const { cartClearedForNewShop } = useSelector(state => state.user)

  useEffect(() => {
    if (cartClearedForNewShop) {
      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => {
        dispatch(clearCartNotification())
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [cartClearedForNewShop, dispatch])

  if (!cartClearedForNewShop) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-start">
        <FaInfoCircle className="text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm">Cart Updated</p>
          <p className="text-xs mt-1">
            Your previous cart items were removed because you can only order from one shop at a time.
          </p>
        </div>
        <button
          onClick={() => dispatch(clearCartNotification())}
          className="ml-2 text-orange-500 hover:text-orange-700 flex-shrink-0"
        >
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  )
}

export default CartNotification