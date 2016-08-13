var id_token;
$(function() {
    var webSocketHost = location.protocol === 'https:' ? 'wss://' : 'ws://';
    var externalIp = 'localhost';
    var webSocketUri =  webSocketHost + externalIp + ':65080/votes';
    // Establish the WebSocket connection and register event handlers.
    var websocket = new WebSocket(webSocketUri);

    websocket.onopen = function() {
        //Check the first time
        websocket.send('/votes/');
        //Check every 3 seconds
        var intervalID = setInterval(function() {
            if(websocket.readyState == websocket.OPEN){
                websocket.send('/votes/');
            }else{
                window.clearTimeout(intervalID);
            }
        }, 3000);
        //console.log('Connected to websocket');
    };

    websocket.onclose = function() {
        websocket.close();
        console.log('Closed');
    };

    websocket.onmessage = function(e) {
        var message = JSON.parse(e.data);
        var count = message[1].count;
        var avg = message[0].avg;
        //If nobody has voted yet it'll be null
        if(avg == null && count == 0){
            $('#count').html('Nobody has voted on lunch yet!');
        }else{
            if(count == 1){
                $('#count').html(count + ' person has given lunch ' 
                    + avg + ' stars');
            }else{
                $('#count').html(count + ' people have given lunch ' 
                    + avg + ' stars');
            }
        }
    };

    websocket.onerror = function(e) {
        console.log(e);
    };
    $('#sendVote').on('click', function(){
        $.ajax({
                type: 'POST',
                url: '/rate',
                data: {
                    vote : $('#rating').val(),
                    token : id_token }
        });
    });
    $(".comment").each(function() {
        var original = $(this).html();
        var converted = emojione.toImage(original);
        $(this).html(converted);
    });

});
function onSignIn(googleUser) {
    //id_token is sent with every POST request
    id_token = googleUser.getAuthResponse().id_token;
    //Hide the sign in button
    $('#gsignin').hide('slow');
}
