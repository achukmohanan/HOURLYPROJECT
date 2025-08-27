const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth,checksession} = require('../middlewares/userAuth');
const profileController = require('../controllers/user/profileControllers')
const productController = require('../controllers/user/productController')
const profileEditing = require('../controllers/user/profileEditing');
const cartController = require('../controllers/user/cartController');
const wishlistController = require('../controllers/user/wishlistController');
const paymentController = require('../controllers/user/paymentController')
const orderController = require('../controllers/user/orderController')
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
router.get('/', userController.landingPage)

router.get('/logout',userAuth,userController.logout);
router.get('/home', userAuth ,userController.loadHomepage);

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
router.post('/changePassword', profileEditing.changePassword);
router.get('/editEmail',userAuth,profileEditing.getEmailEditPage)
router.get('/verifyCurrentEmail',userAuth ,profileEditing.getCurrentEmail)
router.post('/verifyCurrentEmail',userAuth, profileEditing.postCurrentEmail)
router.get('/emailEditOtp',userAuth,profileEditing.getEmailEditOtp)
router.post('/emailEditOtp',userAuth ,profileEditing.postEmailEditOtp)
router.get('/updateEmail',userAuth , profileEditing.getUpdateEmail)
router.post('/updateEmail' ,userAuth , profileEditing.postUpdateEmail)


//product management
router.get('/productDetails',productController.productDetails)
router.get('/shop',productController.loadShoppingpage);
router.get('/filter',productController.filterProduct);
router.get('/filterPrice',productController.filterByPrice);
router.get('/search',productController.searchProducts)
// router.get('/shop/sort',productController.sortProducts);
// cart
router.get('/cart', cartController.getCart)
router.post('/addtocart', cartController.addToCart);
router.delete('/delete-cart-item',cartController.deleteCartItem)
router.patch('/update-quantity-cart',cartController.updateCartQuantity)

// checkout
router.get('/checkout',userAuth ,cartController.getCheckOut)
router.get('/addAddress-checkout' ,userAuth , cartController.addAddressInCheckout)
// router.get('/payment',userAuth,paymentController.getPaymentPage)
router.post('/payment',paymentController.postPayment)
// order management 
router.post('/place-order',paymentController.postOrder)
router.get('/order-success',userAuth,paymentController.orderSuccess)
// router.get('/viewOrder',userAuth,paymentController.viewOrderPage)
router.post('/cancelOrder/:orderId', userAuth,paymentController.cancelOrder)
router.post('/return-order/:id',userAuth,paymentController.returnOrder )
router.get('/viewOrderDetails/:id',userAuth,paymentController.viewOrderDetails)
router.get('/invoice/:id',orderController.invoice)
 
// whishlist management
router.get('/wishlist',userAuth , wishlistController.getWishList)
router.post('/add-to-wishlist',userAuth , wishlistController.postWishList)
router.delete('/delete-Wishlist-item',userAuth ,wishlistController.deleteWishlistItem)
router.post('/add-to-cart',userAuth, wishlistController.addToCartFromWishlist)


router.get('/testing',cartController.gettest)
module.exports = router; 