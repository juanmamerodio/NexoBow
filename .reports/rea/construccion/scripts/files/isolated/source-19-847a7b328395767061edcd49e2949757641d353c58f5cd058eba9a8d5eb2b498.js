/**
 * File scripts.js.
 *
 * The code for your theme JavaScript source should reside in this file.
 */

( function( $ ) {
    'use strict';

    // On page load smooth scroll to content if not front page
    function scroll_to_content() {
        if ( !$('body').hasClass('home') ) {
            $('html, body').animate({
                'scrollTop' : $('.site-content').offset().top
            }, 900, 'swing');
        }
    }


    // Check if DOM is ready.
    $(function() {

        // Load only when page is fully loaded
        $(window).bind("load", function() {
            //scroll_to_content();
        });

        if ($(this).scrollTop() > 0) {
            $('#site-header').addClass('sticky');
        } else {
            $('#site-header').removeClass('sticky');
        }

        $(window).scroll(function(){
            if ($(this).scrollTop() > 0) {
                $('#site-header').addClass('sticky');
            } else {
                $('#site-header').removeClass('sticky');
            }
        });

    });

} )( jQuery );