const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController');
const brandController = require('../controllers/admin/brandController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController')
const {userAuth,adminAuth} = require('../middlewares/auth')
const multer = require("multer");
const storage = require('../helpers/multer');
const uploads = multer({storage:storage});


router.get('/adminlogin',adminController.loadLogin);
router.post('/adminlogin',adminController.login)
router.get("/seconddash",adminAuth,adminController.loaddashboard)
router.get('/pageerror',adminController.pageerror)
router.get('/logout',adminController.logout)

//customer management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)

//brand controller
router.get('/brands',adminAuth,brandController.getBrandPage)
router.post("/addBrand",adminAuth,uploads.single('image'),brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get('/unBlockBrand',adminAuth,brandController.unBlockBrand);
router.get('/deleteBrand',adminAuth,brandController.deleteBrand);

//product management
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array('images',4),productController.addProducts)
router.get('/products',adminAuth,productController.getAllProducts)

// router.get('/users',customerController.loadcustomerInfo)
// router.get('/dashboard',adminController.loaddashboard)
// router.use('/admin/*',(req,res,next)=>{
//     res.status(404).render('admin/adminpagenotfound')
// })


module.exports = router;