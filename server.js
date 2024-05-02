// express를 쓰겠다.
const express = require('express');
const app = express();

// 서버 열기
app.listen(8080, function() {
    console.log('listening on 8080')
});

// /로 들어오면 index.html 보내줌
app.get('/', function(요청, 응답) {
    응답.sendFile(__dirname + '/index.html')
});