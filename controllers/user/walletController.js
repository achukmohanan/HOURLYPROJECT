const Razorpay = require("razorpay");
const razorpayInstance = require("./razorpay");
const crypto = require("crypto");
const User = require("../../models/userSchema");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const walletTopUp = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "wallet_topup" + Date.now(),
      payment_capture: 1,
    };
    const order = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log("error in the wallet top up ", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Razorpay payment creation failed" });
  }
};
const verifyWalletTopup = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      userId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Invalid payment signature" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "User is not found" });
    }
    user.wallet = (user.wallet || 0) + parseInt(amount);
    await user.save();
    //transaction
    await Transaction.create({
      userId: userId,

      orderId: null,
      type: "Credit",
      amount: amount,
      paymentMethod: "Razorpay",
      description: "Wallet Topup",
    });
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Wallet Top up successfully" });
  } catch (error) {
    console.log("error in the verifyWalletTopup", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  walletTopUp,
  verifyWalletTopup,
};
