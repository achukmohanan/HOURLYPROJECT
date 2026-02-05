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
    const limit = 8;

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

    const noResult = productData.length === 0;

    if (category && brand) {
      res.render("admin/products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
        search: search,
        noResult:noResult
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
  deleteSingleImage,
};
