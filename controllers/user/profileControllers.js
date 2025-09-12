const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require('express-session');
const Transaction = require('../../models/transactionSchema')

function generateOtp(){
    const digits = '1234567890';
    let otp = "";
    for(let i=0; i<4; i++){
        otp+=digits[Math.floor(Math.random()*10)];

    }
    return otp;
}
const sendVerificationEmail = async (email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,

            }
        })
        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4> Your OTP: ${otp}</h4><br></b>`
        }
        const info =  await transporter.sendMail(mailOptions);
        console.log("Email sent:",info.messageId);
        return true;

    } catch (error) {
         console.error("error in sending email",error);
        return false;
    }
}
const forgotPassword = async (req, res) => {
    try {
        return res.render('user/forgotpassword')
    } catch (error) {
        console.log('error happened in forgotpassword: ', error)
        res.redirect('/pagenotfound')

    }
}

const getForgotEmailOtp = async (req,res) =>{
    try {
        return res.render('user/forgotpassotp')
    } catch (error) {
        console.log('error happened in the forgot otp page',error);
        // res.redirect('/pagenotfound')
    }
}

const forgotEmailOtp = async (req, res) => {
    console.log('Request body:', req.body); // Debug log
    
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }
        
        const findUser = await User.findOne({ email: email });
        console.log('Email:', email);
        
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                
                console.log("Forgot password OTP:", otp);
                // Fix: Remove 'admin/' from the redirect path
                return res.render('user/forgotpassotp');
            } else {
                res.json({ success: false, message: "Failed to send OTP. Please try again" });
            }
        } else {
            res.render('user/forgotpassword', {
                message: "User with this email does not exist"
            });
        }
    } catch (error) {
        console.log("Error happened in post route:", error);
        res.json({ success: false, message: "Server error occurred" });
    }
}
const verifyForgotPassOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:'/resetpassword' });
        }else{
            res.json({success:false,message:"OTP not Matching"});
        }
    } catch (error) {
        res.status(500).json({success:false,message:"An error Occured. Please try again"});
    }
}

const getResetPassPage = async(req,res) =>{
    try {
        res.render('user/resetpassword');
    } catch (error) {
        res.redirect('/pagenotfound');
    }
}

const resendOtp = async (req,res) =>{
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resend OTP succesful"})
        }
    } catch (error) {
        console.error("Error in resend otp ",error);
      res.status(500).json({success:false,message:"Internal Server Error"})  
    }
}

const securePassword = async(password) =>{
   try {
    const passwordHash = await bcrypt.hash(password,10);
    return passwordHash;
   } catch (error) {
    
   }
}

const postNewPassword = async (req,res) =>{
    try {
        console.log(req.body)
        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        console.log(newPass1);
        
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            ) 
            
         res.status(200).json({success:true, message:"new password updated Successfully"})
        
        }else{
            res.status(400).json({message:"Password do not match"});

        }
    } catch (error) {
       res.status(500).json({message:"Internal Server error"})
       console.log("error happened in reset password");
       
    }
}


const userProfile = async (req,res) =>{
    try {
        // console.log(req.session.user);
        
        const userId =    req.session.user;  
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId:userId});
        const orders = await Order.find({userId:req.session.user }).populate('orderedItems.product').sort({createdOn:-1})
        const transaction = await Transaction.find({userId:userId})

        for(let txn of transaction){
            const order = await Order.findOne({orderId:txn.orderId}).populate('orderedItems.product','productName productImage').lean()

            txn.orderDetails = order
        }
        // console.log("transactions in accout ",transaction)
            //  console.log("user data is ",userData)
            // console.log("orders are ",orders)
        res.render('user/account',{
            user:userData,
            userAddress:addressData,
            orders:orders,
            transaction:transaction
        });
    } catch (error) {
         console.log("error occured in account",error);
        res.status(500).json("server error")
       
        
    }
}

const addAddress = async (req,res) =>{
    try {
        const user = req.session.user;
        const userData = await User.findById(user)
        res.render('user/addAddress',{
            user:user,
            name:userData
        })
    } catch (error) {
        
    }
}

const postaddAddress = async (req,res) =>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body;

        const userAddress = await Address.findOne({userId:userData._id});

        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
            })
            await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();

        }
        res.status(200).json({message:"Updated Successfully!"})

    } catch (error) {
        console.log("error in the post addAddress",error);
        res.status(500).json({message:"Something Went Wrong!"})
        
    }
}
const editAddress = async (req,res) =>{
    try {
        const addressId = req.query.id;
        const user = req.session.user;
        const currAddress = await Address.findOne({'address._id' : addressId})

        if(!currAddress){
            return res.status(400).json({message:"Address data not Found!"});
        }
        const addressData = currAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString();
        });

        if(!addressData){
            return res.status(400).json({message:"Addess data not found"});
        }

        const userData = await User.findById(user)

        // console.log("user data is ",  userData);
        
        res.render('user/editAddress',{
            address:addressData,
            user:user,
            name:userData
        })
    } catch (error) {
        console.log("error in edit Address",error);
        res.redirect('pagenotfound');
    }
}

const postEditAddress = async (req,res) =>{
    try {
        const data =  req.body;
        const addressId = req.query.id;
        const user =  req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId})

        if(!findAddress){
            return res.status(400).json({message:"No address data found"});
        }

        await Address.updateOne(
            {"address._id" : addressId},
            {$set:{
                'address.$':{
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone
                }
            }}
        )
        res.status(200).json({message:"Address updated Successfully"});
    } catch (error) { 
            console.error("Error in postEditAddress:", error);
            res.status(500).json({ message: "Internal Server Error" });     
    }
}

const deleteAddress = async (req,res) =>{
    try {
   
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id" : addressId});

        if(!findAddress){
            return res.status(404).json({message:"Address data not Found"});
        }

        await Address.updateOne(
            {"address._id" : addressId},
            {$pull:
                {address:{_id:addressId}}
            }
        )
        res.status(200).json({message:"Address Delected Successfully"});
    } catch (error) {
        console.log("error in delete Address", error);
        res.status(500).json({message:"Internal Server Error"});
        
    }

}

//edit profile get route

const getEditProfile = async (req,res) =>{
    try {
        const user =  req.session.user;
        const findUser =  await User.findById(user)
        // console.log("This is user",user)
        // console.log("this is findUser",findUser);
        
        return res.render('user/editProfile',{
            user:findUser
        })
    } catch (error) {
        
    }
}

const editProfile = async (req,res) =>{
    try {
        // console.log(req.body);
        
        const userId = req.session.user;
        
        const {profileUrl,username,gender,email,phone} = req.body;
        const userData = await User.findById(userId);
        // console.log(userData);
        
        if(!userData){
           return res.status(400).json({success:false,message:"User is not Found"})
        }
        // await User.findByIdAndUpdate(userId,{
        //     name:username,
        //     email,
        //     gender,
        //     phone
        // })
        const updateData = {
            name:username,
            email,
            gender,
            phone
        }
        if(profileUrl){
            updateData.profileUrl = profileUrl;
        }
        await User.findByIdAndUpdate(userId,updateData);
        
        return res.status(200).json({message:"Details updated successfully",success:true})
    } catch (error) {
        console.log("error happend in the edit profile page",error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
}

module.exports = {
    forgotPassword,
    forgotEmailOtp,
    getForgotEmailOtp,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword, 
    securePassword,
    userProfile,
    addAddress,
    postaddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    getEditProfile,
    editProfile
}