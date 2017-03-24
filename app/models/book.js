'use strict';

var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

var Book = new Schema({
    _creator: { type: String, ref: 'LocalUser', required: true },
    title: {
        type: String,
        trim: true,
        required: [true, 'The field "title" is required']
    },
    book_id: String,                // id
    thumbnail: String,              // volumeInfo.imageLinks.thumbnail
    subtitle: String,               // volumeInfo.subtitle
    authors: String,                // volumeInfo.authors
    date: String,                   // volumeInfo.publishedDate
    category: String,               // volumeInfo.categories
    pageCount: Number,              // volumeInfo.pageCount
    isMature: Number,               // volumeInfo.maturityRating == MATURE
    link: String,                   // volumeInfo.previewLink
    trade: {
        status: { type: Number, default: 0 },
        _from: { type: String, ref: 'LocalUser' }
    }
});

module.exports = mongoose.model('Book', Book);