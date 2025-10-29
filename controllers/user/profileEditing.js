const User = require("../../models/userSchema");
const env = require("dotenv").config();
const session = require("express-session");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { STATUS_CODE } = require("../../utils/statusCode");

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
    console.log("currentPassword", currentPassword);
    console.log("newPassword", newPassword);

    console.log("user from data base", userId);
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
  } catch (error) {}
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
    const findEmail = await User.findOne({ email: currentEmail });

    if (findEmail.password === undefined) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: "Google user cant change Email and Password",
        });
    }
    const otp = generateOtp();
    if (!findEmail) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Email not Found" });
    }
    const sent = await sendVerificationEmail(currentEmail, otp);
    if (sent) {
      req.session.otp = otp;
      res
        .status(STATUS_CODE.SUCCESS)
        .json({
          success: true,
          message: "OTP Successfully Send to your Current Email",
        });
    } else {
      res
        .status(STATUS_CODE.SERVICE_UNAVAILABLE)
        .json({ success: false, message: "Failed to send otp" });
    }

    // req.session.userData.email ={currentEmail}
    console.log("Otp for email changing", otp);
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
    console.log(
      "profile side email editing controller postemailEditOtp in profileediting"
    );
    const { otp1, otp2, otp3, otp4 } = req.body;
    const otp = otp1 + otp2 + otp3 + otp4;

    if (otp !== req.session.otp) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "You Entered OTP is MissMatch" });
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
    const emailExisting = await User.findOne({ email: newEmail });
    if (emailExisting) {
      return res
        .status(STATUS_CODE.CONFLICT)
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
//chechk user status;

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

module.exports = {
  changePassword,
  postCurrentEmail,
  getCurrentEmail,
  getEmailEditOtp,
  postEmailEditOtp,
  getUpdateEmail,
  postUpdateEmail,
  checkUserStatus
};
