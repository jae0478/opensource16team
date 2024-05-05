// express를 쓰겠다.
const express = require('express');
const app = express();

// 요청과 응답 시 요청의 본문을 지정한 형태로 파싱해주는 미들웨어
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));

// 웹사이트에서 데이터 추출하기 위해
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// ejs 파일(html 내에서 js 문법 사용 가능)
app.set('view engine', 'ejs');

// static 파일을 보관하기 위해 public 폴더를 쓸 것이다.
app.use('/public', express.static('public'));

// 서버 열기
app.listen(8080, function() {
    console.log('listening on 8080')
});

async function fetchData() {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do');
        const content = await page.content();

        const $ = cheerio.load(content);
        const dataArray = [];

        const path = '#menuTableDiv > table > tbody > tr > td > ul > li'
        const data = $(path);
        data.each((index, list) => {
            const text = $(list).text();
            console.log('text is ', text)
        })

        return dataArray;
    } catch(error) {
        console.error('Error fetching data: ', error);
        return null;
    }
}

// /로 들어오면 index.ejs 보내줌
app.get('/', function(요청, 응답) {
    응답.render('index.ejs');
});

// /menu로 들어오면 menu.ejs 보내줌
app.get('/menu', async (req, res) => {
    try {
        const data = await fetchData();
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