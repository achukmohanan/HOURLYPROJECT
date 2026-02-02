const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema");

const getSalePrice = (product) =>{
    const regularPrice = product.regularPrice;
    const productOffer = product.productOffer;
    const categoryOffer = product.category?.categoryOffer || 0;

    const maxOffer = Math.max(productOffer,categoryOffer);

    if(maxOffer>0){
        return Math.floor(regularPrice-(regularPrice * maxOffer)/100)
    }
    return regularPrice
}

const applyCoupon = async (req, res) => {
  try {
    console.log('req.body isssss',req.body)
    const { code } = req.body;

    const userId = req.session.user;
    const coupon = await Coupon.findOne({ code ,isActive:true});

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }
    if (!coupon.isActive) {
      return res.json({ success: false, message: "Coupon is not active" });
    }
    if (new Date() > coupon.expireOn) {
      return res.json({ success: false, message: "Coupon has expired" });
    }

    const cart = await Cart.findOne({userId:userId})
                        .populate({
                          path:'items.productId',
                          populate:{path:'category'}
                        });
    if (!cart || !cart.items.length) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    let totalAmount = 0;

    cart.items.forEach(item =>{
        const salePrice = getSalePrice(item.productId);
      totalAmount += salePrice * item.quantity;
    })

    if(totalAmount < coupon.minPurchase){
        return res.json({success:false,message:`Minimum purchase should be ₹${coupon.minPurchase}`})
    }
    //-
    let discount = 0;
    if(coupon.discountType === 'percentage'){
        discount = Math.floor((totalAmount * coupon.discountValue)/100);

        if(discount > coupon.maxDiscount){
            discount = coupon.maxDiscount;
        }
    }
    const finalAmount = Math.max(totalAmount - discount,0)

    cart.coupon = {
      code:coupon.code,
      discountAmount:discount
    }

    cart.totalAmount = totalAmount
    cart.finalAmount = finalAmount

    await cart.save();


   return res.json({ success: true,  message: "Coupon applied successfully" ,discount,finalAmount});
  } catch (error) {
    console.log("error in the applycoupon", error);
    res.json({ success: false, message: "Server error happened,Please Try again later" });
  }
};


const removeCoupon = async (req,res) =>{
  try {
    const cart = await Cart.findOne({userId:req.session.user});

    cart.coupon = null;
    cart.finalAmount = cart.totalAmount;
    cart.save()
     res.json({success:true})
  } catch (error) {
    console.log("error in the remove coupon",error);
    
  }
}
module.exports = {
    applyCoupon,
    removeCoupon
}