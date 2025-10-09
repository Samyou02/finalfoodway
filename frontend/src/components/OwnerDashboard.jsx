import React, { useState } from 'react'
import Nav from './NaV.JSX'
import { useSelector, useDispatch } from 'react-redux'
import { FaUtensils, FaStore, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { FaPen } from "react-icons/fa";
import OwnerItemCard from './ownerItemCard';
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData } from '../redux/ownerSlice';

function OwnerDashboard() {
  const { myShopData } = useSelector(state => state.owner)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [ratingSummary, setRatingSummary] = useState(null)

  const fetchRatings = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/rating/shop/my`, { withCredentials: true })
      setRatingSummary(res.data)
    } catch (error) {
      console.log('fetch owner ratings error', error)
    }
  }

  React.useEffect(() => {
    fetchRatings()
  }, [])

  const handleShopStatusToggle = async () => {
    try {
      setIsUpdatingStatus(true)
      const newStatus = !myShopData.isOpen
      
      const result = await axios.put(`${serverUrl}/api/shop/update-status`, 
        { isOpen: newStatus }, 
        { withCredentials: true }
      )
      
      // Update the shop data in Redux store
      dispatch(setMyShopData(result.data.shop))
      
    } catch (error) {
      console.log('Error updating shop status:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  
  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex flex-col items-center'>
      <Nav />
      {!myShopData &&
        <div className='flex justify-center items-center p-4 sm:p-6'>
          <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your Restaurant</h2>
              <p className='text-gray-600 mb-4 text-sm sm:text-base'>Join our food delivery platform and reach thousands of hungry customers every day.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={() => navigate("/create-edit-shop")}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      }

      {myShopData &&
        <div className='w-full flex flex-col items-center gap-6 px-4 sm:px-6'>
          <h1 className='text-2xl sm:text-3xl text-gray-900 flex items-center gap-3 mt-8 text-center'><FaUtensils className='text-[#ff4d2d] w-14 h-14 ' />Welcome to {myShopData.name}</h1>

          {/* Rating Summary */}
          <div className='w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='bg-white rounded-xl p-4 shadow border'>
              <p className='text-sm text-gray-600'>Shop Rating</p>
              {(() => {
                const summary = ratingSummary?.summaries?.find(s => String(s.shopId) === String(myShopData?._id))
                const avg = summary?.rating?.average ?? myShopData?.rating?.average ?? 0
                const count = summary?.rating?.count ?? myShopData?.rating?.count ?? 0
                return (
                  <>
                    <p className='text-2xl font-bold text-[#ff4d2d]'>{Number(avg).toFixed(1)}</p>
                    <p className='text-xs text-gray-500'>from {count} reviews</p>
                  </>
                )
              })()}
            </div>
            {ratingSummary?.summaries?.length > 0 && (
              <div className='md:col-span-2 bg-white rounded-xl p-4 shadow border'>
                <p className='text-sm font-semibold text-gray-800 mb-2'>Recent Reviews</p>
                <div className='space-y-2 max-h-40 overflow-auto'>
                  {ratingSummary.ratings.slice(0,5).map(r => (
                    <div key={r._id} className='flex items-center justify-between text-sm'>
                      <span className='text-gray-700'>★ {r.stars} - {new Date(r.createdAt).toLocaleDateString()}</span>
                      <span className='text-gray-500'>{r.comment}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shop Status Toggle */}
          <div className='bg-white shadow-lg rounded-xl p-4 border border-orange-100 w-full max-w-3xl'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <FaStore className='text-[#ff4d2d] w-6 h-6' />
                <div>
                  <h3 className='text-lg font-semibold text-gray-800'>Shop Status</h3>
                  <p className='text-sm text-gray-600'>
                    Your shop is currently {myShopData.isOpen ? 'open' : 'closed'}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className={`text-sm font-medium ${myShopData.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {myShopData.isOpen ? 'Open' : 'Closed'}
                </span>
                <button
                  onClick={handleShopStatusToggle}
                  disabled={isUpdatingStatus}
                  className={`text-3xl transition-colors ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                >
                  {myShopData.isOpen ? (
                    <FaToggleOn className='text-green-500' />
                  ) : (
                    <FaToggleOff className='text-gray-400' />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className='bg-white shadow-lg rounded-xl overflow-hidden border border-orange-100 hover:shadow-2xl transition-all duration-300 w-full max-w-3xl relative'>
            <div className='absolute top-4 right-4 bg-[#ff4d2d] text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors cursor-pointer' onClick={()=>navigate("/create-edit-shop")}>
<FaPen size={20}/>
            </div>
             <img src={myShopData.image} alt={myShopData.name} className='w-full h-48 sm:h-64 object-cover'/>
             <div className='p-4 sm:p-6'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>{myShopData.name}</h1>
              <p className='text-gray-500 '>{myShopData.city},{myShopData.state}</p>
              <p className='text-gray-500 mb-4'>{myShopData.address}</p>
            </div>
          </div>

          {myShopData.items.length==0 && 
            <div className='flex justify-center items-center p-4 sm:p-6'>
          <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your Food Item</h2>
              <p className='text-gray-600 mb-4 text-sm sm:text-base'>Share your delicious creations with our customers by adding them to the menu.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={() => navigate("/add-item")}>
              Add Food
              </button>
            </div>
          </div>
        </div>
            }

            {myShopData.items.length>0 && <div className='flex flex-col items-center gap-4 w-full max-w-3xl '>
              {myShopData.items.map((item,index)=>(
                <OwnerItemCard data={item} key={index}/>
              ))}
              </div>}
            
        </div>}



    </div>
  )
}

export default OwnerDashboard
