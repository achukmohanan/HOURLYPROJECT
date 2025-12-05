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
    const findCategory = product.category;
    const categoryOffer = findCategory?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    // const totalOffer = categoryOffer + productOffer;

    if (!product) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Product Not Found" });
    }

    let productOffers = null;
    let categoryOffers = null;
    if (categoryOffer > productOffer) {
      categoryOffers = categoryOffer;
    } else {
      productOffers = productOffer;
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
      categoryOffers,
      productOffers,
      category: findCategory,
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
    const categoryIds = categories.map((category) => category._id.toString());

    //get filters from query
    const selectedCategories = req.query.category
      ? [].concat(req.query.category)
      : [];
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

    let filterQuery = { isBlocked: false };

    if (selectedCategories.length > 0) {
      filterQuery.category = { $in: selectedCategories };
    }
    if (selectedBrand.length > 0) {
      filterQuery.brand = { $in: selectedBrand };
    }

    if (selectedPrice) {
      if (selectedPrice === "under5000") {
        filterQuery.salePrice = { $lt: 5000 };
      } else if (selectedPrice === "under5000to10000") {
        filterQuery.salePrice = { $gte: 5000, $lte: 10000 };
      } else if (selectedPrice === "under10000to20000") {
        filterQuery.salePrice = { $gte: 10000, $lte: 20000 };
      } else if (selectedPrice === "above20000") {
        filterQuery.salePrice = { $gte: 20000 };
      }
    }

    //search

    const searchQuery = req.query.query ? req.query.query.trim() : "";
    if (searchQuery) {
      filterQuery.$or = [
        { productName: { $regex: searchQuery, $options: "i" } },
        { brand: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const products = await Product.find(filterQuery)
      // .collation({ locale: "en", strength: 2 }) 
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    const categoriesWithIds = categories.map((c) => ({
      _id: c._id,
      name: c.name,
    }));

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
      category: categoriesWithIds,
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
