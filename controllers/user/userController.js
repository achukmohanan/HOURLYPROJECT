const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Otp = require('../../models/otpSchema')
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const { STATUS_CODE } = require("../../utils/statusCode");
const { STATES } = require("mongoose");


const pageNotFound = async (req, res) => {
  try {
    return res.render("user/error404");
  } catch (error) {
    res.redirect("/error404");
  }
};

const landingPage = async (req, res) => {
  try {
    
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    })
    .populate('category')
    .sort({createdAt:-1})
    .limit(4)

    productData = productData.map(product => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.categoryOffer || 0;

      const biggestOffer = Math.max(productOffer,categoryOffer);

      let salePrice = product.regularPrice;
      if(biggestOffer > 0){
        salePrice = product.regularPrice - (product.regularPrice * biggestOffer)/100
      }
      return {
        ...product.toObject(),
        biggestOffer,
        salePrice
      }
    })


    const brand = await Brand.find({ isBlocked: false });
 
      return res.render("user/landingPage", {
        products: productData,
        brand: brand,
      });
  } catch (error) {
    console.log("error in the landing page ",error);
  }
};

const loadHomepage = async (req, res) => {
  try {
    const userId = req.session.user;
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    })
    .populate('category')
    .sort({createdAt:-1})
    .limit(4)
    productData = productData.map(product => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.categoryOffer || 0;

      const biggestOffer = Math.max(productOffer,categoryOffer);

      let salePrice = product.regularPrice;
      if(biggestOffer > 0){
        salePrice = product.regularPrice - (product.regularPrice * biggestOffer)/100
      }
      return {
        ...product.toObject(),
        biggestOffer,
        salePrice
      }
    })

    const brand = await Brand.find({
      isBlocked: false,
    });
    const cart = await Cart.findOne({ userId });
    const wishlist = await Wishlist.findOne({ userId });

    let cartCount = cart ? cart.items.length : 0;
    let wishlistCount = wishlist ? wishlist.products.length : 0;


    req.session.cartCount = cartCount;
    req.session.wishlistCount = wishlistCount;

    
    if (userId) {
      const userData = await User.findById(userId);
      res.render("user/home", {
        user: userData,
        products: productData,
        brand: brand,
        cartCount: cartCount,
        wishlistCount: wishlistCount,
      });
    } else {
      return res.render("user/landingPage", {
        products: productData,
        brand: brand,
      });
    }
    console.log("Products sent to EJS:,its working ", productData.length);
  } catch (error) {
    console.log("Home page is not loading", error);
    res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json("Internal Server Error");
  }
};

const loadSignup = async (req, res) => {
  try {
    return res.render("user/signup");
  } catch (error) {
    console.log("Home page not loaded:", error);
    res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(email, otp) {
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
      from:`"HOURLY WATCHES" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP : ${otp}<b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword, referalcode } = req.body;
    
    if (password !== cPassword) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "Password do not Match",
      });
    }
    const findUser = await User.findOne({ email });
    
    if (findUser) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        success: false,
        message: "User with this Email already exists",
      });
    }
    if(referalcode && referalcode.trim() !== ""){
    const findReferalCode = await User.findOne({referralCode:referalcode})

    if(!findReferalCode){
      return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Invalid Referal Code"})
    }
  }
    const otp = generateOtp();

    await Otp.deleteMany({email});

    await Otp.create({
      email,
      otp
    })
    console.log("otp Schema  created")

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send verification Email.Please try again",
      });
    }
    // req.session.userOtp = otp;
    // req.session.userOtpExpires = Date.now() +  (60 * 1000);
    req.session.userData = { name, phone, email, password, referalcode };
    
    console.log("Signup Otp sent", otp);

    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Otp send Successfully...!" ,expiresAt:Date.now() + 60 * 1000 });
  } catch (error) {
    console.log("signup error", error);
    return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({success:false,message:"Internal Server Happened,Please Try Again!"});
  }
}

const loadLogin = async (req, res) => {
  try {
    return res.render("user/login");
  } catch (error) {
    console.log("error happened in login:", error);
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

   
    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.status(STATUS_CODE.NOT_FOUND).json({success:false,  message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false, message: "User is blocked by Admin" });
    }

    if(!findUser.password){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:'This account was created using Google. Please login with Google.'})
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    
    if (!passwordMatch) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false, message: "Incorrect Password" });
    }
    req.session.user = findUser._id;
   
    return res.json({ success: true });
  } catch (error) {
    console.log("login error", error);
     return res.json({ success: false, message: "Server Error" });
  }
};

const confirmWithOtp = async (req, res) => {
  try {
    return res.render("user/confirmwithotp");
  } catch (error) {
    console.log("error happened in confirm with ott ", error);
    res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};
function generateReferalCode(name) {
  return (
    name.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000)
  );
}
function generateCouponCode(userId) {
  return (
    "REF-" +
    userId.toString().slice(-6) +
    "-" +
    Math.floor(1000 + Math.random() * 9000)
  );
}

const confirmwithotp = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4 } = req.body;
    if (!otp1 || !otp2 || !otp3 || !otp4) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "All 4 OTP digits are required" });
    }

    const userSessionData = req.session.userData;
    if(!userSessionData || !userSessionData.email){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:'Session expired. Please signup again'})
    }

    const email = userSessionData.email;
    const otp = otp1 + otp2 + otp3 + otp4;
    
    console.log("check 1 email",email);

    const otpDoc = await Otp.findOne({email,otp});
   
    if(!otpDoc){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"Invalid OTP or Expired OTP"})
    }
   
      const passwordHash = await securePassword(userSessionData.password);
      //referal setup

      const myReferalCode = generateReferalCode(userSessionData.name);

      let referredByUser = null;
      if (userSessionData.referalcode) {
        referredByUser = await User.findOne({ referralCode: userSessionData.referalcode });
      }
      console.log("referd by user is ", referredByUser);
      const newUser = new User({
        name: userSessionData.name,
        email: userSessionData.email,
        phone: userSessionData.phone,
        password: passwordHash,
        referralCode: myReferalCode,
        referredBy: referredByUser ? referredByUser._id : null,
      });
     
      await newUser.save();

      await Otp.deleteOne({_id:otpDoc._id})

      if (userSessionData.referalcode && referredByUser) {

          const coupon = await Coupon.create({
            code: generateCouponCode(referredByUser._id),
            purpose: "Referral",
            discountType: "percentage",
            discountValue: 50,
            maxDiscount: 500,
            description: "Referral Reward",
            limit: 1,
            expireOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            minPurchase: 1000,
            isActive: true,
            userId: [referredByUser._id],
          });
          console.log("Coupon is created in refreal", coupon);

          await coupon.save();
        }
  
      req.session.user = newUser._id;
      delete req.session.userData;

      return res.status(STATUS_CODE.SUCCESS).json({
        success: true,
        message: "OTP verified successfully",
      });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An internal server error occurred",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    console.log("req.session.userData", req.session.userData);
    
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Email not found in Session! ,Session expired" });
    }

    const otp = generateOtp();

    await Otp.deleteMany({email});

    await Otp.create({
      email,
      otp
    })
        console.log("otp Schema  created")
    
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      
      return res
        .status(STATUS_CODE.SUCCESS)
        .json({ success: true, message: "OTP Resend Succesfully",expiresAt:Date.now() + 60*1000 });
    } else {
      return res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: "Failed to Resend OTP. Please try again",
        });
    }
  } catch (error) {
    console.log("error  resending otp", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "internal Server Error,Please try again",
      });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/error404");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("logout error ", error);
    res.redirect("/pagenotfound");
  }
};  

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  loadLogin,
  confirmWithOtp,
  landingPage,
  confirmwithotp,
  resendOtp,
  login,
  logout,
};
