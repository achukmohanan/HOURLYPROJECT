const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findById(userId);

    if (!userId) return res.redirect("/login");

    let cart = await Cart.findOne({ userId }).populate("items.productId");

    // console.log("cart is ",cart)
    let total = 0;
    if (cart && cart.items.length > 0) {
      cart.items.forEach((item) => {
        total += item.productId.salePrice * item.quantity;
      });
    } else {
      cart = { items: [] };
    }
    return res.render("user/cart", {
      user: findUser,
      cart,
      totalPrice: total,
    });
  } catch (error) {
    console.log("error in get cart", error);
  }
};
const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    // console.log("product id from frontend" ,productId ,  typeof productId)
    const product = await Product.findOne({
      _id: productId,
    }).populate("category");

    if (product.isBlocked === true) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Product is Blocked!" });
    }
    if (!product) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Product Not Found or Blocked!" });
    }
    if (
      !product.category ||
      product.category.isListed === false ||
      product.category.isBlocked
    ) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: "Product Category is Blocked or Unlisted",
        });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId.toString()
    );

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Stock limit Reached" });
      }
      existingItem.quantity += 1;
    } else {
      if (cart.items.length >= 5) {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Cart Limit Reached!" });
      }
      cart.items.push({
        productId,
        quantity: 1,
      });
    }
    // console.log("Cart items before saving:", cart.items);

    await cart.save();
    // console.log("cart is ",cart)
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Successfully Added " });
  } catch (error) {
    console.log("error in backend post add to cart ", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;
    // console.log("productId is",productId, typeof productId);
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ status: false, message: " Cart not Found" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Item Removed from the cart" });
  } catch (error) {
    console.log("error in detecart item", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, change } = req.body;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Cart not Found" });
    }
    const item = cart.items.find(
      (item) => item.productId._id.toString() === productId.toString()
    );

    if (!item) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "product not in the Cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Product not Found" });
    }

    if (item.quantity + change < 1) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Minimum Quantity Should be 1" });
    }
    const newQuantity = product.quantity;
    const maxLimit = Math.min(5, product.quantity);
    if (item.quantity + change > newQuantity) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: `This Product Only ${product.quantity} in Stock`,
        });
    }
    if (item.quantity + change > maxLimit) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Maximum quantity limit reached" });
    }
    item.quantity += change;
    const updatePrice = item.quantity * product.salePrice;

    let total = 0;
    cart.items.forEach((item) => {
      total += item.productId.salePrice * item.quantity;
    });

    await cart.save();
    //  console.log("Rendering cart with total:", total);

    return res.status(STATUS_CODE.SUCCESS).json({
      success: true,
      newQuantity: item.quantity,
      updatePrice,
      total,
    });
  } catch (error) {
    console.log("error in the updateCartQuantity", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const addAddressInCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
  
    const user = await User.findById(userId);
    return res.render("user/checkoutaddress", {
      
      name: user,
    });
  } catch (error) {
    console.log("error in add address in checkout controller ", error);
  }
};
  const getCheckOut = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await User.findById(userId);
      const savedDiscount = req.session.discountValue || 0;
      const couponcode =  req.session.couponcode || "";
      console.log("discount page trigger".discount)
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (
        !cart ||
        !cart.items ||
        cart.items.length === 0 ||
        cart.items.quantity < 0
      ) {
        res.redirect("/cart");
      }

      let total = cart.items.reduce((sum, item) => {
        return sum + item.productId.salePrice * item.quantity;
      }, 0);

      const addressList = await Address.find({ userId: userId });
      const coupons = await Coupon.find({
        isActive: true,
        $or: [{ userId: { $in: [userId] } }, { userId: { $size: 0 } }],
      }).sort({ expireOn: -1 });

      return res.render("user/checkout", {
        coupons,
        user: user,
        cart,
        totalPrice: total,
        addressList,
        savedDiscount,
        couponcode
      });
    } catch (error) {
      console.log("error in get checkout ", error);
    }
  };
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    
    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }
    if (!coupon.isActive) {
      return res.json({ success: false, message: "Coupon is not active" });
    }
    if (new Date() > coupon.expireOn) {
      return res.json({ success: false, message: "Coupon has expired" });
    }
    console.log("code is ",coupon.code)
    req.session.couponcode = coupon.code;
    req.session.discountValue = coupon.discountValue
    console.log("couupon discoubr value is", coupon.discountValue);

    res.json({ success: true, discount: coupon.discountValue });
  } catch (error) {
    console.log("error in the applycoupon", error);
  }
};

const gettest = async (req, res) => {
  try {
    return res.render("user/testing");
  } catch (error) {}
};
const removeCoupon = async (req,res) =>{
  try {
    req.session.couponcode = null
     req.session.discountValue = 0
     res.json({success:true})
  } catch (error) {
    console.log("error in the remove coupon",error);
    
  }
}

module.exports = {
  getCart,
  addToCart,
  deleteCartItem,
  updateCartQuantity,
  addAddressInCheckout,
  getCheckOut,
  gettest,
  applyCoupon,
  removeCoupon
};
