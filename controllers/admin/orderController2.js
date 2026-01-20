const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");


const approveReturnRequest = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    
    const { approve } = req.body;
    const order = await Order.findOne({ orderId: orderId }).populate("userId");

    if (!order) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "No order Found" });
    }
    if (!order.returnRequest.requested) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ suceess: false, message: "No Return Request Found" });
    }

    const item = order.orderedItems.id(itemId);

    if (!item) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Item not Found" });
    }
    if (item.status !== "Return Requested") {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "No Return Requested" });
    }

    if (approve) {
      order.returnRequest.verified = true;
      order.status = "Delivered";
      item.status = "Return Approved";

      await order.save();
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: item.quantity },
      });
      let refundAmount = item.quantity * item.price;

      //if coupon is applied

      if (order.couponApplied && order.discount > 0) {
        const totalBeforeDiscount = order.totalPrice + order.discount;
        const itemDiscount = (refundAmount / totalBeforeDiscount) * order.discount;
        refundAmount -= itemDiscount;
      }
 
      await User.findByIdAndUpdate(order.userId, {
        $inc: { wallet:Number(refundAmount.toFixed(2)) },
      });
      await Transaction.create({
        userId: order.userId,
        orderId: orderId,
        type: "Credit",
        amount: Number(refundAmount.toFixed(2)),
        paymentMethod: order.paymentMethod,
        description: "Order is Returned",
      });
    } else {
      order.returnRequest.verified = false;
      item.status = "Return Rejected";
      order.status = "Pending";
      await order.save();
      return res
        .status(STATUS_CODE.SUCCESS)
        .json({ success: true, message: "Return Rejected" });
    }

    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Approved Successfully" });
  } catch (error) {
    console.log("error in the approve requst", error);
  }
};

const approveCancelRequest = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { action } = req.body;
    const order = await Order.findOne({ orderId }).populate("userId");
    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Item is not found" });
    }
    if (item.status !== "Cancellation Requested") {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "NO Cancelation Request for this item" });
    }

        if (action === "reject") {
          item.status = "Cancellation Rejected";
          
          await order.save();
          return res
            .status(STATUS_CODE.SUCCESS)
            .json({
              success: true,
              message: "Cancel request rejected successfully",
            });
        }
    if (action === "approve") {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });

      item.status = "Cancelled";
      const cancelledCount  = order.orderedItems.filter(
        (i) => i.status === "Cancelled"
      ).length;

      if (cancelledCount === order.orderedItems.length) {
        order.status = "Cancelled";
      } else{
        order.status = "Partially Cancelled";
      } 

      let itemTotal  =  item.price * item.quantity;
      const orderSubtotal = order.totalPrice + order.discount;

      //item ratio
      const itemRatio = itemTotal / orderSubtotal;

      //coupon share
      const couponShare = order.couponApplied ? order.discount * itemRatio : 0;

      const refundAmount = Math.round(itemTotal - couponShare);

      if (order.paymentMethod === "Razorpay" || order.paymentMethod === "Wallet") {
        order.userId.wallet = (order.userId.wallet || 0) + refundAmount;
        await order.userId.save();
        console.log("transaction schema created")
        await Transaction.create({
          userId: order.userId._id,
          orderId: orderId,
          type: "Credit",
          amount: refundAmount,
          paymentMethod: "Razorpay",
          description: "Order item cancelled - refund issued",
        });
      }
    
      await order.save();
      return res
        .status(STATUS_CODE.SUCCESS)
        .json({ success: true, message: "Cancellation approved and refund processed" });
    }
    
  } catch (error) {
    console.log("error in the approvecancel request", error);
    return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({success:false,message:"Internal Server Error Happened"})
  }
};

module.exports = {
    approveReturnRequest,
    approveCancelRequest

}