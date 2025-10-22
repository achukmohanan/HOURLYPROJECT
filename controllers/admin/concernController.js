const Concern = require("../../models/concernSchema");
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Transaction = require("../../models/transactionSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const getConcernPage = async (req, res) => {
  try {
    const concerns = await Concern.find({});
    return res.render("admin/concern", { concerns });
  } catch (error) {
    console.log("error in get concern ", error);
  }
};

const viewConcernpage = async (req, res) => {
  try {
    const userId = req.params.id;
    const concern = await Concern.find({ userId: userId });
    const address = await Address.findOne({ userId: userId });
    const user = await User.findById(userId);
    const orders = await Order.find({ userId }).populate(
      "orderedItems.product"
    );
    const transactions = await Transaction.find({ userId });

    return res.render("admin/viewConcernView", {
      concern,
      address,
      user,
      orders,
      transactions,
    });
  } catch (error) {
    console.log("errror in the viewConcernPage ", error);
  }
};

const updateConcern = async (req, res) => {
  try {
    console.log("rew.body is ", req.body);
    const userId = req.params.id;
    const { message, action } = req.body;
    console.log("user id ", userId);
    console.log("messa", message);
    console.log("action", action);
    await Concern.findByIdAndUpdate(userId, {
      adminReply: message,
      status: action,
    });

    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Concern Updated" });
  } catch (error) {
    console.log("errror in the update concern ", error);
  }
};
module.exports = {
  getConcernPage,
  viewConcernpage,
  updateConcern,
};
