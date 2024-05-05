// express를 쓰겠다.
const express = require('express');
const app = express();

// 요청과 응답 시 요청의 본문을 지정한 형태로 파싱해주는 미들웨어
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));

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

const puppeteer = require('puppeteer');

// Puppeteer를 사용하여 웹 페이지에서 데이터를 가져오는 함수
async function fetchDataFromWebsite(url, buttonSelector, resultElementSelector) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        // 특정 사이트의 URL로 이동
        await page.goto(url);

        // 버튼을 찾아서 클릭
        await page.click(buttonSelector);

        // 클릭 후 나타나는 데이터가 로드될 때까지 대기 (예: AJAX 요청 완료)
        await page.waitForSelector(resultElementSelector);

        // 클릭 후 나타나는 데이터 추출
        const data = await page.evaluate((resultElementSelector) => {
            const resultElement = document.querySelector(resultElementSelector);
            return resultElement.textContent.trim(); // 혹은 다른 속성을 추출할 수 있음
        }, resultElementSelector);
        console.log(data);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    } finally {
        // 브라우저 닫기
        await browser.close();
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
        const data = await fetchDataFromWebsite('http://coop.hufs.ac.kr/sub/welfare_02.php', '#tdh203', 'body > form > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(2) > td');

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
