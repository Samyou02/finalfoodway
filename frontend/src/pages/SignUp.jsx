import React from 'react'
import { useState, useEffect } from 'react';
import { FaRegEye } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from 'react-router-dom';
import axios from "axios"
import { serverUrl } from '../App';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { ClipLoader } from "react-spinners"
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
function SignUp() {
    const primaryColor = "#ff4d2d";
    const hoverColor = "#e64323";
    const bgColor = "#fff9f6";
    const borderColor = "#ddd";
    const [showPassword, setShowPassword] = useState(false)
    const [role, setRole] = useState("user")
    const [userType, setUserType] = useState("")
    const [userTypes, setUserTypes] = useState([])
    const navigate=useNavigate()
    const [fullName,setFullName]=useState("")
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [mobile,setMobile]=useState("")
    const [err,setErr]=useState("")
    const [loading,setLoading]=useState(false)
    const dispatch=useDispatch()

    // Fetch user types when component mounts
    useEffect(() => {
        const fetchUserTypes = async () => {
            try {
                const response = await axios.get(`${serverUrl}/api/auth/user-types`);
                setUserTypes(response.data);
                if (response.data.length > 0) {
                    setUserType(response.data[0].name); // Set first user type as default
                }
            } catch (error) {
                console.error('Error fetching user types:', error);
            }
        };
        fetchUserTypes();
    }, []);

     const handleSignUp=async () => {
        setLoading(true)
        try {
            const result=await axios.post(`${serverUrl}/api/auth/signup`,{
                fullName,email,password,mobile,role,userType: role === "user" ? userType : undefined
            },{withCredentials:true})
            // If backend indicates pending approval, do not log in
            if (result.data && result.data.pendingApproval) {
                setErr("Account created. Pending superadmin approval.")
                setLoading(false)
                navigate("/signin")
                return
            }
            // Otherwise, proceed to login
            dispatch(setUserData(result.data))
            setErr("")
            setLoading(false)
        } catch (error) {
            setErr(error?.response?.data?.message)
             setLoading(false)
        }
     }

     const handleGoogleAuth=async () => {
        if(!mobile){
          return setErr("mobile no is required")
        }
        setLoading(true)
        try {
            const provider=new GoogleAuthProvider()
            const result=await signInWithPopup(auth,provider)
            
            const {data}=await axios.post(`${serverUrl}/api/auth/google-auth`,{
                fullName:result.user.displayName,
                email:result.user.email,
                role,
                mobile,
                userType: role === "user" ? userType : undefined
            },{withCredentials:true})
            if (data && data.pendingApproval) {
                setErr("Account created. Pending superadmin approval.")
                setLoading(false)
                navigate("/signin")
                return
            }
            dispatch(setUserData(data))
            setErr("")
            setLoading(false)
            navigate("/")
        } catch (error) {
            console.log(error)
            setErr(error?.response?.data?.message || "Google sign-up failed")
            setLoading(false)
        }
      }
    return (
        <div className='min-h-screen w-full flex items-center justify-center p-4' style={{ backgroundColor: bgColor }}>
            <div className={`bg-white rounded-xl shadow-lg w-full max-w-md p-8 border-[1px] `} style={{
                border: `1px solid ${borderColor}`
            }}>
                <h1 className={`text-3xl font-bold mb-2 `} style={{ color: primaryColor }}>FoodWay</h1>
                <p className='text-gray-600 mb-8'> Create your account to get started with delicious food deliveries
                </p>

                {/* fullName */}

                <div className='mb-4'>
                    <label htmlFor="fullName" className='block text-gray-700 font-medium mb-1'>Full Name</label>
                    <input type="text" className='w-full border rounded-lg px-3 py-2 focus:outline-none ' placeholder='Enter your Full Name' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setFullName(e.target.value)} value={fullName} required/>
                </div>
                {/* email */}

                <div className='mb-4'>
                    <label htmlFor="email" className='block text-gray-700 font-medium mb-1'>Email</label>
                    <input type="email" className='w-full border rounded-lg px-3 py-2 focus:outline-none ' placeholder='Enter your Email' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setEmail(e.target.value)} value={email} required/>
                </div>
                {/* mobile*/}

                <div className='mb-4'>
                    <label htmlFor="mobile" className='block text-gray-700 font-medium mb-1'>Mobile</label>
                    <input type="email" className='w-full border rounded-lg px-3 py-2 focus:outline-none ' placeholder='Enter your Mobile Number' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setMobile(e.target.value)} value={mobile} required/>
                </div>
                {/* password*/}

                <div className='mb-4'>
                    <label htmlFor="password" className='block text-gray-700 font-medium mb-1'>Password</label>
                    <div className='relative'>
                        <input type={`${showPassword ? "text" : "password"}`} className='w-full border rounded-lg px-3 py-2 focus:outline-none pr-10' placeholder='Enter your password' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setPassword(e.target.value)} value={password} required/>

                        <button className='absolute right-3 cursor-pointer top-[14px] text-gray-500' onClick={() => setShowPassword(prev => !prev)}>{!showPassword ? <FaRegEye /> : <FaRegEyeSlash />}</button>
                    </div>
                </div>
                {/* role*/}

                <div className='mb-4'>
                    <label htmlFor="role" className='block text-gray-700 font-medium mb-1'>Role</label>
                    <div className='flex gap-2'>
                        {["user", "owner", "deliveryBoy"].map((r) => (
                            <button
                                key={r}
                                type="button"
                                className='flex-1 border rounded-lg px-3 py-2 text-center font-medium transition-colors cursor-pointer'
                                onClick={()=>setRole(r)}
                                style={
                                   role==r?
                                   {backgroundColor:primaryColor,color:"white"}
                                   :{border:`1px solid ${primaryColor}`,color:primaryColor}
                                }>
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* User Type Selection - Only show for users */}
                {role === "user" && (
                    <div className='mb-4'>
                        <label htmlFor="userType" className='block text-gray-700 font-medium mb-1'>User Type</label>
                        <select 
                            value={userType} 
                            onChange={(e) => setUserType(e.target.value)}
                            className='w-full border rounded-lg px-3 py-2 focus:outline-none'
                            style={{ border: `1px solid ${borderColor}` }}
                            required={role === "user"}
                        >
                            <option value="">Select User Type</option>
                            {userTypes.map((type) => (
                                <option key={type._id} value={type.name}>
                                    {type.name} {type.deliveryAllowed ? "(Delivery Available)" : "(Pickup Only)"}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

            <button className={`w-full font-semibold py-2 rounded-lg transition duration-200 bg-[#ff4d2d] text-white hover:bg-[#e64323] cursor-pointer`} onClick={handleSignUp} disabled={loading}>
                {loading?<ClipLoader size={20} color='white'/>:"Sign Up"}
            
            </button>
            {err && <p className='text-red-500 text-center my-[10px]'>*{err}</p>}
            

            <button className='w-full mt-4 flex items-center justify-center gap-2 border rounded-lg px-4 py-2 transition cursor-pointer duration-200 border-gray-400 hover:bg-gray-100' onClick={handleGoogleAuth}>
<FcGoogle size={20}/>
<span>Sign up with Google</span>
            </button>
            <p className='text-center mt-6 cursor-pointer' onClick={()=>navigate("/signin")}>Already have an account ?  <span className='text-[#ff4d2d]'>Sign In</span></p>
            </div>
        </div>
    )
}

export default SignUp
