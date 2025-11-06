const Cart = require('../models/cartSchema');
const Wishlist = require('../models/wishlistSchema');
const User = require('../models/userSchema');

const cartWishlistCount = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user);

      if (user && !user.isBlocked) {
        res.locals.user = user;

        const [cart, wishlist] = await Promise.all([
          Cart.findOne({ userId: user._id }),
          Wishlist.findOne({ userId: user._id }),
        ]);

        res.locals.cartCount = cart ? cart.items.length : 0;
        res.locals.wishlistCount = wishlist ? wishlist.products.length : 0;
      } else {
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;
      }
    } catch (error) {
      console.log("Error fetching cart/wishlist counts:", error);
      res.locals.cartCount = 0;
      res.locals.wishlistCount = 0;
    }
  } else {
    // No user logged in
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
  }

  next();
};

module.exports = cartWishlistCount;
