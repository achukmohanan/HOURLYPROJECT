const { model } = require("mongoose");
const User = require("../../models/userSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 6;

    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
      .sort({ _id: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    });
 
    res.render("admin/customers", {
      data: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      searchTerm: search,
    });
  } catch (error) {
    console.error("Error in customerInfo:", error);
  }
};
const customerBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    console.error("Block error:", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server Error" });
  }
};

const customerunBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    console.error("Unblock error:", error);
    res
      .status(STATUS_CODE.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
};
