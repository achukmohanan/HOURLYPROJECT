const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController');
const {userAuth,adminAuth} = require('../middlewares/auth')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')

router.get('/adminlogin',adminController.loadLogin);
router.post('/adminlogin',adminController.login)
router.get("/seconddash",adminAuth,adminController.loaddashboard)
router.get('/pageerror',adminController.pageerror)
router.get('/logout',adminController.logout)

router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
// router.get('/users',customerController.loadcustomerInfo)





// router.get('/dashboard',adminController.loaddashboard)
// router.use('/admin/*',(req,res,next)=>{
//     res.status(404).render('admin/adminpagenotfound')
// })


module.exports = router;