const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { STATUS_CODE } = require("../../utils/statusCode");
const mongoose = require('mongoose');

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("admin/productadd", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error in getProductAddPage:", error);
    res.redirect("/admin/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    
    const products = req.body;
    if (!products || Object.keys(products).length === 0) {
  return res.redirect("/admin/addProducts?error=Form data not received");
}
 // console.log("products ",products)
    const imageUrls = products?.imageurls ? products.imageurls.split(",") : [];

    // Check if product already exists
    const productExists = await Product.findOne({
      productName: { $regex: new RegExp(`^${products.productName}$`, "i") }
    });

     if (productExists) {
      return res.redirect("/admin/addProducts?error=Product already exists, please try another name");
    }
   
      const categoryDoc = await Category.findOne({ name: products.category });
    if (!categoryDoc) {
      return res.redirect("/admin/addProducts?error=Invalid category");
    }

     // Validate required fields
    if (!products.productName || !products.description || !products.regularPrice) {
      return res.redirect("/admin/addProducts?error=Missing required fields");
    }
    // Create new product
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: categoryDoc._id,
      regularPrice: Number(products.regularPrice),
      quantity: Number(products.quantity),
      createdOn: new Date(),
      color: products.color,
      productImage: imageUrls,  // CLOUDINARY URLS ONLY
      status: "Available",
    });

      await newProduct.save();

      return res.redirect("/admin/addProducts?success=Product added successfully");
  }catch(error){
    console.error("Error in saving product:", error);
    return res.redirect("/admin/addProducts?error=Internal server error");
  }
};
  
const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;

    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("admin/products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      res.render("/pageerror");
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });

    findProduct.salePrice =
      findProduct.regularPrice -
      Math.floor(findProduct.regularPrice * (percentage / 100));

    findProduct.productOffer = parseInt(percentage);

    await findProduct.save();

    return res.json({ status: true });
  } catch (error) {
    console.log("error in the backend of addProductOffer", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ status: false, message: "Internal Server error" });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findById(productId).populate("category");

    if (!findProduct) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ status: false, message: "Product not found" });
    }
    const category = findProduct.category;
    findProduct.productOffer = 0;
    // console.log("category is found in removeoffer",category)
    if (category && category.categoryOffer > 0) {
      findProduct.salePrice = Math.floor(
        findProduct.regularPrice -
          findProduct.regularPrice * (category.categoryOffer / 100)
      );
    } else {
      findProduct.salePrice = findProduct.regularPrice;
    }
    await findProduct.save();
    res.json({ status: true, message: "Product removed Successfully" });
  } catch (error) {
    console.log("error in the remove product offer ", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server error" });
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id }).populate("category");
    const category = await Category.find({});
    const brand = await Brand.find({});

    let saleprice = 0;

    const productOffer = product.productOffer || 0;
    const categoryOffer = product.category?.categoryOffer || 0;
    const hasOffer = productOffer > 0 || categoryOffer > 0;
    if( productOffer > 0 || categoryOffer > 0){
      const maxOffer = Math.max(productOffer,categoryOffer);
      saleprice = product.regularPrice - (product.regularPrice * maxOffer /100);
    }
    console.log('saleprice is',saleprice)

    res.render("admin/editproduct", {
      product: product,
      cat: category,
      brand: brand,
      salePrice:saleprice,
      hasOffer:hasOffer
    });
  } catch (error) {
    console.log("error in the get edit page ", error);
    res.redirect("/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
console.log("reqq is ",data)
      
    if (!data || !data.productName) {
      return res.json({ success: false, message: "Invalid request" });
    }

    // checking name duplicate
    const duplicate = await Product.findOne({
      productName: { $regex: `^${data.productName.trim()}$`, $options: "i" },
      _id: { $ne: id }
    });

  if (duplicate) {
       
      return res.json({ success: false,message: "Product name already exists."});
    }
   
    // / Build final images: keep existing images (they are URLs) + newImages (array of {url, public_id})
    const existing = Array.isArray(data.existingImages) ? data.existingImages : [];
    const newImgs = Array.isArray(data.newImages) ? data.newImages.map(i => i.url || i) : [];

    const finalImages = [...existing, ...newImgs];


     // Build update object
    const updateFields = {
      productName: data.productName,
      description: data.description || "",
      brand: data.brand || "",
      category: data.category || null,
      regularPrice: data.regularPrice || 0,
      // salePrice: data.salePrice || 0,
      quantity: data.quantity || 0,
      color: data.color || "",
      productImage: finalImages
    };
  await Product.findByIdAndUpdate(id, updateFields, { new: true });
  return res.json({ success: true });
 
  } catch (error) {
    console.error("error in the editProduct controller",error);
    return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({success:false,message:"Internal Error Happened,Please Try again Later"})
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageUrlToDelete, productIdToServer } = req.body;
     await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageUrlToDelete },
    });
 
  
   return  res.json({ success: true });
  } catch (error) {
    console.log("Delete error in the deleteSingleImage controller :", err);
    return res.json({ success: false, message: "Server error" });
  }
  }



module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  
};
