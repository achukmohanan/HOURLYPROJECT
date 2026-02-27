const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    name: String,
    loginTime: Date,
    logoutTime: Date,
    duration: Number   // in seconds
}, { timestamps: true })

module.exports = mongoose.model("UserActivity", userActivitySchema)