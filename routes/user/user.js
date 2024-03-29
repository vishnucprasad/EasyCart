var express = require('express');
var productHelpers = require('../../helpers/product-helpers');
var slideHelpers = require('../../helpers/slide-helpers');
var userHelpers = require('../../helpers/user-helpers');
var router = express.Router();
var fs = require('fs');

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }

  productHelpers.getAllProducts().then((products) => {
    slideHelpers.getAllSlides().then((carouselItems) => {
      res.render('user/view-products', { title: 'EasyCart | Home', products, carouselItems, user: req.session.user, loggedIn: req.session.userLoggedIn, cartCount });
    });
  });
});

router.get('/login', (req, res) => {
  if (req.session.userLoggedIn) {
    res.redirect('/');
  } else {
    res.render('user/login', { title: 'EasyCart | Login', loginErr: req.session.userLoginErr });
    req.session.userLoginErr = false;
  }
});

router.get('/signup', (req, res) => {
  if (req.session.userLoggedIn) {
    res.redirect('/');
  } else {
    res.render('user/signup', { title: 'EasyCart | Signup' })
  }
});

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    req.session.userLoggedIn = true;
    req.session.user = response;
    res.redirect('/');
  });
});

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      res.redirect('/');
    } else {
      req.session.userLoginErr = 'Invalid Username or Password';
      res.redirect('/login');
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect('/');
});

router.get('/cart', verifyLogin, async (req, res) => {
  const cartCount = await userHelpers.getCartCount(req.session.user._id);
  const cartItems = await userHelpers.getCartItems(req.session.user._id);
  const totalAmount = await userHelpers.getTotalAmount(req.session.user._id);

  res.render('user/cart', { title: 'EasyCart | Cart', user: req.session.user, cartItems, cartCount, totalAmount });
});

router.get('/add-to-cart/:id', (req, res) => {
  if (req.session.userLoggedIn) {
    userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true });
    });
  } else {
    res.json({ status: false });
  }
});

router.get('/wishlist', verifyLogin, async (req, res) => {
  const wishList = await userHelpers.getWishList(req.session.user._id);
  const cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render('user/view-profile', { title: 'EasyCart | My Profile', user: req.session.user, wishList, wishListCall: true, cartCount });
});

router.get('/add-to-wishlist/:id', (req, res) => {
  if (req.session.userLoggedIn) {
    userHelpers.addToWishList(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true });
    });
  } else {
    res.json({ status: false });
  }
});

router.post('/remove-from-wishlist', (req, res) => {
  userHelpers.removeFromWishList(req.session.user._id, req.body).then(() => {
    res.json({ status: true });
  });
});

router.post('/change-product-quantity', (req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    const totalAmount = await userHelpers.getTotalAmount(req.session.user._id);
    response.totalAmount = totalAmount;
    res.json(response);
  });
});

router.post('/remove-from-cart', (req, res, next) => {
  userHelpers.removeFromCart(req.body).then((response) => {
    res.json(response);
  });
});

router.get('/my-profile', verifyLogin, async (req, res) => {
  const wishList = await userHelpers.getWishList(req.session.user._id);
  const cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render('user/view-profile', { title: 'EasyCart | My Profile', user: req.session.user, cartCount, wishList });
});

router.post('/add-new-address', (req, res) => {
  userHelpers.addNewAddress(req.session.user._id, req.body).then((response) => {
    req.session.user = response;
    res.json(req.body);
  });
});

router.get('/place-order', verifyLogin, async (req, res) => {
  const totalAmount = await userHelpers.getTotalAmount(req.session.user._id);
  const cartItems = await userHelpers.getCartItems(req.session.user._id);
  res.render('user/place-order', { title: 'EasyCart | Place Order', user: req.session.user, totalAmount, cartItems });
});

router.post('/place-order', async (req, res) => {
  const address = await userHelpers.getAddress(req.session.user._id, req.body.addressId);
  const products = await userHelpers.getCartItemsList(req.session.user._id);
  const totalAmount = await userHelpers.getTotalAmount(req.session.user._id);
  const cartCount = await userHelpers.getCartCount(req.session.user._id);
  userHelpers.placeOrder(req.session.user._id, address, req.body.paymentMethod, products, totalAmount, cartCount).then((orderId) => {
    if (req.body.paymentMethod === 'COD') {
      res.json({ codSuccess: true, _id: orderId });
    } else if (req.body.paymentMethod === 'onlinepayment') {
      userHelpers.generateRazorpay(orderId, totalAmount).then((response) => {
        res.json(response);
      });
    }
  });
});

router.post('/make-payment', async (req, res) => {
  userHelpers.generateRazorpay(req.body.orderId, parseFloat(req.body.totalAmount)).then((response) => {
    res.json(response);
  });
});

router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changeOrderStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true });
    });
  }).catch((err) => {
    res.json({ status: false, errMessage: 'Payment falied' });
  });
});

router.get('/order-success/:id', verifyLogin, async (req, res) => {
  const order = await userHelpers.getOrder(req.params.id);
  order.orderDetails.date = `${order.orderDetails.date.getDate()}-${order.orderDetails.date.getMonth()}-${order.orderDetails.date.getFullYear()}`;
  res.render('user/order-success', { title: 'EasyCart | Order Success', order, user: req.session.user });
});

router.get('/my-orders', verifyLogin, async (req, res) => {
  const orders = await userHelpers.getAllOrders(req.session.user._id);
  orders.forEach(order => {
    order.date = `${order.date.getDate()}-${order.date.getMonth()}-${order.date.getFullYear()}`;
  });
  res.render('user/my-orders', { title: 'EasyCart | My Orders', orders, user: req.session.user });
});

router.get('/view-order/:id', async (req, res) => {
  const order = await userHelpers.getOrder(req.params.id);
  order.orderDetails.date = `${order.orderDetails.date.getDate()}-${order.orderDetails.date.getMonth()}-${order.orderDetails.date.getFullYear()}`;
  res.render('user/view-order', { title: 'EasyCart | Order Details', order, user: req.session.user });
});

router.get('/cancel-order/:id', (req, res) => {
  userHelpers.cancelRequest(req.params.id).then((response) => {
    res.redirect(`/view-order/${req.params.id}`);
  });
});

router.post('/edit-personal-info', (req, res) => {
  userHelpers.editPersonalInfo(req.body, req.session.user._id).then((user) => {
    req.session.user = user;
    res.json({ status: true });
  });
});

router.post('/change-password', (req, res) => {
  userHelpers.changePassword(req.body, req.session.user.password, req.session.user._id).then((response) => {
    res.json(response);
  });
});

router.post('/delete-address', (req, res) => {
  userHelpers.deleteAddress(req.body, req.session.user._id).then((user) => {
    req.session.user = user;
    res.json({ status: true });
  });
});

router.post('/edit-address', (req, res) => {
  userHelpers.editAddress(req.body, req.session.user._id).then((user) => {
    req.session.user = user;
    res.json(req.body);
  });
});

router.post('/update-profile-picture/:id', (req, res) => {
  if (req.files.profilePicture) {
    userHelpers.updateProfilePicture(req.params.id, true).then((user) => {

      let image = req.files.profilePicture;

      image.mv(`./public/images/users/profile-pictures/${req.params.id}.jpg`, (err, done) => {
        if (err) {
          console.log(err);
        } else {
          console.log(done);
        }
      });
      req.session.user = user;
      res.redirect('/my-profile')
    });
  }
});

router.get('/remove-profile-picture/:id', (req, res) => {
  userHelpers.updateProfilePicture(req.params.id, false).then((user) => {
    req.session.user = user;
    fs.unlinkSync(`./public/images/users/profile-pictures/${req.params.id}.jpg`);
    res.redirect('/my-profile');
  });
});

router.post('/search', (req, res) => {
  userHelpers.searchProduct(req.body).then(async (products) => {
    res.json(products);
  });
});

router.get('/search-product/:query', (req, res) => {
  userHelpers.searchProduct({ searchQuery: req.params.query }).then(async (products) => {
    let cartCount = null;
    let searchNotFound = false;

    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }


    if (products[0]) {
      searchedProducts = products;
    } else {
      searchNotFound = true;
      searchedProducts = true;
    }

    res.render('user/view-products', { title: `EasyCart | Search?q=${req.params.query}`, searchedProducts, searchQuery: req.params.query, sortMethod: 'Popularity', user: req.session.user, loggedIn: req.session.userLoggedIn, cartCount, searchNotFound });
  });
});

router.get('/sort-product', (req, res) => {
  userHelpers.sortProduct(req.query).then(async (products) => {
    let cartCount = null;
    let searchNotFound = false;

    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }

    if (products[0]) {
      searchedProducts = products;
    } else {
      searchNotFound = true;
      searchedProducts = true;
    }

    res.render('user/view-products', { title: `EasyCart | Search?q=${req.params.query}`, searchedProducts, searchQuery: req.query.search, sortMethod: req.query.sort, user: req.session.user, loggedIn: req.session.userLoggedIn, cartCount, searchNotFound });
  });
});

module.exports = router;
