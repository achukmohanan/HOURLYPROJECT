const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin/adminlogin", { message: null });
};

const loaddashboard = async (req, res) => {
  try {
    if (req.session.admin) {
      const result = await Order.aggregate([
        {
          $match: {
            status: { $in: ["Delivered"] },
          },
        },
        {
          $group: {
            _id: null,
            toprevenue: { $sum: "$totalPrice" },
          },
        },
      ]);
      //total orders

      const totalOrders = await Order.aggregate([
        {
          $match: {
            status: { $in: ["Delivered"] },
          },
        },

        {
          $group: {
            _id: null,
            totalorders: { $sum: 1 },
          },
        },
      ]);

      //products
      const topProducts = await Order.aggregate([
        { $match: { status: "Delivered" } },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product",
            totalQuantity: { $sum: "$orderedItems.quantity" },
            totalSales: { $sum: "$orderedItems.price" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]);

      //category
      const getCategories = await Order.aggregate([
        { $match: { status: "Delivered" } },
        { $unwind: "$orderedItems" },

        //product
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        //category
        {
          $lookup: {
            from: "categories",
            localField: "productDetails.category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        { $unwind: "$categoryDetails" },

        {
          $group: {
            _id: "$categoryDetails._id",
            categoryName: { $first: "$categoryDetails.name" },
            totalSold: { $sum: "$orderedItems.quantity" },
          },
        },

        { $sort: { totalSold: -1 } },
        { $limit: 3 },
      ]);
      //brand

      const getBrands = await Order.aggregate([
        { $match: { status: "Delivered" } },
        { $unwind: "$orderedItems" },

        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.brand",
            totalSold: { $sum: "$orderedItems.quantity" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 8 },
      ]);
      //customers
      const userResult = await User.aggregate([
        { $match: { isBlocked: false, isAdmin: false } },

        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
          },
        },
      ]);

      return res.render("admin/dashboard", {
        result,
        topProducts,
        getCategories,
        getBrands,
        totalOrders,
        userResult,
      });
    } else {
      return res.redirect("/admin/adminlogin");
    }
  } catch (error) {
    // res.render('admin/adminpagenotfound')
    console.log("error happend in loaddashboard", error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email: email, isAdmin: true });

    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (passwordMatch) {
        req.session.admin = true;

        return res.redirect("/admin/dashboard");
        //    return res.status(200).json({success:true,redirect:"/admin/dashboard"})
      } else {
        return res
          .status(STATUS_CODE.UNAUTHORIZED)
          .json({ success: false, message: " you entered wrong password" });
      }
    } else {
      return res.redirect("/admin/adminlogin");
    }
  } catch (error) {
    console.log("login error ", error);
    return res.redirect("/admin/adminpagenotfound");
  }
};

const pageerror = async (req, res) => {
  res.render("admin/pageerror");
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session ", err.message);
        return res.redirect("/admin/pageerror");
      }
      console.log("logout session");

      res.redirect("/admin/adminlogin");
    });
  } catch (error) {
    console.log("unexpected error during  logout", error);
    res.redirect("/pageerror");
  }
};

const salesChart = async (req, res) => {
  try {
    const { filter } = req.query;
    const matchFilter = { "orderedItems.status": "Delivered" };

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

    matchFilter.createdOn = { $gte: start, $lte: end };
    //filtering
    let groupStage = {};
    if (filter === "daily" || filter === "weekly") {
      groupStage = {
        _id: {
          day: { $dayOfMonth: "$createdOn" },
          month: { $month: "$createdOn" },
        },
        totalSales: {
          $sum: {
            $multiply: ["$orderedItems.quantity", "$orderedItems.price"],
          },
        },
      };
    } else if (filter === "monthly") {
      groupStage = {
        _id: { month: { $month: "$createdOn" } },
        totalSales: {
          $sum: {
            $multiply: ["$orderedItems.quantity", "$orderedItems.price"],
          },
        },
      };
    } else if (filter === "yearly") {
      groupStage = {
        _id: { year: { $year: "$createdOn" } },
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
console.log("Chart Data:", chatData);

    res.json(chatData);
  } catch (error) {
    console.log("error in the sales chart on admin controller", error);
  }
};

module.exports = {
  loadLogin,
  loaddashboard,
  login,
  pageerror,
  logout,
  salesChart,
};
