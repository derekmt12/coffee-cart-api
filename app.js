const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const index = require('./routes/index');
const users = require('./routes/users');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'client/build')));

// app.use('/', index);
app.use('/users', users);

let id = 0;
let orders = {};

const router = express.Router();
router.get('/', function(req, res, next) {
    res.json(Object.keys(orders).map(key => orders[key]));
});
router.get('/:id', function(req, res, next) {
    const id = +req.params.id;
    res.json(orders[id]);
});
router.get('/next/:id', function(req, res, next) {
    const id = +req.params.id;
    const nextId = id + 1;
    res.json(orders[nextId]);
});
app.use('/api/orders', router);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

io.on('connection', client => {
    client.on('order', (order, onComplete) => {
        order.id = id++;
        orders[order.id] = order;
        onComplete(order);

        // emit back to sender their place in line

        client.broadcast.emit('orders', orders);
    });

    client.on('order:update', order => {
        orders[order.id] = order;

        // if order is complete
        //	 foreach customer
        // 		get all incomplete orders where the timeSubmitted < order.timeSubmitted
        // 		update connected customer of their place in line

        client.broadcast.emit(`order:${order.id}`, order);
    });
});

// const customers = io.of('customers');

// customers.on('connection', client => {

// });

io.listen(8000);
console.log('io listening on port 8000');

// catch 404 and forward to error handler
app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
