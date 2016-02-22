/*
    Set up the toggle button in the site header.
*/
(function($) {
    $(function() {
        $('.toggle-button').click(function(){
            $('.toggle-button').toggleClass('toggled-on');
            $('.includes').toggle();
        });
    });
})(jQuery);
