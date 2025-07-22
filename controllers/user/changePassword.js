const User = require('../../models/userSchema');
const env = require('dotenv').config();
const session = require('express-session');
const bcrypt = require('bcrypt');


const changePassword = async (req,res) =>{
    try {
        const user = req.session.user;
         console.log("userId from session",user)
        const {currentPassword,newPassword,confirmPassword} = req.body;
        
        const userId = await User.findById(user);
        console.log("user from data base",userId)
        if(!userId){
           return res.status(400).json({success:false,message:"User is not found"})
        }

        const isMatch = await bcrypt.compare(currentPassword,userId.password);
        if(!isMatch){
          return  res.status(400).json({success:false,message:"current Password is incorrect"});
        }

        // if(newPassword != confirmPassword){
        //  return   res.status(400).json({success:false,message:"password do not Match"});
        // }

        const hashPassword = await bcrypt.hash(newPassword,10);
        userId.password = hashPassword;
        userId.save();
        return  res.json({success:true, message:"Password Updated Successfully"})
      
    } catch (error) {
        console.log("error in change password ",error);
        res.status(500).json({success:false,message:"Internal Server Error"});   
    }
}
module.exports = {
    changePassword
}