const User = require('../../models/userSchema')
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require('express-session');

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

const securePassword = async(req,res) =>{
   try {
    const passwordHash = await bcrypt.hash(password,10);
    return passwordHash
   } catch (error) {
    
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
// const forgotPasswordvalid =  async (req,res) =>{
//     try {
//        const  
//     } catch (error) {
        
//     }
// }

const getforgotemail = async (req,res) =>{
    try {
        return res.render('user/forgotpassotp')
    } catch (error) {
        console.log('error happened in the forgot otp page',error);
        // res.redirect('/pagenotfound')
    }
}

const forgotEmailValid = async (req, res) => {
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

const postNewPassword = async (req,res) =>{
    try {
        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect('/login');
        }else{
            res.render('user/resetpassword',{message:"Password do not match"});

        }
    } catch (error) {
       res.redirect('/pagenotfound') 
    }
}


module.exports = {
    forgotPassword,
    forgotEmailValid,
    getforgotemail,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    securePassword
}