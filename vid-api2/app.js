// This code is reused from CAB230 Assignment 3 from Semester 1 2024 with some modifications

require("dotenv").config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/user');
const videoRouter = require('./routes/video');

//const options = require('./knexfile');
//const knex = require('knex')(options);
const cors = require('cors');

// external files
const init_s3 = require('./configFiles/s3_config');   // S3 config code
const RetrieveSecret = require('./configFiles/secrets');   // connect to SQL server and retry as necessary


const app = express();
const port = process.env.PORT || 8000;

const knex_setup = require('./knex_setup');
let knex;

console.log("Before start app");
async function startApp() {
  try {
    console.log("Started app");

    // initialise s3 bucket
    init_s3();

    knex = await knex_setup();

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    app.use((req, res, next) => {
      req.db = knex;
      next();
    });

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    logger.token('res', (req, res) => {
      const headers = {}
      res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
      return JSON.stringify(headers)
    })

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(cors());

    // Retrieve data relating to knex and database connectivity
    app.get('/knex', function (req, res, next) {
      req.db.raw("SELECT VERSION()").then(
        (version) => console.log((version[0][0]))
      ).catch((err) => { console.log(err); throw err })
      res.send("Version Logged successfully");
    });

    // Specify routes leading to different endpoints
    app.use('/', indexRouter);
    app.use('/user', usersRouter);
    app.use('/video', videoRouter);

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
  } catch (error) {
      console.error("Failed to start the app:", error);
      process.exit(1);  // Exit the app if there's a critical failure
  }
}

startApp();

// Export the upload function
module.exports = startApp;


