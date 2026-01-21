const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { STATUS_CODE } = require("../../utils/statusCode");
const mongoose = require('mongoose');


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

module.exports = {
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct
}