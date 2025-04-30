
const pageNotFound = async (req,res)=>{
    try {
        return res.render("user/error404")
    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

const loadHomepage = async (req,res)=>{
        try {
            return  res.render('user/home')

        } catch (error) {
    // console.log("error happened",error.message);
    res.status(500).send("server error")           
        }
}

module.exports = {
    loadHomepage,
    pageNotFound,
}