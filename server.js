// express를 쓰겠다.
const express = require('express');
const app = express();

// 요청과 응답 시 요청의 본문을 지정한 형태로 파싱해주는 미들웨어
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// 웹사이트에서 데이터 추출하기 위해
const puppeteer = require('puppeteer');

// ejs 파일(html 내에서 js 문법 사용 가능)
app.set('view engine', 'ejs');

// static 파일을 보관하기 위해 public 폴더를 쓸 것이다.
app.use('/public', express.static('public'));

// mongoDB를 쓰겠다.
const MongoClient = require('mongodb').MongoClient;
// ObjectId() 안에 담기 위해서
const {ObjectId} = require('mongodb');

// 환경 변수 사용을 위해
require('dotenv').config();

var db;
// mongoDB 연결
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function(에러, client) {
    if (에러) return console.log(에러);
    db = client.db('oss_project');
    // 서버 열기
    app.listen(process.env.PORT, function () {
        console.log('listening on 8080')
    });
})


// 후생관 학생식당
async function student_restaurant() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do');
    const content = await page.content();

    const menu_list = parseMenuContent(content);

    await browser.close();

    return menu_list;
}

// 후생관 교직원식당
async function professor_restaurant() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do?enc=Zm5jdDF8QEB8JTJGY2FmZXRlcmlhJTJGaHVmcyUyRjIlMkZ2aWV3LmRvJTNGeWVhciUzRDIwMjQlMjZtb250aCUzRDA1JTI2c2VsRGF0ZSUzRDIwMjQwNTA3JTI2c2VsQ2FmSWQlM0RoMjAyJTI2');
    const content = await page.content();

    const menu_list = parseMenuContent(content);

    await browser.close();

    return menu_list;
}

// HufsDorm 식당
async function HufsDorm_restaurant() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do?enc=Zm5jdDF8QEB8JTJGY2FmZXRlcmlhJTJGaHVmcyUyRjIlMkZ2aWV3LmRvJTNGeWVhciUzRDIwMjQlMjZtb250aCUzRDA1JTI2c2VsRGF0ZSUzRDIwMjQwNTA3JTI2c2VsQ2FmSWQlM0RoMjA1JTI2');
    const content = await page.content();

    const menu_list = parseMenuContent(content);

    await browser.close();

    return menu_list;
}

function parseMenuContent(content) {
    // 데이터 추출하기 위해
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
            $(list).find('li').each(function () {
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
app.get('/', function (요청, 응답) {
    응답.render('index.ejs');
});

// /menu로 들어오면 menu.ejs 보내줌
app.get('/menu', async (req, res) => {
    const stu_res = await student_restaurant(); // 후생관 학생식당
    const prof_res = await professor_restaurant();   // 후생관 교직원식당
    const hufs_res = await HufsDorm_restaurant();   // HufsDorm 식당

    // 매주 월요일 06시에 데이터 변경해서 db에 저장 -> 오늘이 만약 화요일이면 특정 데이터를 db에서 뽑아서 menu.ejs로 보내줌
    // 화요일 : stu_res->2, 9, 16 | prof_res->2, 9 | hufs_res->2, 9, 16, 23, 30, 37
    res.render('menu.ejs', { "stu_res": stu_res, "prof_res": prof_res, "hufs_res": hufs_res });
});

// /login으로 들어오면 login.ejs 보내줌
app.get('/login', function (요청, 응답) {
    응답.render('login.ejs');
})
// /register로 들어오면 register.ejs 보내줌
app.get('/register', function (요청, 응답) {
    응답.render('register.ejs');
})