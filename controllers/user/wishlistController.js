const Wishlist = require("../../models/wishlistSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const { STATUS_CODE } = require("../../utils/statusCode");
const Product = require('../../models/productSchema')

const getWishList = async (req, res) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findById(userId);
    const wishlist = await Wishlist.findOne({ userId }).populate(
      "products.productId"
    );

    return res.render("user/wishlist", {
      user: findUser,
      wishlist,
    });
  } catch (error) {
    console.log("error in get wishlist", error);
  }
};

const postWishList = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;
   

    if (!productId) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Product is Not Found " });
    }
    let wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
      const alreadyExist = wishlist.products.some(
        (item) => item.productId.toString() === productId
      );

      if (alreadyExist) {
        return res
          .status(STATUS_CODE.SUCCESS)
          .json({ success: true, message: "Product is already Exists" });
      }
      wishlist.products.push({ productId });
      await wishlist.save();
      return res
        .status(STATUS_CODE.SUCCESS)
        .json({ success: true, message: "Product Added to Wishlist" });
    } else {
      const newWishlist = new Wishlist({
        userId,
        products: [{ productId }],
      });
      await newWishlist.save();
      return res
        .status(STATUS_CODE.SUCCESS)
        .json({ success: true, message: "Wishlist Created and Product Added" });
    }
  } catch (error) {
    console.log("error in postwishlist", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const deleteWishlistItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    // console.log("productId is",productId, typeof productId);
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ status: false, message: " Wishlist not Found" });
    }

    wishlist.products = wishlist.products.filter(
      (item) => item.productId.toString() !== productId
    );
    console.log("wishlist products ", wishlist.products);
    await wishlist.save();
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Item Removed from the cart" });
  } catch (error) {
    console.log("error in delete wishlist item", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server error" });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    console.log("triggreddddd")
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId || !productId) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Missing Data" });
    }
    const existingCart = await Cart.findOne({ userId });

    const product = await Product.findById(productId)
    if(!product){
      return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Product is not found"})
    }
    if(product.quantity <= 0){
      return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"Product is Out Of Stock,You Cannot Add this Item Into Cart"})
    }


    if (existingCart) {
      const itemInCart = existingCart.items.some(
        (item) => item.productId.toString() === productId
      );
      if (itemInCart) {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Item is already in the Cart" });
      } else {
        existingCart.items.push({ productId, quantity: 1 });
        await existingCart.save();
      }
    } else {
      await Cart.create({
        userId,
        items: [{ productId, quantity: 1 }],
      });
    }
    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    );
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({
        success: true,
        message: "product Moved to Cart and removed from wishlist",
      });
  } catch (error) {
    console.log("error in the addToCartFromWishlist ", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getWishList,
  postWishList,
  deleteWishlistItem,
  addToCartFromWishlist,
};
