const User =require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
// const { login } = require("../user/userController");
// const { router } = require("../../app");

const loadLogin = (req,res) =>{
    if(req.session.admin){
      
        
        return res.redirect('/admin/seconddash')
    }
    res.render('admin/adminlogin',{message:null})
}

const loaddashboard = (req,res) =>{

    try {
        if(req.session.admin){
          
            
            res.render('admin/seconddash');
        }else{
            res.redirect('/admin/adminlogin')
        }
    } catch (error) {
        res.render('admin/adminpagenotfound')
        console.log("error happend in loaddashboard",error);
        
    }
}

const login = async (req,res) =>{

    try {
         
        const {email,password} =req.body;
        const admin = await User.findOne({email:email,isAdmin:true})
      
        
        if(admin){
            const passwordMatch =await bcrypt.compare(password, admin.password)
            
                if  (passwordMatch){
                    req.session.admin = true;
                      
                    return res.redirect("/admin/seconddash")                  
                //    return res.status(200).json({success:true,redirect:"/admin/dashboard"})   
                }else{                    
                    return res.status(401).json({success:false, message:" you entered wrong password"})
                    }
                
        }else{ 
            return res.redirect('/admin/adminlogin')
        }
    } catch (error) {    
        console.log("login error ",error);
        return res.redirect('/admin/adminpagenotfound')
    }
}

const pageerror = async (req,res) =>{

 res.render('admin/pageerror')
   
}

const logout = async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session ",err);
                return res.redirect('/admin/pageerror')
            }
            res.redirect('/admin/adminlogin')
        })
        
    } catch (error) {
        console.log("unexpected error during  logout",error);
        res.redirect("/pageerror   ")
        
    }
}

module.exports = {
    loadLogin,
    loaddashboard,
    login,
    pageerror,
    logout
}