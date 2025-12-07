const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Wishlist = require('../../models/wishlistSchema')
const { STATUS_CODE } = require("../../utils/statusCode");

const productDetails = async (req, res) => {
  try {
    // console.log("sessiondata", req.session)
    const userId = req.session.user;
    const userData = await User.findById(userId);

    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    // const findCategory = product.category;
    
    // const totalOffer = categoryOffer + productOffer;

    if (!product) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Product Not Found" });
    }

    const categoryOffer = product.category?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;

    const biggestOffer = Math.max(categoryOffer,productOffer);

    let salePrice = product.regularPrice;

    if(biggestOffer > 0){
      salePrice=Math.round(product.regularPrice - (product.regularPrice * biggestOffer)/100);
    }
   
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      $or: [{ category: product.category._id }, { brand: product.brand }],
    }).limit(4);

    // console.log("product", product)
    res.render("user/productdetails", {
      user: userData,
      product,
      quantity: product.quantity,
      biggestOffer,
      salePrice,
      category: product.category,
      relatedProducts,
    });
  } catch (error) {
    console.error("Error happened in fetching product details offer", error);
    res.redirect("/pagenotfound");
  }
};

const loadShoppingpage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });


    // const categoryIds = categories.map((category) => category._id.toString());

    //get filters from query
    const selectedCategories = req.query.category ? [].concat(req.query.category): [];
    const selectedBrand = req.query.brand ? [].concat(req.query.brand) : [];
    const selectedPrice = req.query.price || "";

    //pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    //sort
    const sortOption = req.query.sort || "default";
    let sortQuery = {};

    if (sortOption === "price-low") {
      sortQuery = { salePrice: 1 };
    } else if (sortOption === "price-high") {
      sortQuery = { salePrice: -1 };
    } else if (sortOption === "nameAZ") {
      sortQuery = { productName: 1 };
    } else if (sortOption === "nameZA") {
      sortQuery = { productName: -1 };
    }

    let filterMatch  = { isBlocked: false };

    if (selectedCategories.length > 0) {
      filterMatch.category = { $in: selectedCategories.map(id => new mongoose.Types.ObjectId(id)) };
    }

    if (selectedBrand.length > 0) {
      filterMatch.brand = { $in: selectedBrand };
    }

    //search

    const searchQuery = req.query.query ? req.query.query.trim() : "";
    if (searchQuery) {
      filterMatch.$or = [
        { productName: { $regex: searchQuery, $options: "i" } },
        { brand: { $regex: searchQuery, $options: "i" } },
      ];
    }
    //aggregation

    const productPipeLine = [
      {$match:filterMatch},
      //category offer

      {
        $lookup:{
          from:'categories',
          localField:'category',
          foreignField:'_id',
          as:'categoryData'
        }
      },

      {$unwind : '$categoryData'},

      // biggest offer
      {
        $addFields:{
          biggestOffer:{
            $max:['$productOffer','$categoryData.categoryOffer']
          }
        }
      },

      // salePrice
      {
        $addFields:{
          salePrice:{
            $cond:[
              {$gt:['$biggestOffer',0]},
              {
                $round:[{
                  $subtract:[
                    '$regularPrice',
                    {
                      $multiply:[
                        '$regularPrice',
                        {$divide:['$biggestOffer',100]}
                      ]
                    }
                  ]
                },0]
              },
              "$regularPrice"
            ]
          }
        }
      }

    ];
  // PRICE FILTER (after sale price calculation)  
    if(selectedPrice){
      if(selectedPrice === "under5000"){
        productPipeLine.push({$match:{salePrice:{$lt:5000}}});
      }else if(selectedPrice === 'under5000to10000'){
        productPipeLine.push({$match:{salePrice:{$gte:5000,$lte:10000}}});
      }else if(selectedPrice === 'under10000to20000'){
        productPipeLine.push({$match:{salePrice:{$gte:10000,$lte:20000}}});
      }else if(selectedPrice === 'above20000'){
        productPipeLine.push({$match:{salePrice:{$gt:20000}}});
      }
    }

    //sort

    if(Object.keys(sortQuery).length > 0){
      productPipeLine.push({$sort:sortQuery});
    }

     // Pagination
     productPipeLine.push({$skip:skip})
     productPipeLine.push({$limit:limit})
    const products = await Product.aggregate(productPipeLine);
  
    const countPipeline = [...productPipeLine];
    countPipeline.splice(countPipeline.length - 2, 2); // remove skip + limit
    const totalProducts = (await Product.aggregate(countPipeline)).length
    const totalPages = Math.ceil(totalProducts / limit);

    let wishlistProductIds = []
   if(user){
   const checkwishlist = await Wishlist.findOne({ userId: req.session.user })

if (checkwishlist) {
  wishlistProductIds = checkwishlist.products.map(item => item.productId.toString())
}

   }
    res.render("user/shop", {
      user: userData,
      products: products,
      category: categories.map(c => ({ _id: c._id, name: c.name })),
      brand: brands,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
      sortOption: sortOption,
      selectedPrice,
      selectedBrand,
      selectedCategories,
      searchQuery,
      wishlistProductIds
    });
  } catch (error) {
    console.error("error happened in load  shop  controller ", error);
  }
};

module.exports = {
  productDetails,
  loadShoppingpage,
};
