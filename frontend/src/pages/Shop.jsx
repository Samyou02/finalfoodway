import axios from 'axios'
import React, { useCallback, useEffect, useState } from 'react'
import { serverUrl } from '../App'
import { useNavigate, useParams } from 'react-router-dom'
import { FaStore } from "react-icons/fa6";
import { FaLocationDot } from "react-icons/fa6";
import { FaUtensils } from "react-icons/fa";
import FoodCard from '../components/FoodCard';
import { FaArrowLeft } from "react-icons/fa";
import { useSelector } from 'react-redux';

function Shop() {
    const {shopId}=useParams()
    const [items,setItems]=useState([])
    const [shop,setShop]=useState([])
    const [shopClosed, setShopClosed] = useState(false)
    const navigate=useNavigate()
    const { socket } = useSelector(state => state.user)
    
    const handleShop = useCallback(async () => {
        try {
           const result=await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`,{withCredentials:true}) 
           setShop(result.data.shop)
           setItems(result.data.items)
           setShopClosed(!result.data.shop.isOpen)
        } catch (error) {
            console.log(error)
        }
    }, [shopId])

    // Real-time shop status updates
    useEffect(() => {
        if (socket && shopId) {
            socket.on('shopStatusUpdate', (data) => {
                if (data.shopId === shopId) {
                    console.log('Shop status update received for current shop:', data)
                    setShop(prevShop => ({ ...prevShop, isOpen: data.isOpen }))
                    setShopClosed(!data.isOpen)
                    
                    // If shop closed, clear items
                    if (!data.isOpen) {
                        setItems([])
                    } else {
                        // If shop reopened, refetch items
                        handleShop()
                    }
                }
            })

            return () => {
                socket.off('shopStatusUpdate')
            }
        }
    }, [socket, shopId, handleShop])

    useEffect(() => {
        handleShop()
    }, [handleShop])
  return (
    <div className='min-h-screen bg-gray-50'>
        <button className='absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-3 py-2 rounded-full shadow-md transition' onClick={()=>navigate("/")}>
        <FaArrowLeft />
<span>Back</span>
        </button>
      {shop && <div className='relative w-full h-64 md:h-80 lg:h-96'>
          <img src={shop.image} alt="" className='w-full h-full object-cover'/>
          <div className='absolute inset-0 bg-gradient-to-b from-black/70 to-black/30 flex flex-col justify-center items-center text-center px-4'>
          <FaStore className='text-white text-4xl mb-3 drop-shadow-md'/>
          <h1 className='text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg'>{shop.name}</h1>
          <div className='flex items-center  gap-[10px]'>
          <FaLocationDot size={22} color='red'/>
             <p className='text-lg font-medium text-gray-200 mt-[10px]'>{shop.address}</p>
             </div>
          </div>
       
        </div>}

<div className='max-w-7xl mx-auto px-6 py-10'>
<h2 className='flex items-center justify-center gap-3 text-3xl font-bold mb-10 text-gray-800'><FaUtensils color='red'/> Our Menu</h2>

{shopClosed ? (
    <div className='text-center py-20'>
        <FaStore className='text-gray-400 text-6xl mx-auto mb-4' />
        <h3 className='text-2xl font-bold text-gray-600 mb-2'>Shop is Currently Closed</h3>
        <p className='text-gray-500'>This restaurant is temporarily closed. Please check back later.</p>
    </div>
) : items.length > 0 ? (
    <div className='flex flex-wrap justify-center gap-8'>
        {items.map((item)=>(
            <FoodCard key={item._id} data={item}/>
        ))}
    </div>
) : (
    <p className='text-center text-gray-500 text-lg'>No Items Available</p>
)}
</div>



    </div>
  )
}

export default Shop
