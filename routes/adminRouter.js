const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const brandController = require("../controllers/admin/brandController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const salesController = require("../controllers/admin/salesController");
const concernController = require("../controllers/admin/concernController");
const { adminAuth, adminchecksession } = require("../middlewares/adminAuth");
const multer = require("multer");
const storage = require("../helpers/multer");
const { checksession } = require("../middlewares/userAuth");
const Concern = require("../models/concernSchema");
const uploads = multer({ storage: storage });

router.get("/adminlogin", checksession, adminController.loadLogin);
router.post("/adminlogin", adminController.login);

router.get("/dashboard", adminAuth, adminController.loaddashboard);
router.get("/load-chart", adminAuth, adminController.salesChart);

router.get("/pageerror", adminController.pageerror);
router.get("/logout", adminAuth, adminController.logout);

//customer management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

//category managment
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post(
  "/addCategoryOffer",
  adminAuth,
  categoryController.addCategoryOffer
);
router.post(
  "/removeCategoryOffer",
  adminAuth,
  categoryController.removeCategoryOffer
);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

//brand controller
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post(
  "/addBrand",
  adminAuth,
  uploads.single("image"),
  brandController.addBrand
);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);

//product management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post(
  "/addProducts",
  adminAuth,
  uploads.array("images", 4),
  productController.addProducts
);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post(
  "/removeProductOffer",
  adminAuth,
  productController.removeProductOffer
);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post(
  "/editProduct/:id",
  adminAuth,
  uploads.array("images", 4),
  productController.editProduct
);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);
router.delete("/deleteProduct/:id", adminAuth, productController.deleteProduct);

//order management
router.get("/order", adminAuth, orderController.getOrderPage);
router.get(
  "/viewOrderDetails/:id",
  adminAuth,
  orderController.viewOrderDetails
);
router.post(
  "/update-status/:orderId",
  adminAuth,
  orderController.updateOrderStatus
);
// approve return order ;
router.put(
  "/returnRequest/:orderId/:itemId",
  adminAuth,
  orderController.approveReturnRequest
);
//reject return

// approve order cancel
router.post(
  "/cancelApproveRequest/:orderId/:itemId",
  adminAuth,
  orderController.approveCancelRequest
);

//coupon management
router.get("/coupon", adminAuth, couponController.getCouponPage);
router.post("/coupon", adminAuth, couponController.postCoupon);
router.delete("/deleteCoupon/:code", adminAuth, couponController.deleteCoupon);

// salesReport
router.get("/salesReport", adminAuth, salesController.getsalesReport);
router.get("/sales-Report", adminAuth, salesController.filterSales);
router.get("/sales-report/filter", adminAuth, salesController.getFilteredSalesData);

//concern
router.get("/concerns", adminAuth, concernController.getConcernPage);
router.get("/viewConcern/:id", adminAuth, concernController.viewConcernpage);

router.post("/updateConcern/:id", adminAuth, concernController.updateConcern);

// router.get('/users',customerController.loadcustomerInfo)
// router.get('/dashboard',adminController.loaddashboard)
// router.use('/admin/*',(req,res,next)=>{
//     res.status(404).render('admin/adminpagenotfound')
// })

module.exports = router;
