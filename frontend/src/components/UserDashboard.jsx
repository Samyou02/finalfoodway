import React, { useCallback, useEffect, useRef, useState } from 'react'
import Nav from './Nav.jsx'
import { fetchCategories } from '../category'
import CategoryCard from './CategoryCard'
import { FaCircleChevronLeft } from "react-icons/fa6";
import { FaCircleChevronRight } from "react-icons/fa6";
import { FaFilter } from "react-icons/fa";
import { useSelector, useDispatch } from 'react-redux';
import FoodCard from './FoodCard';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../App';
import { setItemsInMyCity, setShopsInMyCity } from '../redux/userSlice';

function UserDashboard() {
  const {currentCity,shopInMyCity,itemsInMyCity,searchItems,socket}=useSelector(state=>state.user)
  const dispatch = useDispatch()
  const cateScrollRef=useRef()
  const shopScrollRef=useRef()
  const navigate=useNavigate()
  const [showLeftCateButton,setShowLeftCateButton]=useState(false)
  const [showRightCateButton,setShowRightCateButton]=useState(false)
   const [showLeftShopButton,setShowLeftShopButton]=useState(false)
  const [showRightShopButton,setShowRightShopButton]=useState(false)
  const [updatedItemsList,setUpdatedItemsList]=useState([])
  const [dynamicCategories, setDynamicCategories] = useState([])
  
  // Sorting and filtering states
  const [sortBy, setSortBy] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterFoodType, setFilterFoodType] = useState('All')
  const [showFilters, setShowFilters] = useState(false)

// Function to fetch all items
const fetchItems = useCallback(async () => {
  try {
    // Build query parameters for backend filtering and sorting
    const params = new URLSearchParams()
    
    // Add sorting parameter if selected
    if (sortBy && sortBy !== '') {
      switch (sortBy) {
        case 'price_low_high':
          params.append('sortBy', 'price_low')
          break
        case 'price_high_low':
          params.append('sortBy', 'price_high')
          break
        case 'prep_time':
          params.append('sortBy', 'prep_time')
          break
        case 'popularity':
          params.append('sortBy', 'popularity')
          break
        case 'rating':
          params.append('sortBy', 'rating')
          break
        case 'newest':
          params.append('sortBy', 'newest')
          break
        case 'available_now':
          params.append('sortBy', 'available_first')
          break
      }
    }
    
    // Add category filter if not "All"
    if (filterCategory && filterCategory !== 'All') {
      params.append('category', filterCategory)
    }
    
    // Add food type filter if not "All"
    if (filterFoodType && filterFoodType !== 'All') {
      params.append('foodType', filterFoodType)
    }
    
    const queryString = params.toString()
    const url = `${serverUrl}/api/item/get-by-city/${currentCity}${queryString ? `?${queryString}` : ''}`
    
    const result = await axios.get(url, { withCredentials: true })
    dispatch(setItemsInMyCity(result.data))
  } catch (error) {
    console.log('Error fetching items:', error)
  }
}, [currentCity, sortBy, filterFoodType, filterCategory, dispatch])

// useEffect to fetch items when filters or sorting changes
useEffect(() => {
  if (currentCity) {
    fetchItems()
  }
}, [currentCity, fetchItems])

// useEffect to listen for real-time stock updates
useEffect(() => {
  if (socket) {
    socket.on('stockStatusUpdate', (data) => {
      console.log('Stock status update received:', data)
      // Refresh items to get updated stock status
      if (currentCity) {
        fetchItems()
      }
    })

    return () => {
      socket.off('stockStatusUpdate')
    }
  }
}, [socket, currentCity, fetchItems])

// Ensure items are displayed when they are loaded
useEffect(() => {
  if (itemsInMyCity && itemsInMyCity.length > 0) {
    const filtered = applySortingAndFiltering(itemsInMyCity)
    setUpdatedItemsList(filtered)
  } else {
    setUpdatedItemsList([])
  }
}, [itemsInMyCity])

// Real-time stock status updates
useEffect(() => {
  if (socket) {
    socket.on('stockStatusUpdate', (data) => {
      console.log('Stock status update received:', data)
      // Update the items in the store
      const updatedItems = itemsInMyCity.map(item => 
        item._id === data.itemId 
          ? { ...item, stockStatus: data.stockStatus }
          : item
      )
      dispatch(setItemsInMyCity(updatedItems))
    })

    // Real-time shop status updates
    socket.on('shopStatusUpdate', (data) => {
      console.log('Shop status update received:', data)
      
      // Update shops in the city
      const updatedShops = shopInMyCity.map(shop => 
        shop._id === data.shopId 
          ? { ...shop, isOpen: data.isOpen }
          : shop
      )
      dispatch(setShopsInMyCity(updatedShops))
      
      // Remove items from closed shops or add items from reopened shops
      if (!data.isOpen) {
        // Shop closed - remove its items from the list
        const filteredItems = itemsInMyCity.filter(item => 
          item.shop._id !== data.shopId
        )
        dispatch(setItemsInMyCity(filteredItems))
      } else {
        // Shop reopened - fetch fresh data to include its items
        fetchItems()
      }
    })

    return () => {
      socket.off('stockStatusUpdate')
      socket.off('shopStatusUpdate')
    }
  }
}, [socket, itemsInMyCity, shopInMyCity, currentCity, dispatch, fetchItems])

// Fetch categories from API
useEffect(() => {
  const loadCategories = async () => {
    try {
      const serverCategories = await fetchCategories();
      // Add "All" category at the beginning and merge with API categories
      const allCategory = { name: "All", _id: "all", image: null };
      setDynamicCategories([allCategory, ...serverCategories]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to just "All" category if API fails
      setDynamicCategories([{ name: "All", _id: "all", image: null }]);
    }
  };
  loadCategories();
}, []);

const handleFilterByCategory=(category)=>{
  setFilterCategory(category)
  // Items will be refetched automatically due to useEffect dependency
}

// Since we're now using backend filtering and sorting, we can simplify this function
const applySortingAndFiltering = (items) => {
  // Return items as they come from backend (already filtered and sorted)
  return items || []
}

// clearFilters removed as filters are toggled individually

  const updateButton=(ref,setLeftButton,setRightButton)=>{
const element=ref.current
if(element){
setLeftButton(element.scrollLeft>0)
setRightButton(element.scrollLeft+element.clientWidth<element.scrollWidth)

}
  }
  const scrollHandler=(ref,direction)=>{
    if(ref.current){
      ref.current.scrollBy({
        left:direction=="left"?-200:200,
        behavior:"smooth"
      })
    }
  }




  useEffect(() => {
    const cateEl = cateScrollRef.current
    const shopEl = shopScrollRef.current

    if (cateEl) {
      updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
      const onCateScroll = () => {
        updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
      }
      cateEl.addEventListener('scroll', onCateScroll)

      if (shopEl) {
        updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)
        const onShopScroll = () => {
          updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)
        }
        shopEl.addEventListener('scroll', onShopScroll)

        return () => {
          cateEl.removeEventListener('scroll', onCateScroll)
          shopEl.removeEventListener('scroll', onShopScroll)
        }
      }

      return () => {
        cateEl.removeEventListener('scroll', onCateScroll)
      }
    }

    return undefined
  }, [dynamicCategories])


  return (
    <div className='w-screen min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto'>
      <Nav />

      {searchItems && searchItems.length>0 && (
        <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-5 bg-white shadow-md rounded-2xl mt-4'>
<h1 className='text-gray-900 text-2xl sm:text-3xl font-semibold border-b border-gray-200 pb-2'>
  Search Results
</h1>
<div className='w-full h-auto flex flex-wrap gap-6 justify-center'>
  {searchItems.map((item)=>(
    <FoodCard data={item} key={item._id}/>
  ))}
</div>
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col gap-5 items-start p-[10px]">

        <h1 className='text-gray-800 text-2xl sm:text-3xl'>Inspiration for your first order</h1>
        <div className='w-full relative'>
          {showLeftCateButton &&  <button className='absolute left-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(cateScrollRef,"left")}><FaCircleChevronLeft />
          </button>}
         

          <div className='w-full flex overflow-x-auto gap-4 pb-2 ' ref={cateScrollRef}>
            {dynamicCategories.map((cate, index) => (
              <CategoryCard name={cate.name} image={cate.image} key={index} onClick={()=>handleFilterByCategory(cate.name)}/>
            ))}
          </div>
          {showRightCateButton &&  <button className='absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(cateScrollRef,"right")}>
<FaCircleChevronRight />
          </button>}
         
        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-[10px]'>
 <h1 className='text-gray-800 text-2xl sm:text-3xl'>Best Shops</h1>
 <div className='w-full relative'>
          {showLeftShopButton &&  <button className='absolute left-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(shopScrollRef,"left")}><FaCircleChevronLeft />
          </button>}
         

          <div className='w-full flex overflow-x-auto gap-4 pb-2 ' ref={shopScrollRef}>
            {shopInMyCity?.map((shop, index) => (
              <CategoryCard name={shop.name} image={shop.image} key={index} onClick={()=>navigate(`/shop/${shop._id}`)}/>
            ))}
          </div>
          {showRightShopButton &&  <button className='absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(shopScrollRef,"right")}>
<FaCircleChevronRight />
          </button>}
         
        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-[10px]'>
       <div className='w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
         <h1 className='text-gray-800 text-2xl sm:text-3xl'>
          Suggested Food Items
         </h1>
         
         {/* Sort and Filter Controls */}
         <div className='flex flex-wrap gap-2'>
           {/* Sort Dropdown */}
           <select 
             value={sortBy} 
             onChange={(e) => setSortBy(e.target.value)}
             className='px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] text-sm'
           >
             <option value="">Sort By</option>
             <option value="price_low_high">Price: Low to High</option>
             <option value="price_high_low">Price: High to Low</option>
             <option value="prep_time">Preparation Time: Fastest First</option>
             <option value="popularity">Most Popular</option>
             <option value="rating">Highest Rated</option>
             <option value="newest">Newest Dishes First</option>
             <option value="available_now">Available Now</option>
           </select>
           
           {/* Filter Toggle Button */}
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className='flex items-center gap-2 px-3 py-2 bg-[#ff4d2d] text-white rounded-lg hover:bg-[#e64528] transition-colors text-sm'
           >
             <FaFilter /> Filters
           </button>
         </div>
       </div>

       {/* Filter Panel */}
       {showFilters && (
         <div className='w-full bg-white p-4 rounded-lg shadow-md border border-gray-200'>
           <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
             {/* Food Type Filter */}
             <div>
               <label className='block text-sm font-medium text-gray-700 mb-1'>Food Type</label>
               <select 
                 value={filterFoodType} 
                 onChange={(e) => setFilterFoodType(e.target.value)}
                 className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] text-sm'
               >
                 <option value="All">All Types</option>
                 <option value="veg">Veg</option>
                 <option value="non veg">Non-Veg</option>
                 <option value="vegan">Vegan</option>
               </select>
             </div>
           </div>
         </div>
       )}

       <div className='w-full h-auto flex flex-wrap gap-[20px] justify-center'>
         {updatedItemsList && updatedItemsList.length > 0 ? (
           updatedItemsList.map((item)=>(
             <FoodCard key={item._id} data={item}/>
           ))
         ) : (
           <div className='text-center py-10'>
             <p className='text-gray-500 text-lg'>No items found matching your criteria</p>
           </div>
         )}
       </div>


      </div>


    </div>
  )
}

export default UserDashboard
