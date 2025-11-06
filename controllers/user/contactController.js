const User = require("../../models/userSchema");
const Concern = require("../../models/concernSchema");
const { STATUS_CODE } = require("../../utils/statusCode");

const getContactPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const concern = await Concern.find({ userId });
   
    const user = await User.findById(userId);

    res.render("user/contact", { user, concern });
  } catch (error) {}
};
const postContact = async (req, res) => {
  try {
    const userId = req.session.user;
  
    const { name, email, issueType, message } = req.body;
    
    const concern = await Concern.create({
      userId: userId,
      issueType: issueType,
      description: message,
      status: "Pending",
      adminReply: "",
    });
    await concern.save();

   
    return res
      .status(STATUS_CODE.SUCCESS)
      .json({ success: true, message: "Concern Submitted Successfully" });
  } catch (error) {
    console.log("error  in the post contact ", error);
  }
};
module.exports = {
  getContactPage,
  postContact,
};
