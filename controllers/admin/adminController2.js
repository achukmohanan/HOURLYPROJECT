const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const { STATUS_CODE } = require("../../utils/statusCode");


const salesChart = async (req, res) => {
  try {
    const { filter } = req.query;
    const matchFilter = { 
      $or:[
        {'orderedItems.status' : 'Delivered'},
        {status:'Delivered'}
      ]
    };

    const today = new Date();
    let start, end;

    if (filter === "daily") {
      start = new Date(today.getFullYear(),today.getMonth(), today.getDate(), 0, 0, 0);
      end = new Date(today.getFullYear(),today.getMonth(),today.getDate(),23, 59, 59);
    } else if (filter === "weekly") {
      start = new Date(); 
      start.setDate(today.getDate() - 7);
      end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    } else if (filter === "monthly") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      start.setMonth(today.getMonth() - 1);
      end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    } else if (filter === "yearly") {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    matchFilter.deliveredAt  = { $gte: start, $lte: end };
    //filtering
    let groupStage = {};
    if (filter === "daily" || filter === "weekly") {
      groupStage = {
        _id: {
          day: { $dayOfMonth: "$deliveredAt" },
          month: { $month: "$deliveredAt" },
        },
        totalSales: {
          $sum: {
            $multiply: ["$orderedItems.quantity", "$orderedItems.price"],
          },
        },
      };
    } else if (filter === "monthly") {
      groupStage = {
        _id: { month: { $month: "$deliveredAt" } },
        totalSales: {
          $sum: {
            $multiply: ["$orderedItems.quantity", "$orderedItems.price"],
          },
        },
      };
    } else if (filter === "yearly") {
      groupStage = {
        _id: { year: { $year: "$deliveredAt" } },
        totalSales: {
          $sum: {
            $multiply: ["$orderedItems.quantity", "$orderedItems.price"],
          },
        },
      };
    }

    const chatData = await Order.aggregate([
      { $unwind: "$orderedItems" },
      { $match: matchFilter },

      { $group: groupStage },



      { $sort: { "_id.year": 1, "_id.month": 1, "_id.year": 1 } },
    ]);
console.log("Filter:", filter, "Start:", start, "End:", end);
// console.log("Chart Data:", chatData);

    res.json(chatData);
  } catch (error) {
    console.log("error in the sales chart on admin controller", error);
  }
};

module.exports = {
    salesChart
}