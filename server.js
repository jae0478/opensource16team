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

// 크롤링 함수
async function fetchData() {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do');
        const content = await page.content();

        const menu_list = parseMenuContent(content);
        
        await browser.close();
        
        return menu_list;
    } catch (error) {
        console.error('Error fetching data: ', error);
        return null;
    }
}

function parseMenuContent(content) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const menu_path = '#menuTableDiv > table > tbody > tr > td';
    const menu_data = $(menu_path);

    const menu_list = [];
    menu_data.each((index, list) => {
        const sub_menu_list = [];
        // td의 내용이 메뉴없음이면 그 텍스트 출력
        if ($(list).text() === "등록된 메뉴가없습니다.") {
            sub_menu_list.push($(list).text());
        // td에 바로 내용이 있는게 아니면
        } else {
            // li텍스트만
            $(list).find('li').each(function() {
                const text = $(this).text().trim();
                if (text !== "")
                    sub_menu_list.push(text);
            });
        }
        menu_list.push(sub_menu_list);
    });

    return menu_list;
}

// /로 들어오면 index.ejs 보내줌
app.get('/', function(요청, 응답) {
    응답.render('index.ejs');
});

// /menu로 들어오면 menu.ejs 보내줌
app.get('/menu', async (req, res) => {
    try {
        const data = await fetchData();
        console.log(data);
        res.render('menu.ejs', { "menu_list" : data });
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