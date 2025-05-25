const User =require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const adminLogin = (req,res) =>{
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('admin/adminlogin',{message:null})
}


module.exports = {
    adminLogin
}