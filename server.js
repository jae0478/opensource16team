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
const { ObjectId } = require('mongodb');

// 자동화를 위해 cron을 쓰겠다
const cron = require('node-cron');

// 매일매일 메뉴를 이메일로 보내주기 위해 nodemailer 사용
const nodemailer = require('nodemailer');

// 구글api 이용
const { google } = require('googleapis');

// 환경 변수 사용을 위해
require('dotenv').config();

var db;
// mongoDB 연결
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function (에러, client) {
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
    // db 업데이트
    db.collection('stu_res').updateOne({ _id: 1 }, { $set: { stu_res: menu_list, _id: 1 } }, function (에러, 결과) {
        console.log("업데이트 완료");
    })
}

// 후생관 교직원식당
async function professor_restaurant() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do');

    await Promise.all([
        page.waitForNavigation(),
        page.click("#menu11319_obj34 > div.wrap-food > div.row-tab > ul > li:nth-child(2) > a"),
    ])

    const content = await page.content();
    const menu_list = parseMenuContent(content);
    await browser.close();

    // db 업데이트
    db.collection('prof_res').updateOne({ _id: 1 }, { $set: { prof_res: menu_list, _id: 1 } }, function (에러, 결과) {
        console.log("업데이트 완료");
    })
}

// HufsDorm 식당
async function HufsDorm_restaurant() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.hufs.ac.kr/hufs/11319/subview.do');

    await Promise.all([
        page.waitForNavigation(),
        page.click("#menu11319_obj34 > div.wrap-food > div.row-tab > ul > li:nth-child(3) > a"),
    ])
    const content = await page.content();
    const menu_list = parseMenuContentForHufsDorm(content);
    await browser.close();

    // db 업데이트
    db.collection('hufs_res').updateOne({ _id: 1 }, { $set: { hufs_res: menu_list, _id: 1 } }, function (에러, 결과) {
        console.log("업데이트 완료");
    })
}

// 학생식당, 교직원식당 데이터 추출
function parseMenuContent(content) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const menu_path = '#menuTableDiv > table > tbody > tr > td';
    const menu_data = $(menu_path);

    const menu_list = [];
    for (var i = 0; i < 7; i++) {
        const sub_menu_list = [];
        // td의 내용이 메뉴없음이면 그 텍스트 출력
        if ($(menu_data[i]).text() === "등록된 메뉴가없습니다.") {
            sub_menu_list.push($(menu_data[i]).text());
            // td에 바로 내용이 있는게 아니면
        } else {
            // li텍스트만
            $(menu_data[i]).find('li').each(function () {
                const text = $(this).text().trim();
                if (text !== "")
                    sub_menu_list.push(text);
            });
        }
        menu_list.push(sub_menu_list);
    }
    return menu_list;
}
// 기숙사식당 데이터 추출
function parseMenuContentForHufsDorm(content) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const menu_path = '#menuTableDiv > table > tbody > tr > td';
    const menu_data = $(menu_path);

    const menu_list = [];
    for (var i = 7; i < 14; i++) {
        const sub_menu_list = [];
        // td의 내용이 메뉴없음이면 그 텍스트 출력
        if ($(menu_data[i]).text() === "등록된 메뉴가없습니다.") {
            sub_menu_list.push($(menu_data[i]).text());
            // td에 바로 내용이 있는게 아니면
        } else {
            // li텍스트만
            $(menu_data[i]).find('li').each(function () {
                const text = $(this).text().trim();
                if (text !== "")
                    sub_menu_list.push(text);
            });
        }
        menu_list.push(sub_menu_list);
    }
    return menu_list;
}

// 매주 일요일 01시에 db(메뉴) 업데이트
cron.schedule('0 1 * * 0', async () => {
    // 여기에 실행하려는 코드를 넣으세요
    await student_restaurant(); // 후생관 학생식당
    await professor_restaurant();   // 후생관 교직원식당
    await HufsDorm_restaurant();   // HufsDorm 식당
    console.log('매주 일요일 01시에 실행됩니다.');
}, {
    timezone: "Asia/Seoul" // 시간대 설정 (예: 서울 시간대)
});

// /로 들어오면 index.ejs 보내줌
app.get('/', function (요청, 응답) {
    응답.render('index.ejs');
});

// /menu로 들어오면 menu.ejs 보내줌
app.get('/menu', async (req, res) => {
    // 오늘 요일에 따라 db에서 오늘의 메뉴를 가져옴
    const today = new Date();
    const dayOfWeek = today.getDay();

    let today_stu_res;
    let today_prof_res;
    let today_hufs_res;

    const stu_res_result = await db.collection('stu_res').findOne({ _id: 1 });
    const prof_res_result = await db.collection('prof_res').findOne({ _id: 1 });
    const hufs_res_result = await db.collection('hufs_res').findOne({ _id: 1 });

    today_stu_res = stu_res_result.stu_res[dayOfWeek];
    today_prof_res = prof_res_result.prof_res[dayOfWeek];
    today_hufs_res = hufs_res_result.hufs_res[dayOfWeek];

    res.render('menu.ejs', { "stu_res": today_stu_res, "prof_res": today_prof_res, "hufs_res": today_hufs_res });
});

// /subscribe로 post 요청 받으면
app.post('/subscribe', (req, res) => {
    db.collection('email_information').findOne({ email: req.body.email }, function (에러, 결과) {
        if (에러) { res.send("에러입니다.") }
        else if (결과) { res.send('이미 구독 중입니다 :)') }
        else {
            db.collection('email_information').insertOne({ email: req.body.email }, function (에러, 결과) {
                console.log("이메일 저장 완료");
                res.redirect('/');
            })
        }
    });
})

// 매일 10am에 이메일로 메뉴 전송
cron.schedule('0 10 * * *', async () => {
    try {
        // 오늘 요일에 따라 db에서 오늘의 메뉴를 가져옴
        const today = new Date();
        const dayOfWeek = today.getDay();

        const stu_res_result = await db.collection('stu_res').findOne({ _id: 1 });
        const prof_res_result = await db.collection('prof_res').findOne({ _id: 1 });
        const hufs_res_result = await db.collection('hufs_res').findOne({ _id: 1 });

        let today_stu_res = stu_res_result.stu_res[dayOfWeek];
        let today_prof_res = prof_res_result.prof_res[dayOfWeek];
        let today_hufs_res = hufs_res_result.hufs_res[dayOfWeek];

        const message = "<오늘의 점심>\n\n후생관 학생 식당\n" + today_stu_res + "\n\n후생관 교직원 식당\n" + today_prof_res + "\n\n기숙사 식당\n" + today_hufs_res + "\n\n오늘도 맛있는 식사 하세요 :)";

        // 모든 이메일 정보 가져오기
        const subscribers = await db.collection('email_information').find({}).toArray();

        // OAuth 2.0 클라이언트 생성
        const oAuth2Client = new google.auth.OAuth2(process.env.GMAIL_OAUTH_CLIENT_ID, process.env.GMAIL_OAUTH_CLIENT_SECRET, process.env.GMAIL_OAUTH_REDIRECT_URI);
        oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN });

        for (let subscriber of subscribers) {
            // OAuth 2.0로 토큰 갱신
            const accessToken = await oAuth2Client.getAccessToken();

            // Send email logic
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'hufsmenu@gmail.com',
                    clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
                    clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
                    accessToken: accessToken,
                },
            });

            // Gmail 전송 옵션
            const mailOptions = {
                from: 'hufsmenu@gmail.com', // 발신자 이메일 주소
                to: subscriber.email, // 입력된 이메일 주소
                subject: '오늘의 학식 목록입니다 :)', // 이메일 제목
                text: message // 이메일 내용
            };

            // 이메일 전송
            const result = await transporter.sendMail(mailOptions);
            console.log('Email sent:', result);
        }
    } catch (error) {
        console.error('Error sending email: ', error);
    }
}, {
    timezone: "Asia/Seoul" // 시간대 설정 (예: 서울 시간대)
});

// /login으로 들어오면 login.ejs 보내줌
app.get('/login', function (요청, 응답) {
    응답.render('login.ejs');
})
// /register로 들어오면 register.ejs 보내줌
app.get('/register', function (요청, 응답) {
    응답.render('register.ejs');
})