const mongoose = require('mongoose')
const env = require('dotenv')


const connectDB = async ()=>{
    try {
        
        mongoose.connect(process.env.MONGODB_URI)
        console.log("db is connected")

    } catch (error) {
        console.log("error occured",error.message)
    }
}

module.exports = connectDB;