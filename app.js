var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('express-handlebars');
var fileUpload = require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session');
const MongoStore = require('connect-mongo')(session);

var userRouter = require('./routes/user/user');
var adminRouter = require('./routes/admin/admin');
var adminProductRouter = require('./routes/admin/admin-products');
var adminSlideRouter = require('./routes/admin/admin-slide');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: `${__dirname}/views/layout/`, partialsDir: `${__dirname}/views/partials/` }));

var expressHbs = hbs.create({});

// register new function
expressHbs.handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
  switch (operator) {
    case '==':
      return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case '===':
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '!=':
      return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case '!==':
      return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case '<':
      return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=':
      return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>':
      return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=':
      return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&':
      return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||':
      return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload());
app.use(session({
  secret: 'EasyCartKey5f9512305dc3d50aa84f937c', cookie: { maxAge: 1000 * 3600 * 24 * 30 * 2 }, store: new MongoStore({
    url: 'mongodb://localhost:27017/EasyCartParellel',
    ttl: 14 * 24 * 60 * 60
  })
}));
db.connect((err) => {
  if (err) console.log(`Connection Error: ${err}`);
  else console.log('Database Connected to PORT: 27017');
});
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/admin', adminProductRouter);
app.use('/admin', adminSlideRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
