const Product = require("../../models/productSchema");
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render('admin/productadd', {
            cat: category,
            brand: brand
        });
    } catch (error) {
        console.error("Error in getProductAddPage:", error);
        res.redirect('/admin/pageerror');
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        
        // Check if product already exists
        const productExists = await Product.findOne({
            productName: products.productName,
        });
        
        if (!productExists) {
            const images = [];

            // Process uploaded images
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    try {
                        const originalImagePath = req.files[i].path;
                        const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                        
                        // Ensure the directory exists
                        const uploadDir = path.dirname(resizedImagePath);
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }
                        
                        // Process the image with sharp
                        // Since images are already cropped on frontend, we just need to ensure proper sizing
                        await sharp(originalImagePath)
                            .resize({
                                width: 440,
                                height: 440,
                                fit: 'cover', // This will maintain aspect ratio and crop if necessary
                                position: 'center'
                            })
                            .jpeg({ quality: 90 }) // Ensure good quality
                            .toFile(resizedImagePath);
                        
                        images.push(req.files[i].filename);
                        
                        // Clean up original file
                        if (fs.existsSync(originalImagePath)) {
                            fs.unlinkSync(originalImagePath);
                        }
                        
                    } catch (imageError) {
                        console.error(`Error processing image ${i}:`, imageError);
                        // Continue with other images even if one fails
                    }
                }
            }
            
            // Find category by name
            const categoryId = await Category.findOne({ name: products.category });
            if (!categoryId) {
                return res.status(400).json({ error: "Invalid category name" });
            }
            
            // Validate required fields
            if (!products.productName || !products.description || !products.regularPrice) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            
            // Create new product
            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: parseFloat(products.regularPrice),
                salePrice: parseFloat(products.salePrice),
                createdOn: new Date(),
                quantity: parseInt(products.quantity),
                color: products.color,
                productImage: images,
                status: 'Available',
            });
            
            await newProduct.save();
            
            // Redirect with success message
            return res.redirect('/admin/addProducts?success=Product added successfully');
            
        } else {
            return res.status(400).json({ error: "Product already exists, Please try with another name" });
        }
        
    } catch (error) {
        console.error("Error in saving product:", error);
        
        // Clean up uploaded files in case of error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Helper function to ensure upload directory exists
const ensureUploadDirectory = () => {
    const uploadDir = path.join('public', 'uploads', 'product-images');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

// Call this when the module is loaded
ensureUploadDirectory();

const getAllProducts = async (req,res) =>{
    try {
        const search =req.query.search || "";
        const page = req.query.page ||1;
        const limit = 4;

        const productData = await Product.find({
            $or:[
            {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            {brand:{$regex: new RegExp(".*"+search+".*","i")}},
            ]
        }).limit(limit*1)
        .skip((page-1)*limit)
        .populate('category')
        .exec();

        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
        }).countDocuments();

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});

        if(category && brand){
            res.render('admin/products',{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand,

            })
        }else{
            res.render('/pageerror')
        }
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const addProductOffer = async (req,res) =>{
    try {
        const {productId,percentage} = req.body;
        const findProduct = await Product.findOne({_id:productId});
        const findCategory = await Category.findOne({_id:findProduct.category})

        if(findCategory.categoryOffer>percentage){
            return res.json({status:false,message:"This products category already haas a category offer"});

        }

        findProduct.salePrice = findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({status:true});

    } catch (error) {
        res.redirect('/pageerror');
        res.status(500).json({status:false,message:"Internal Server error"});

    }
}

const removeProductOffer = async (req,res) =>{
    try {
        const {productId} = req.body;
        const findProduct = await Product.findOne({_id:productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice*(percentage/100))
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true});
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const blockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const unblockProduct = async (req,res) =>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct
}