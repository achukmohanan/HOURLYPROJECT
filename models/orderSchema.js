const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");
const { singleAddress } = require("./addressSchema");
const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: false,
  },
  // address:{
  //     type:Schema.Types.ObjectId,
  //     ref: 'Address',
  //     required:true
  // },
  address: singleAddress,
  invoiceDate: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["COD", "Razorpay", "Wallet", "Paypal"], // add what you use
    default: "COD",
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Requested",
      "Returned",
      "Out-for-delivery",
      "Payment-failed",
      "Return Approved",
      "Return Rejected"
    ],
  },returnRequest:{
    requested:{type:Boolean,default:false},
    requestedAt:{type:Date},
    verified:{type:Boolean,default:false}
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  returnReason: {
    type: String,
    default: null,
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
