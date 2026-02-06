const User = require("../../models/userSchema");
const env = require("dotenv").config();
const session = require("express-session");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { STATUS_CODE } = require("../../utils/statusCode");
const Otp = require('../../models/otpSchema')

const changePassword = async (req, res) => {
  try {
    const user = req.session.user;
   
    //  console.log("userId from session",user)
    const userId = await User.findById(user);
    if (userId.password === undefined) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message:
            "You are Login through Google, You Can't change Email and Password",
        });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
   
    if (!userId) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "User is not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, userId.password);
    if (!isMatch) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "current Password is incorrect" });
    }
    if (currentPassword === newPassword) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: "New password cannot be the same as the current password",
        });
    }
    const hashPassword = await bcrypt.hash(newPassword, 10);
    userId.password = hashPassword;
    userId.save();
    return res.json({
      success: true,
      message: "Password Updated Successfully",
    });
  } catch (error) {
    console.log("error in change password ", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const getCurrentEmail = async (req, res) => {
  try {

    return res.render("user/currentEmail");
  } catch (error) {
    console.log("error in the get Current email page",error);
    
  }
};

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(currentEmail, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: currentEmail,
      subject: "Your OTP for Verifying EMAIL",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP is ${otp} </b>`,
    });
    //  console.log("email sent result INFO ",info);
    return info.accepted && info.accepted.length > 0;
  } catch (error) {
    console.log("error in sendVerificationEmail", error);
    return false;
  }
}
const postCurrentEmail = async (req, res) => {
  try {
    const { currentEmail } = req.body;
    if(!currentEmail){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:'enter email'})
    }
    const findEmail = await User.findOne({ email: currentEmail });
   
  if (!findEmail) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Entered Email not Found" });
    }

    if (findEmail.password === undefined) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: "Google user can't change Email and Password",
        });
    }
    const otp = generateOtp();

    await Otp.deleteMany({email:currentEmail})

  const newOtp =  await Otp.create({email:currentEmail,otp})
    
    const sent = await sendVerificationEmail(currentEmail, otp);
    if (sent) {
    req.session.email = currentEmail;
    console.log("Otp for email changing", otp);
      res
        .status(STATUS_CODE.SUCCESS)
        .json({
          success: true,
          message: "OTP Successfully Send to your Current Email",
          otpExpires: newOtp.createdAt.getTime() + 60*1000
        });
    } else {
      res
        .status(STATUS_CODE.SERVICE_UNAVAILABLE)
        .json({ success: false, message: "Failed to send otp" });
    }
 
   
    // console.log("otp in session ",req.session.otp)
  } catch (error) {
    console.log("error in post email edit", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server error" });
  }
};

const getEmailEditOtp = async (req, res) => {
  try {
    return res.render("user/email-edit-otp");
  } catch (error) {
    console.log("error in get email otp page", error);
  }
};

const postEmailEditOtp = async (req, res) => {
  try {
  
    const { otp1, otp2, otp3, otp4 } = req.body;

    if(!otp1 || !otp2 || !otp3 || !otp4){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"All 4 OTP digits are required"})
    }


    const email = req.session.email;
    const otp = otp1 + otp2 + otp3 + otp4;
    const otpDoc = await Otp.findOne({email,otp});

    if(!otpDoc){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:'Invalid OTP or Expired OTP'})
    }

  const isExpired = Date.now() > otpDoc.createdAt.getTime() + 60 * 1000;

    if (isExpired) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }


    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.log("error in post email edit otp", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server Error" });
  }
};

const getUpdateEmail = async (req, res) => {
  try {
    return res.render("user/updateEmail");
  } catch (error) {
    console.log("error in get update email", error);
  }
};
const postUpdateEmail = async (req, res) => {
  try {
    const userId = req.session.user;
    const { newEmail } = req.body;
    if(!newEmail){
      return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Email is not Found"})
    }
    const emailExisting = await User.findOne({ email: newEmail });
    if (emailExisting) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: "This Email already in Use ,Try another Email",
        });
    }
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "User not found" });
    }
    user.email = newEmail;
    user.save();
    res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Email Updated Successfully" });
  } catch (error) {
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
    console.log("error in postUpdateEmail", error);
  }
};
//chechk user status
const checkUserStatus = async (req,res)=> {
  try {
    const userId = req.session.user;
    if(userId){
    const user = await User.findById(userId);
    // console.log("checkUserStatus",user);
    if(user.isBlocked){
      return res.json({isBlocked:true})
    }
res.json({isBlocked:false})
    }
  } catch (error) {
    console.log("error in the checkuserstatus",error);
  } 
}

const emailResendOtp = async (req,res)=>{
  try {
 
    const email = req.session.email;  
    if (!email) {
          return res.status(STATUS_CODE.NOT_FOUND).json({ success: false, message: "OTP session expired" });
      }

      const newOtp = generateOtp();

      await Otp.deleteMany({email})

      const otpDoc =  await Otp.create({email,otp:newOtp});

      const sent = await sendVerificationEmail(email, newOtp);
    
       if (!sent) {
          await Otp.deleteOne({ _id: otpDoc._id });
          return res.status(STATUS_CODE.SERVICE_UNAVAILABLE).json({ success: false, message: "Failed to resend OTP" });
        }
        console.log("resend email otp is ",newOtp);

      return res.status(STATUS_CODE.SUCCESS).json({
            success: true,
            message: "OTP resent successfully",
            otpExpires: otpDoc.createdAt.getTime() + 60 *1000
        });
  } catch (error) {
    console.log("Error in resend OTP", error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  changePassword,
  postCurrentEmail,
  getCurrentEmail,
  getEmailEditOtp,
  postEmailEditOtp,
  getUpdateEmail,
  postUpdateEmail,
  checkUserStatus,
  emailResendOtp
};
