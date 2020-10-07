var express = require('express');
var productHelpers = require('../../helpers/product-helpers');
var slideHelpers = require('../../helpers/slide-helpers');
var userHelpers = require('../../helpers/user-helpers');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  let user = req.session.user;

  productHelpers.getAllProducts().then((products) => {
    slideHelpers.getAllSlides().then((carouselItems) => {
      res.render('user/view-products', { title: 'EasyCart | Home', products, carouselItems, user });
    });
  });
});

router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/');
  } else {
    res.render('user/login', { title: 'EasyCart | Login', loginErr: req.session.loginErr });
    req.session.loginErr = false;
  }
});

router.get('/signup', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/');
  } else {
    res.render('user/signup', { title: 'EasyCart | Signup' })
  }
});

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.loggedIn = true;
    req.session.user = response;
    res.redirect('/');
  });
});

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect('/');
    } else {
      req.session.loginErr = 'Invalid Username or Password';
      res.redirect('/login');
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/cart', (req, res) => {
  let user = req.session.user;
  res.render('user/cart', { title: 'EasyCart | Cart', loggedIn: req.session.loggedIn, user });
});

module.exports = router;