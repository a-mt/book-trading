var bookHandler = require(process.cwd() + '/app/controllers/book.js');

module.exports = function(app) {

    // login / logout
    require('./auth')(app);

    // homepage
    app.get('/', bookHandler.index);

    app.route('/book/new')
       .get(isLoggedIn, bookHandler.add)
       .post(isLoggedIn, bookHandler.addSubmit);
    app.get('/book', isLoggedIn, bookHandler.list);

    app.post('/book/delete', isLoggedIn, bookHandler.delete);
    app.post('/book/trade/request', isLoggedIn, bookHandler.trade_request);
    app.post('/book/trade/undo', isLoggedIn, bookHandler.trade_undo);
    app.post('/book/trade/accept', isLoggedIn, bookHandler.trade_accept);
    app.post('/book/trade/decline', isLoggedIn, bookHandler.trade_decline);

    app.post('/book/search', bookHandler.search);

};