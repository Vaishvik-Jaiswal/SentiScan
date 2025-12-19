import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const createAdminUser = async () => {
  try {
    // Connect to database
    await connectDB()
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@senti-scan.com' })
    
    if (existingAdmin) {
      console.log('❌ Admin user already exists!')
      console.log(`Admin ID: ${existingAdmin._id}`)
      console.log(`Email: ${existingAdmin.email}`)
      console.log(`Username: ${existingAdmin.username}`)
      console.log(`Role: ${existingAdmin.role}`)
      process.exit(0)
    }

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@senti-scan.com',
      password: 'admin',
      role: 'admin',
      isActive: true
    })

    console.log('✅ Admin user created successfully!')
    console.log(`Admin ID: ${adminUser._id}`)
    console.log(`Email: ${adminUser.email}`)
    console.log(`Username: ${adminUser.username}`)
    console.log(`Role: ${adminUser.role}`)
    console.log(`Password: admin`)
    console.log('\n🔐 Login credentials:')
    console.log('Email: admin@senti-scan.com')
    console.log('Password: admin')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    process.exit(1)
  }
}

createAdminUser()
