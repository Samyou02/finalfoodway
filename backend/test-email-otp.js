import dotenv from 'dotenv'
import { sendOtpMail } from './utils/mail.js'

// Load environment variables
dotenv.config()

async function testEmailOTP() {
  console.log('🧪 Testing OTP Email Functionality...')
  console.log('📧 Email Configuration:')
  console.log(`   EMAIL: ${process.env.EMAIL}`)
  console.log(`   PASS: ${process.env.PASS ? '***configured***' : 'NOT SET'}`)
  console.log('')

  // Test email address (you can change this to your email for testing)
  const testEmail = 'test@example.com'
  const testOTP = '1234'

  try {
    console.log(`📤 Attempting to send test OTP to: ${testEmail}`)
    await sendOtpMail(testEmail, testOTP)
    console.log('✅ Test completed! Check the console logs above for email sending status.')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }

  console.log('')
  console.log('📋 Instructions for testing:')
  console.log('1. Replace testEmail with your actual email address')
  console.log('2. Run this script: node test-email-otp.js')
  console.log('3. Check your email inbox (and spam folder)')
  console.log('4. If using development mode, check console for OTP logs')
}

testEmailOTP()