const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const getOrderPage = async (req, res) => {
  try {
    const { status, date, search ,startDate ,endDate } = req.query;
   
    let filter = {};
    //status
    if (status && status !== "") {
      filter.status = status;
    }
    //date
    if (date && date !== "") {
      const today = new Date();
      if (date === "today") {
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        filter.createdOn = {
          $gte: startOfDay,
          $lt: endOfDay,
        };
      } else if (date === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        filter.createdOn = { $gte: weekAgo, $lte: today };
      } else if (date === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);

        filter.createdOn = { $gte: monthAgo, $lte: today };
      } else if (date === 'custom') {

         if (!startDate || !endDate) {
          return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Start and end date required" });
        }
      const start = new Date(startDate);
      const end   = new Date(endDate);
      const today = new Date();

      if ( isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(STATUS_CODE.BAD_REQUEST).json({message:'Invalid date format'})
        }

        if(start > end){
          return res.status(STATUS_CODE.BAD_REQUEST).json({message:'Start date cannot be after end date'})
        } 

        if(start > today || end > today){
          return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Future dates are not allowed" });
        }
        end.setHours(23, 59, 59, 999);
        filter.createdOn = { $gte: start, $lte: end };
    }
    }
    //search
      if (search && search.trim() !== "") {

        const matchedUsers = await User.find({
          name:{$regex:search,$options:'i'},
        }).select('_id');

        const userIds = matchedUsers.map((u)=>u._id);

        filter.$or = [  
          { orderId: { $regex: search, $options: "i" } },
          { userId: {$in:userIds } },
        ];
      }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(filter)
      .populate("userId", "name email")
      .populate("orderedItems.product", "name price")
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (req.xhr || req.headers.accept.indexOf("application/json") > -1) {
      return res.json({
        orders,
        currentPage:page,
        totalPages,
        totalOrders
      });
    }

    return res.render("admin/order", {
      orders,
      currentPage: page,
      totalOrders,
      totalPages,
    });
  } catch (error) {
    console.log("error in the get order page", error);
  }
};
const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({ orderId: orderId })
      .populate("userId", "name email phone")
      .populate(
        "orderedItems.product",
        "productName  salePrice productImage status"
      )
      .populate("address");
console.log("order price",order)
    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: " order is not found" });
    }
    
    return res.render("admin/vieworder", { order });
  } catch (error) {
    console.log("error in view get order details ", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server Error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const STATUS_SEQUENCE = [
      "Pending",
      "Processing",
      "Shipped",
      "Out-for-delivery",
      "Delivered",
    ];

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ success: false, message: "Order is Not Found" });
    }

    let canUpdate = false;
    
    order.orderedItems.forEach((item) => {
      const currentIndex = STATUS_SEQUENCE.indexOf(item.status);
      const newIndex = STATUS_SEQUENCE.indexOf(status);
      if (newIndex === -1) return;
      if (newIndex >= currentIndex) {
        canUpdate = true;
      }
    });
    if (!canUpdate) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ success: false, message: "Cannot Move to Previous Status" });
    }
    // Update all items that are not cancelled
    order.orderedItems.forEach((item) => {
      if (item.status !== "Cancelled") {
        const currentIndex = STATUS_SEQUENCE.indexOf(item.status);
        const newIndex = STATUS_SEQUENCE.indexOf(status);
        if (newIndex >= currentIndex) {
          item.status = status;
        }
      }
    });
    order.status = status;

    if (status === "Delivered") {
      order.deliveredAt = new Date();
    }
    order.save();
    return res.json({
      success: true,
      message: `Order status updatd to ${status}`,
      order,
    });
  } catch (error) {
    console.log("error in the backennd updateOrderStatus controller function", error);
    return res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};


module.exports = {
  getOrderPage,
  viewOrderDetails,
  updateOrderStatus,

};
