const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const razorpayInstance = require("./razorpay");
const crypto = require("crypto");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const postPayment = async (req, res) => {
  try {
    console.log("paymet");
    const userId = req.session.user;
    const selectedIndex = req.body.addressId;
    const discount = req.body.discount;

    console.log("discount is discount", discount);

    const address = await Address.find({ userId });
    if (!address || !address.length) {
      return res.redirect("/checkout");
    }
    const selectedAddress = address[0].address[selectedIndex];
    console.log("selected address",selectedAddress)
    const findUser = await User.findById(userId);

    const cart = await Cart.findOne({ userId }).populate({path:"items.productId",populate:{path:'category'}});
    if (!cart || !cart.items.length) {
      res.redirect("/cart");
    }//
      cart.items.forEach(item => {
        const product = item.productId;

        const productOffer = product.productOffer || 0;
        const categoryOffer = product.category?.categoryOffer || 0;

        const biggestOffer = Math.max(productOffer,categoryOffer);

        if(biggestOffer > 0){
          product.salePrice = Math.round(product.regularPrice - (product.regularPrice * biggestOffer) / 100);
        }else{
          product.salePrice = Math.round(product.regularPrice)
        }
      });
      console.log("chechk 11111111111111111111")
    const outofstock = cart.items.filter((item) => item.productId.quantity < 1);
    // if (outofstock.length > 0) {
    //   return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:"Product Out of Stock"})
    // }
    console.log("check 222222222222222222222")
    let total = cart.items.reduce((sum, item) => {
      return sum + item.productId.salePrice * item.quantity;
    }, 0);

    let disamount = (discount / 100) * total;
    disamount = parseFloat(disamount.toFixed(2));
    console.log("discount is =", disamount);
    total = parseFloat(total - disamount).toFixed(2)
    
    console.log("total is total", total);
   
    const orderData = {
      findUser,
      userId,
      address: selectedAddress,
      items: cart.items,
      totalPrice: total,
      discount: disamount,
    };

    res.render("user/payment", { orderData });
  } catch (error) {
    console.log("error in the post payment ", error);
  }
};



const confirmRazorpay = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      address,
      amount,
      discount,
    } = req.body;
    console.log("discount  in the confirm ", discount);

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    // console.log("address is ",address)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      const price = Number(amount / 100);
      let totalPrice = price;
      console.log("after checking amount is ", totalPrice);
      // fetch selected address snapshot
      const selectedAddress = await Address.findOne(
        { "address._id": address, userId },
        { "address.$": 1 }
      );
      //   console.log("selected address",selectedAddress)
      if (!selectedAddress) {
        return res.json({ success: false, message: "Address not found" });
      }
      const order = new Order({
        userId,
        orderedItems: cart.items.map((item) => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.productId.salePrice,
        })),
        totalPrice,
        paymentMethod: "Razorpay",
        status: "Pending",
        paymentStatus: "Paid",
        discount: discount,
        paymentId: razorpay_payment_id,
        address: selectedAddress.address[0],
        deliveredAt: null,
        couponApplied: discount > 0 ? true : false,
      });

      await order.save();

      for (let item of cart.items) {
        await Product.updateOne(
          { _id: item.productId._id },
          { $inc: { quantity: -item.quantity } }
        );
      }
      await Cart.deleteOne({ userId });
      await Transaction.create({
        userId,
        orderId: order.orderId,
        type: "Debit",
        amount: totalPrice,
        paymentMethod: "Razorpay",
        description: `Order is Placed`,
      });
      // console.log("transaction is in the razor pay is success")
      req.session.discountValue = 0;

      return res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      console.log("this else case is worked which is payment failed");
      return res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.log("error in the confirm razor pay ", error);
  }
};

const paymentFailed = async(req,res) =>{
  try {
    const userId = req.session.user;
   
    const {razorpay_order_id,razorpay_payment_id,reason,amount,address,discount}  = req.body;
    //order
    const cart = await Cart.findOne({userId}).populate('items.productId');

    if(!cart){
      return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Cart is not Found"})
    }

    const selectedAddress = await Address.findOne(
      {"address._id":address,userId},
      {"address.$":1}
    )
    if(!selectedAddress){
      return res.status(STATUS_CODE.NOT_FOUND).json({success:false,message:"Address Not Found"})
    }
const price = Number(amount)/100;
    const order = new Order({
      userId,
      orderedItems: cart.items.map((item) => ({
        product:item.productId._id,
        quantity:item.quantity,
        price:item.productId.salePrice,
        status:'Payment-failed'
      })),
      totalPrice:price,
      paymentMethod:'Razorpay',
      status:"Payment-failed",
      discount:discount,
      paymentId:razorpay_payment_id || 'N/A',
      address:selectedAddress.address[0],
      deliveredAt:null,
      couponApplied:discount > 0 ? true : false,

    })
    await order.save()
    // payment failed
    await Transaction.create({
      userId,
      orderId:razorpay_order_id || 'N/A',
      type:'Failed',
      amount:Number(amount)/100,
      paymentMethod:'Razorpay',
      description:`Payment Failed : ${reason}`
    });
    return res.json({success:true,message:'Payment Failed'})
  } catch (error) {
     console.log("Error in paymentFailed:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}


module.exports = {
  postPayment,
  confirmRazorpay,
  paymentFailed,
  
};            
