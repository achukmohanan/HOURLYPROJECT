const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const razorpayInstance = require("./razorpay");
const crypto = require("crypto");
const { model } = require("mongoose");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

// Calculate sale price based on highest offer
const calculateSalePrice = (product) => {
  const productOffer = product.productOffer || 0;
  const categoryOffer = product.category.categoryOffer || 0;

  const highestOffer = Math.max(productOffer, categoryOffer); 

  if (highestOffer === 0) {
    return product.regularPrice;
  }

  const discountAmount = (product.regularPrice * highestOffer) / 100;
  const salePrice = Math.round(product.regularPrice - discountAmount);

  return salePrice;
};


const postOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const { address, paymentMethod, totalAmount, discount } = req.body;

      console.log("payment method", paymentMethod);
      console.log("total amount", totalAmount);
      console.log("discount  amount is", discount);

      const findAddress = await Address.findOne(
        { "address._id": address },
        { "address.$": 1 }
      );
      // console.log("findAddress is ",findAddress)

      if (!findAddress || findAddress.address.length !== 1) {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Address not found" });
      }
      const cart = await Cart.findOne({ userId }).populate({path:"items.productId",populate:{path:'category'}});

      if (!cart || cart.items.length === 0) {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Cart is Empty" });
      }

      for (let item of cart.items) {
        if (item.productId.quantity < item.quantity) {
          return res
            .status(STATUS_CODE.BAD_REQUEST)
            .json({
              success: false,
              message: `${item.productId.productName} is Out Of Stock!`,
            });
        }
      }

      let totalPrice = Number(totalAmount);

      if (paymentMethod === "COD") {
        if (totalPrice <= 1000) {
          const order = new Order({
            userId,
            address: findAddress.address[0],
            orderedItems: cart.items.map((item) => ({
              product: item.productId._id,
              quantity: item.quantity,
              price: calculateSalePrice(item.productId),
            })),
            totalPrice,
            discount: discount,
            paymentMethod,
            status: "Pending",
            paymentStatus: "Cash on Delivery",
            deliveredAt: null,
            couponApplied: discount > 0 ? true : false,
          });
          // console.log("order is ",order)
          await order.save();

          for (let item of cart.items) {
            await Product.updateOne(
              { _id: item.productId._id },
              { $inc: { quantity: -item.quantity } }
            );
          }

          await Cart.deleteOne({ userId });
          req.session.discountValue = 0;

          return res.json({ success: true, orderId: order._id, payment: "COD" });
        } else {
          return res.json({
            success: false,
            message: "Order Price not above 1000",
          });
        }
      }
      if (paymentMethod === "razorpay") {

        const MAX_RAZORPAY_AMOUNT = 500000; // 10 lakh

        if(totalPrice > MAX_RAZORPAY_AMOUNT){
          return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,
            message:"Order amount exceeds Razorpay limit,Please use Wallet Payment"})
        }

        const options = {
          amount: Math.round(totalPrice * 100), // amount in paisa
          currency: "INR",
          receipt: "order_rcptid_" + new Date().getTime(),
        };
        try{
        const razorpayOrder = await razorpayInstance.orders.create(options);
        return res.json({
          success: true,
          payment: "razorpay",
          order: {
            id: razorpayOrder.id,
            amount: Math.round(totalPrice * 100),
            currency: "INR",
          },
          key: process.env.RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
        });}catch(err){
        console.error("Razorpay Error:", err);
          return res.status(STATUS_CODE.BAD_REQUEST).json({success:false,message:err?.error?.description || "Razorpay payment failed",code:err?.error?.code || "RAZORPAY_ERROR"})
        }
      }
      if (paymentMethod === "wallet") {
        const user = await User.findById(userId);

        if (user.wallet < totalPrice) {
          return res
            .status(STATUS_CODE.NOT_FOUND)
            .json({ message: "Insufficent Balance in Wallet" });
        }
        user.wallet -= totalPrice;
        await user.save();
        const order = new Order({
          userId,
          address: findAddress.address[0],
          orderedItems: cart.items.map((item) => ({
            product: item.productId._id,
            quantity: item.quantity,
            price:calculateSalePrice(item.productId),
          })),
          totalPrice,
          discount: discount,
          paymentMethod: "Wallet",
          status: "Pending",
          paymentStatus: "Paid",
          deliveredAt: null,
          couponApplied: discount > 0 ? true : false,
        });
        // console.log("order is ",order)
        await order.save();
        await Transaction.create({
          userId: userId,
          orderId: order.orderId,
          type: "Debit",
          amount: totalPrice,
          wallet: true,
          paymentMethod: "Wallet",
          description: "Payment Using Wallet",
        });

       
        for (let item of cart.items) {
          await Product.updateOne(
            { _id: item.productId._id },
            { $inc: { quantity: -item.quantity } }
          );
        }

        await Cart.deleteOne({ userId });
        console.log("order is placed", order);
        console.log("user is in wallet ", user);
        req.session.discountValue = 0;

        return res.json({ success: true, orderId: order._id, payment: "Wallet" });
      }
    } catch (error) {
      console.log("error in the postorder", error);
      res
        .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
        .json({ status: false, message: "Something went wrong while placing the order" });
    }
  };

const orderSuccess = async (req, res) => {
  try {
    return res.render("user/order-success");
  } catch (error) {}
};
const cancelOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    // console.log("req.body is testing ",req.body)
    const { action, reason, discount } = req.body;

    const userId = req.session.user;
    // console.log("item Id is",itemId)
    const order = await Order.findOne({ orderId, userId }).populate(
      "orderedItems.product"
    );

    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Order Not Found" });
    }

    const item = order.orderedItems.id(itemId);
    // console.log("item is ",item)
    if (!item) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Item not found in this order" });
    }

    if (action === "request") {
      if (order.status === "Delivered") {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "Delivered Orders Can't Cancel" });
      }
      if (item.status === "Cancelled") {
        return res
          .status(STATUS_CODE.BAD_REQUEST)
          .json({ success: false, message: "This Item is  Already Cancelled" });
      }

      item.cancelRequest = { requested: true, reason };
      item.status = "Cancellation Requested";
    } else if (action === "withdraw") {
      if (item.status !== "Cancellation Requested") {
        return res
          .status(STATUS_CODE.NOT_FOUND)
          .json({ success: false, message: "No Withdrawn Requested" });
      }
      order.status = "Pending";
      item.cancelRequest = null;
      item.status = "Pending";
    }
    await order.save();
    // console.log("order cancelled requested",order);
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({
        success: true,
        message: `Cancel ${action} Processed Successfully`,
      });
  } catch (error) {
    console.log("error in the cancel order ", error);
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: false, message: "Internal Server Error" });
  }
};
const returnOrder = async (req, res) => {postOrder
  try {
    // console.log("req.params",req.params);
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    let order = await Order.findOne({ orderId: orderId }).populate("userId");
    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Order is not Found" });
    }

    const item = order.orderedItems.find((i) => i._id.toString() === itemId);
    // console.log("item found in return order",item)

    if (!item) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Item not Found in the Order" });
    }
    if (item.status !== "Delivered") {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({
          success: false,
          message: "Only Delievered items can be returned",
        });
    }

    item.status = "Return Requested";

    order.returnRequest = {
      requested: true,
      requestedAt: new Date(),
      verified: false,
    };

    order.returnReason = reason;
    await order.save();
    return res.json({
      success: true,
      message: "Return request submitted",
      order,
    });
  } catch (error) {
    console.log("error in the returnOrder", error);
    return res.json({ success: false, message: "Server error" });
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await Order.find({ orderId: orderId }).populate({
      path: "orderedItems.product",
      populate: { path: "category", model: "Category" },
    });

    for (let order of orders) {
      const parent = await Address.find(
        { "address._id": order.address },
        { "address.$": 1 }
      ).lean();
      order.fullAddress = parent?.address;

      order.orderedItems.forEach((item)=>{
        const product = item.product;
        const categoryOffer = product.category?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;

        const maxOffer = Math.max(categoryOffer,productOffer);

        if(maxOffer > 0){
          let discountAmount = (product.regularPrice * maxOffer) / 100;
          let salePrice = product.regularPrice - discountAmount;

          item.salePrice = Math.round(salePrice)
        }else{
          item.salePrice = product.regularPrice
        }
      });

    }
    return res.render("user/orderView", { orders });
  } catch (error) {
    console.log("error in the viewOrderDetails ", error);
  }
};

const orderFailure = async (req, res) => {
  try {
    return res.render("user/order-failure");
  } catch (error) {}
};

module.exports = {
  postOrder,
  orderSuccess,
  cancelOrder,
  returnOrder,
  viewOrderDetails,
  orderFailure,
};
