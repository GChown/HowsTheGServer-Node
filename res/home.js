$(function() {
    $(".comment").each(function() {
        var original = $(this).html();
        var converted = emojione.toImage(original);
        $(this).html(converted);
    });
});
