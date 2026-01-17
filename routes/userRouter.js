const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const { userAuth, checksession } = require("../middlewares/userAuth");
const profileController = require("../controllers/user/profileControllers");
const productController = require("../controllers/user/productController");
const profileEditing = require("../controllers/user/profileEditing");
const cartController = require("../controllers/user/cartController");
const wishlistController = require("../controllers/user/wishlistController");
const paymentController = require("../controllers/user/paymentController");
const orderController = require("../controllers/user/orderController");
const invoiceController = require("../controllers/user/invoiceController");
const walletController = require("../controllers/user/walletController");
const contactController = require("../controllers/user/contactController");
const aboutController = require('../controllers/user/aboutController')
const cartWishlistCount = require('../middlewares/cartWishlistCount');
const couponController = require('../controllers/user/couponController')

const retryPaymentController = require('../controllers/user/retryPaymentController');

//error management
router.get("/pagenotfound", userController.pageNotFound);

//signup management
router.get("/signup", checksession, userController.loadSignup);
router.post("/signup", userController.signup);
//resend otp in signup
router.post("/resend-otp", userController.resendOtp);
router.post("/resend-Forgot-passwordOtp", profileController.resendForgotOtp);

router.get("/confirmwithotp", checksession, userController.confirmWithOtp);
router.post("/confirmwithotp", checksession, userController.confirmwithotp);
//google login
router.get(
  "/google",
  (req,res,next)=>{
    if(req.query.ref){
      req.session.refferalCode = req.query.ref;
    }
    next()
  },
  checksession,
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    console.log("google login successful");
    if (req.user) {
    req.session.user = req.user; 
  }
    // req.session.user = req.session.user;
    res.redirect("/home"); 
  }
);

//login management
router.get("/login", checksession, userController.loadLogin);
router.post("/login", userController.login);

//home page
router.get("/", userController.landingPage);
router.get("/logout", userAuth, userController.logout);
router.get("/home", userAuth, userController.loadHomepage);

//profile management
router.get("/forgotpassword", profileController.forgotPassword);
router.get("/forgotemailotp", profileController.getForgotEmailOtp);
//forgot password enmnma pageinte post route ahnuu from forgot p[assword]
router.post("/forgotemailotp", profileController.forgotEmailOtp);
// verify
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
//resend otp
router.post("/resend-forgot-otp", profileController.resendOtp);

//reset password
router.get("/resetpassword", profileController.getResetPassPage);
router.post("/reset-password", profileController.postNewPassword);

//address management
router.get("/addAddress", userAuth, profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postaddAddress);
router.get("/editAddress", userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

// profile & account
router.get("/account", userAuth, profileController.userProfile);
//edit profile
router.get("/edit-profile", userAuth, profileController.getEditProfile);
router.post("/edit-profile", userAuth, profileController.editProfile);
//Changepassword
router.post("/changePassword", profileEditing.changePassword);

//edit email in profile
router.get("/verifyCurrentEmail", userAuth, profileEditing.getCurrentEmail);
router.post("/verifyCurrentEmail", userAuth, profileEditing.postCurrentEmail);

//resend otp 
router.post('/email-resend-otp',userAuth , profileEditing.emailResendOtp)

router.get("/emailEditOtp", userAuth, profileEditing.getEmailEditOtp);
router.post("/emailEditOtp", userAuth, profileEditing.postEmailEditOtp);

router.get("/updateEmail", userAuth, profileEditing.getUpdateEmail);
router.post("/updateEmail", userAuth, profileEditing.postUpdateEmail);

//product management
router.get("/productDetails", cartWishlistCount,productController.productDetails);
router.get("/shop",cartWishlistCount, productController.loadShoppingpage);

// cart
router.get("/cart",userAuth, cartController.getCart);
router.post("/addtocart", cartController.addToCart);
router.delete("/delete-cart-item", cartController.deleteCartItem);
router.patch("/update-quantity-cart", cartController.updateCartQuantity);

// checkout
router.get("/checkout", userAuth, cartController.getCheckOut);
router.get(
  "/addAddress-checkout",
  userAuth,
  cartController.addAddressInCheckout
);
//payement and confirm order

router.post("/payment", paymentController.postPayment);
router.post("/verify-payment", userAuth, paymentController.confirmRazorpay);

//retry payment
router.post('/retry-payment',userAuth, retryPaymentController.retryPayment)
router.post('/verify-retry-payment',userAuth , retryPaymentController.verifyRetryPayment)
//order failure
router.post('/payment-failed',userAuth, paymentController.paymentFailed)
// order management
router.post("/place-order", userAuth, orderController.postOrder);
router.get("/order-success", userAuth, orderController.orderSuccess);
router.get("/order-failure", userAuth, orderController.orderFailure);
// router.get('/viewOrder',userAuth,paymentController.viewOrderPage)
router.post("/cancelOrder/:orderId/:itemId",userAuth,orderController.cancelOrder);

router.post(
  "/return-order/:orderId/:itemId",
  userAuth,
  orderController.returnOrder
);
router.get("/viewOrderDetails/:id", userAuth, orderController.viewOrderDetails);
router.get("/invoice/:id", invoiceController.invoice);

// whishlist management
router.get("/wishlist", userAuth, wishlistController.getWishList);
router.post("/add-to-wishlist", userAuth, wishlistController.postWishList);
router.delete(
  "/delete-Wishlist-item",
  userAuth,
  wishlistController.deleteWishlistItem
);
router.post("/add-to-cart", userAuth, wishlistController.addToCartFromWishlist);
//wallet top up
router.post("/wallet-top-up", userAuth, walletController.walletTopUp);
router.post(
  "/verify-wallet-topup",
  userAuth,
  walletController.verifyWalletTopup
);
//wallet failed
router.post('/wallet-failed',userAuth,walletController.walletFailed)

//coupon management
router.post("/apply-coupon", userAuth, couponController.applyCoupon);
router.post('/remove-coupon',userAuth,couponController.removeCoupon)

//contact
router.get("/contact", userAuth, contactController.getContactPage);
router.post("/contact", userAuth, contactController.postContact);

//about
router.get('/about',cartWishlistCount, aboutController.getAboutPage)
//chechk user status
router.get('/check-status',profileEditing.checkUserStatus)


// router.get('/test?page=1',(req,res)=>{
//   let a = req.query 
//   res.send("get the page")
// })

router.get("/testing", cartController.gettest);

module.exports = router;
