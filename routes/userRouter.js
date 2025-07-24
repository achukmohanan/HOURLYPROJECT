const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth,checksession} = require('../middlewares/userAuth');
const profileController = require('../controllers/user/profileControllers')
const productController = require('../controllers/user/productController')
const changePassword = require('../controllers/user/changePassword');
const cartController = require('../controllers/user/cartController');
//error management
router.get('/pagenotfound', userController.pageNotFound);

//signup management
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup)
router.post('/resend-otp',userController.resendOtp)
router.get('/confirmwithotp',userController.confirmWithOtp)
router.post('/confirmwithotp',userController.confirmwithotp)
router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: true
  }),
  (req, res) => {
    console.log("google login middleware");
    req.session.user = req.session.passport.user;
    res.redirect('/home'); // or wherever you want to redirect
  }
);

//login management
router.get('/login' ,checksession,  userController.loadLogin);
router.post('/login', userController.login);


//home page
// router.get('/', userController.landingPage)

router.get('/logout',userAuth,userController.logout);
router.get('/home',userAuth, userController.loadHomepage);

//profile management  
router.get('/forgotpassword',profileController.forgotPassword)
// router.post('/forgotpassword',profileController.forgotPasswordvalid)
router.get('/forgotemailotp',profileController.getForgotEmailOtp)
router.post('/forgotemailotp',profileController.forgotEmailOtp)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.post('/resend-forgot-otp',profileController.resendOtp)
//reset password
router.get('/resetpassword',profileController.getResetPassPage);
router.post('/reset-password',profileController.postNewPassword);

// profile & account
router.get('/account',userAuth, profileController.userProfile);
router.get('/profile',profileController.getProfilePage);
//address management
router.get('/addAddress', userAuth ,profileController.addAddress);
router.post('/addAddress', userAuth ,profileController.postaddAddress)
router.get('/editAddress', userAuth ,profileController.editAddress)
router.post('/editAddress', userAuth ,profileController.postEditAddress)
router.get('/deleteAddress', userAuth ,profileController.deleteAddress);
//edit profile
router.get('/edit-profile',userAuth ,profileController.getEditProfile);
router.post('/edit-profile',userAuth ,profileController.editProfile);
//Changepassword
router.post('/changePassword', changePassword.changePassword);


//product management
router.get('/productDetails',userAuth,productController.productDetails)
router.get('/shop',userAuth,productController.loadShoppingpage);
router.get('/filter',userAuth,productController.filterProduct);
router.get('/filterPrice',userAuth,productController.filterByPrice);
router.post('/search',userAuth,productController.searchProducts)

// cart
router.get('/cart', cartController.getCart)

router.post('/addtocart', cartController.addToCart);

module.exports = router; 