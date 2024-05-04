// express를 쓰겠다.
const express = require('express');
const app = express();

// 요청과 응답 시 요청의 본문을 지정한 형태로 파싱해주는 미들웨어
const bodyParser = require('body-parser');
app.unsubscribe(bodyParser.urlencoded({extended : true}));

// 웹사이트에서 데이터 추출하기 위해
const axios = require('axios');
const cheerio = require('cheerio');

// ejs 파일(html 내에서 js 문법 사용 가능)
app.set('view engine', 'ejs');

// static 파일을 보관하기 위해 public 폴더를 쓸 것이다.
app.use('/public', express.static('public'));

// 서버 열기
app.listen(8080, function() {
    console.log('listening on 8080')
});

// 데이터를 가져오고 추출하는 함수
async function fetchMenu() {
    try {
        const url = 'https://wis.hufs.ac.kr/jsp/HUFS/cafeteria/viewWeek.jsp?startDt=20240429&endDt=20240505&caf_name=%ED%9B%84%EC%83%9D%EA%B4%80+%ED%95%99%EC%83%9D%EC%8B%9D%EB%8B%B9&caf_id=h203';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // 메뉴 목록을 담을 배열
        const menuList = [];

        // 메뉴 정보가 있는 테이블의 각 행을 선택하여 데이터 추출
        $('table tr td').each((index, element) => {
            // 각 행의 텍스트를 가져와서 배열에 추가
            const menuText = $(element).text().trim();
            menuList.push(menuText);
        });
        console.log(menuList);
        return menuList;
    } catch (error) {
        console.error('Error fetching menu:', error);
        return null;
    }
}

// /로 들어오면 index.ejs 보내줌
app.get('/', function(요청, 응답) {
    응답.render('index.ejs');
});
// /menu로 들어오면 menu.ejs 보내줌(data 포함)
app.get('/menu', async (req, res) => {
    try {
        // 데이터 가져오기
        const data = await fetchMenu();

        // 데이터를 menu.ejs에 렌더링하여 응답
        res.render('menu.ejs', { data });
    } catch (error) {
        console.error('Error rendering menu:', error);
        res.status(500).send('Internal Server Error');
    }
});
// /login으로 들어오면 login.ejs 보내줌
app.get('/login', function(요청, 응답) {
    응답.render('login.ejs');
})
// /register로 들어오면 register.ejs 보내줌
app.get('/register', function(요청, 응답) {
    응답.render('register.ejs');
})
