var Book = {
    
    // Bind events
    init: function() {

        // Delete
        $('.js-delete').on('click', Book.delete);
    
       // Open details
       $('.js-view').on('click', Book.view);
    
       // Request a trade
       $('.js-trade:not(.disabled)').on('click', Book.trade.request);
       $('.js-untrade').on('click', Book.trade.undo);

        // Accept a trade
       $('.js-abouttrade').on('click', Book.trade_back.view);
       $('#modal').on('click', '.js-accept', Book.trade_back.accept);
       $('#modal').on('click', '.js-decline', Book.trade_back.decline);
    },

    // Open up a popup to display a book's details (/)
    view: function(e) {
       e.preventDefault();
       var details = $(this).closest('.thumbnail').children('.details');

        var $popup = $('#modal');
        $popup.find('.modal-body').html(details.html());
        $popup.modal('show');
    },

    // Request a trade
    trade: {
        request: function(e) {
            Book.trade.exe.bind(this)(e, {
                url   : '/book/trade/request',
                current: '#available',
                target: '#yourrequests',
                target_count: '.yourrequests.count',
                current_count: '.available.count'
            });
        },

        undo: function(e) {
            if(!confirm('Remove this book from your requests ?')) {
                return;
            }
            Book.trade.exe.bind(this)(e, {
                url   : '/book/trade/undo',
                current: '#yourrequests',
                target: '#available',
                target_count: '.available.count',
                current_count: '.yourrequests.count'
            });
        },

        exe: function(e, opts) {
            e.preventDefault();
            var $btn = $(this);

            $.ajax({
                url: opts.url,
                method: 'POST',
                data: {
                    id: $btn.data('id')
                },
                success: function(data) {
                    if(opts.thumbnail) {
                        $('#modal').modal('hide');
                    }
                    var nb     = 0,
                        $count = false;

                    // +1 target count
                    if(opts.target_count) {
                        $count = $(opts.target_count);
                        nb     = parseInt($count.html());
                        if(isNaN(nb)) {
                            nb = 0;
                        }
                        $count.html(nb+1);
                    }

                    // -1 current count
                    if(opts.current_count) {
                        $count = $(opts.current_count);
                        nb     = parseInt($count.html());
                        if(isNaN(nb)) {
                            return;
                        }
                        nb--;
                        $count.html(nb ? nb : '');
                    }
                    
                    // Remove thumbnail from current list and add it to target
                    var $thumbnail = (opts.thumbnail ? $(opts.thumbnail) : $btn.closest('.thumbnail'));
                    var $list      = $thumbnail;

                    if(!$thumbnail.siblings('.thumbnail').length) {
                        $list = $list.add($thumbnail.closest('.list'));
                    }
                    $list.fadeOut(400, function(){

                        if(opts.target) {
                            var div;
                            if(opts.target == opts.current) {
                                div = '.archive';
                                nb  = 1;
                            } else {
                                div = '.list';
                            }
                            var $target = $(opts.target);
                            $target.children(div).append($thumbnail).show();
                            $target.children('p.none').hide();
                            $thumbnail.show();
                        } else {
                            $thumbnail.remove();
                        }
                        if(!nb) {
                            $(opts.current).children('p.none').fadeIn();
                        }
                    });
                },
                error: function(xhr) {
                    console.log(xhr);
                    $btn.closest('.thumbnail').addClass('disabled');
                    alert(xhr.responseText + ' (err ' + xhr.status + ')');
                }
            });
        }
    },

    // Respond to a trade
    trade_back: {
        view: function(e) {
           e.preventDefault();
           var details = $(this).closest('.thumbnail').children('.about');
    
            var $popup = $('#modal');
            $popup.find('.modal-body').html(details.html());
            $popup.modal('show');
        },
        accept: function(e) {
            e.preventDefault();
            if(!confirm('Accept ?')) {
                return;
            }
            Book.trade.exe.bind(this)(e, {
                url   : '/book/trade/accept',
                thumbnail: '#thumbnail' + $(this).data('id'),
                current: '#requestsforyou',
                target: '#requestsforyou',
                target_count: false,
                current_count: '.requestsforyou.count'
            });
        },
        decline: function(e) {
            e.preventDefault();
            if(!confirm('Decline ?')) {
                return;
            }
            Book.trade.exe.bind(this)(e, {
                url   : '/book/trade/decline',
                thumbnail: '#thumbnail' + $(this).data('id'),
                current: '#requestsforyou',
                target: false,
                target_count: false,
                current_count: '.requestsforyou.count'
            });
        }
    },

    // Delete a book (/book)
    delete: function() {
        if(!confirm('Are you sure ?')) {
           return;
       }
       var $btn = $(this);
       $.ajax({
          url: '/book/delete',
          method: 'POST',
          data: {
              id: $btn.data('id')
          },
          success: function(data) {
              $btn.closest('.row').append('<div class="cover"><div class="alert success">The book has been deleted</div></div>');
          },
          error: function(xhr) {
              alert('Something went wrong (' + xhr.status + ' ' + xhr.responseText + ')');
          }
       });
    }
};

$(document).ready(function(){
    Book.init();
});