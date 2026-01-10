const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const { STATUS_CODE } = require("../../utils/statusCode");
const { path } = require("pdfkit");

const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");
    const findUser = await User.findById(userId);
    let cart = await Cart.findOne({ userId }).populate({ path:"items.productId",populate:{path:'category'}});

    let total = 0;
    if (cart && cart.items.length > 0) {
      cart.items.forEach((item) => {

       const product = item.productId;
       const categoryOffer = product.category?.categoryOffer || 0;
       const productOffer = product.productOffer || 0;  

        const biggestOffer = Math.max(categoryOffer,productOffer);
        const finalSalePrice = product.regularPrice - (product.regularPrice * biggestOffer) / 100;

        item.productId.finalSalePrice =Math.round(finalSalePrice);
        
        total += item.productId.finalSalePrice * item.quantity;
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
    await cart.save();
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

    const cart = await Cart.findOne({ userId }).populate({path:"items.productId",populate:{path:'category'}});
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
    const product = item.productId;

    if (item.quantity + change < 1) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Minimum Quantity Should be 1" });
    }
    const maxLimit = Math.min(5, product.quantity);

    const newQuantity = product.quantity;
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
    const categoryOffer = product.category?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const biggestOffer = Math.max(categoryOffer,productOffer);

    const salePrice = product.regularPrice - (product.regularPrice * biggestOffer)/100;

    const finalSalePrice = Math.ceil(salePrice);
    const updatePrice  = finalSalePrice * item.quantity;

    let total = 0;
    cart.items.forEach((i) => {
      const catOffer = i.productId.category?.categoryOffer || 0;
      const prodOffer = i.productId.productOffer || 0;
      const bo = Math.max(catOffer , prodOffer);
      const sp = Math.ceil(i.productId.regularPrice - (i.productId.regularPrice * bo /100));

      total += sp * i.quantity;
    });

    await cart.save();

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
      
      const cart = await Cart.findOne({ userId }).populate({path:"items.productId",populate:{path:'category',model:'Category'}});
      
      if (!cart || !cart.items || cart.items.length === 0  ) {
        res.redirect("/cart");
      }
       

      cart.items = cart.items.map(item => {
        let product = item.productId;
        let category = product.category;

        const productOffer = product.productOffer || 0;
        const categoryOffer = category?.categoryOffer || 0;
        
        const biggestOffer = Math.max(productOffer,categoryOffer);

        let salePrice;
        if(biggestOffer > 0){
          const discountAmount  = (biggestOffer/100) * product.regularPrice;
          salePrice = Math.round(product.regularPrice - discountAmount)
        }else{
            salePrice = product.regularPrice;
        }

        product.salePrice = salePrice;
        product.biggestOffer = biggestOffer;

        return item
      })


      let total = cart.items.reduce((sum, item) => {
        return sum + item.productId.salePrice * item.quantity;
      }, 0);

      
      const addressList = await Address.find({userId });

      const coupons = await Coupon.find({
        isActive: true, 
        expireOn : {$gte:new Date()},
        minPurchase:{$lte:total},
        $or: [
          { userId: { $in: [userId] } },
           { userId: { $size: 0 } }
          ],
      }).sort({ expireOn: -1 });
      
      return res.render("user/checkout", {
        coupons,
        user,
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




const gettest = async (req, res) => {
  try {
    return res.render("user/testing");
  } catch (error) {}
};


module.exports = {
  getCart,
  addToCart,
  deleteCartItem,
  updateCartQuantity,
  addAddressInCheckout,
  getCheckOut,
  gettest,
 
};
