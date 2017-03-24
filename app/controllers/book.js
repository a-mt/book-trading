'use strict';

var Book    = require('../models/book');
var https   = require('https');

function BookHandler(){

    this.index = function(req, res) {

        var params = {
            books: [],
            yourrequests: {length:0, step1:[], step2:[]},
            requestsforyou: {length:0, step1:[], step2:[]}
        };

        // Find available books (that don't belong to the current user)
        var q = {
            'trade._from': { $exists: false }
        };
        if(req.user) {
            q._creator = { $ne: req.user.id };
        }
        var query = Book.find(q).populate('_creator').then(function(docs){
            params.books = docs;
        });

        if(req.user) {

            // Find requests of the current user
            query = query.then(function(){
                return Book.find({
                    'trade._from': req.user.id
                }).populate('_creator').exec(function(err, docs){
                    if(err) {
                        return;
                    }
                    params.yourrequests.length = docs.length;
                    for(let i=0; i<docs.length; i++) {
                        params.yourrequests['step' + docs[i].trade.status].push(docs[i]);
                    }
                });
            });

            // Find requests for the current user
            query = query.then(function(){
                return Book.find({
                    '_creator': req.user.id,
                    'trade.status': { $gte: 1 }
                }).populate('trade._from').exec(function(err, docs){
                    if(err) {
                        return;
                    }
                    params.requestsforyou.length = docs.length;
                    for(let i=0; i<docs.length; i++) {
                        params.requestsforyou['step' + docs[i].trade.status].push(docs[i]);
                    }
                });
            });
        }

        // Render
        query.then(function(){
            res.render('index', params);
        });
    };

    // Lookup book with the given name with Google Book API
    this.search = function(req, res) {
        var name = req.body.name;
        if(!name) {
            res.status(400).send('Empty query');
            return;
        }

        // Query Google API
        https.get('https://www.googleapis.com/books/v1/volumes?key=' + process.env.GOOGLE_BOOK_KEY + '&q=' + name, function(subres){

            if(subres.statusCode != 200) {
                res.status(subres.statusCode).send(subres.statusMessage);
            } else {
                var body = '';
                subres.on('data', function(chunk) {
                    body += chunk.toString().trim();
                });
                subres.on('end', function() {
                    res.set('X-query',  name);
                    res.send(body);
                });
            }

        }).on('error', function(e) {
            res.status(500).send(e.message);
        });

    };

    // Add an Exemple entity
    this.add = function(req, res) {
        res.render('book/new', {
            title: 'New Book',
            errors: req.flash('errors').pop() || {},
            data: req.flash('data').pop() || {}
        });
    };
    this.addSubmit = function(req, res) {

        function callback(data) {
            var book = new Book(data);
            book._creator = req.user.id;
    
            // Save it
            book.save(function(err, obj){
    
                // Data validation of model failed
               if(err) {
                   var errors = err.errors || {};

                    // Render form with errors
                    req.flash('errors', errors);
                    req.flash('data', req.body);

                    res.redirect('/book/new');
                } else {
                    res.redirect('/book');
                }
            });
        }
        
        var id = req.body.choice;
        if(id == 'custom') {
            callback(req.body);
        } else {
            https.get('https://www.googleapis.com/books/v1/volumes/' + id + '?key=' + process.env.GOOGLE_BOOK_KEY, function(subres){

            if(subres.statusCode != 200) {
                res.status(subres.statusCode).send(subres.statusMessage);
            } else {
                var body = '';
                subres.on('data', function(chunk) {
                    body += chunk.toString().trim();
                });
                subres.on('end', function() {
                    var json = JSON.parse(body).volumeInfo;
                    var post = {
                        _creator : req.user.id,
                        book_id  : id,
                        title    : json.title,
                        subtitle : json.subtitle,
                        authors  : (json.authors ? json.authors.join(', ') : ''),
                        thumbnail: json.imageLinks.thumbnail,
                        date     : json.publishedDate,
                        pageCount: json.pageCount,
                        category : (json.categories ? json.categories[0] : ''),
                        isMature: (json.maturityRating == 'MATURE'),
                        link     : json.previewLink
                    };
                    callback(post);
                });
            }

        }).on('error', function(e) {
            res.status(500).send(e.message);
        });
        }
    };

    // List added by the current user
    this.list = function(req, res) {
        Book.find({
            _creator: req.user.id
        }, function(err, docs){
            res.render('book/list', {
                title: 'Books',
                docs: err ? [] : docs
            });
        });  
    };

    // Delete a book
    this.delete = function(req, res) {
        var id = req.body.id;
        Book.findById(id, function (err, book) {
            
            // Not found
            if(err) {
                req.flash('error', 'The required book doesn\'t exist');
                res.status(404).redirect('/book');
                return;
            }
            if(book._creator != req.user.id) {
                res.status(403).send('Forbidden');
                return;
            }

            // Delete
            book.remove(function(){
                res.send('The book has been successfully deleted');
            });
        });
    };

    // Request a trade
    this.trade_request = function(req, res) {
        var id = req.body.id;
        Book.findById(id, function(err, book){

            if(err || !book) {
                res.status(404).send('The required book doesn\'t exist');
                return;
            }
            if(book.trade.status) {
                res.status(400).send('This book is no longer available');
                return;
            }
            book.trade.status = 1;
            book.trade._from  = req.user.id;

            book.save(function() {
                res.send('OK');
            });
        });
    };

    // Remove a trade
    this.trade_undo = function(req, res) {
        var id = req.body.id;
        Book.findById(id, function(err, book){

            if(err || !book) {
                res.status(404).send('The required book doesn\'t exist');
                return;
            }
            if(book.trade._from != req.user.id) {
                res.status(403).send('Forbidden');
                return;
            }
            book.trade.status = 0;
            book.trade._from = undefined;

            book.save(function() {
                res.send('OK');
            });
        });
    };

    // Accept a trade
    this.trade_accept = function(req, res) {
        var id = req.body.id;
        Book.findById(id, function(err, book){

            if(err || !book) {
                res.status(404).send('The required book doesn\'t exist');
                return;
            }
            if(book._creator != req.user.id) {
                res.status(403).send('Forbidden');
                return;
            }
            book.trade.status = 2;

            book.save(function() {
                res.send('OK');
            });
        });
    };

    // Decline a trade
    this.trade_decline = function(req, res) {
        var id = req.body.id;
        Book.findById(id, function(err, book){

            if(err || !book) {
                res.status(404).send('The required book doesn\'t exist');
                return;
            }
            if(book._creator != req.user.id) {
                res.status(403).send('Forbidden');
                return;
            }
            book.trade.status = 0;
            book.trade._from  = undefined;

            book.save(function() {
                res.send('OK');
            });
        });
    };
}

module.exports = new BookHandler();