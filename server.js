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

// 회원인증 기능을 위한 라이브러리
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
// app.use(미들웨어), 미들웨어 : 요청-응답 중간에 실행되는 코드
app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

// 비밀번호 암호화
const bcrypt = require('bcrypt');

// 오류 메시지 띄우기 위한 라이브러리
const flash = require('express-flash');
app.use(flash());

// 메소드 오버라이드 (put, delete 요청 가능하게 함)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

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

    const menu_list_dinner = parseMenuContent_stu_dinner(content);

    await browser.close();
    // db 업데이트
    db.collection('stu_res').updateOne({ _id: 1 }, { $set: { stu_res: menu_list, _id: 1 } }, function (에러, 결과) {
        console.log("업데이트 완료");
    })
    db.collection('stu_res_dinner').updateOne({_id: 1}, {$set: {stu_res_dinner: menu_list_dinner, _id:1}}, function(에러, 결과) {
        console.log("학생저녁업데이트완료");
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

    const menu_list_breakfast = parseMenuContentForHufsDorm_breakfast(content);
    const menu_list_dinner = parseMenuContentForHufsDorm_dinner(content);

    await browser.close();

    // db 업데이트
    db.collection('hufs_res').updateOne({ _id: 1 }, { $set: { hufs_res: menu_list, _id: 1 } }, function (에러, 결과) {
        console.log("업데이트 완료");
    })
    db.collection('hufs_res_breakfast').updateOne({_id: 1}, {$set: {hufs_res_breakfast: menu_list_breakfast, _id:1}}, function(에러, 결과) {
        console.log("기숙아침업데이트완료");
    })
    db.collection('hufs_res_dinner').updateOne({_id: 1}, {$set: {hufs_res_dinner: menu_list_dinner, _id : 1}}, function(에러, 결과) {
        console.log("기숙저녁업데이트완료");
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

    const menu_path = '#menuTableDiv > table > tbody > tr:nth-child(2) > td';
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

// 학생식당 저녁 데이터 추출
function parseMenuContent_stu_dinner(content) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const menu_path = '#menuTableDiv > table > tbody > tr:nth-child(3) > td';
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

// 기숙사식당 아침 데이터 추출
function parseMenuContentForHufsDorm_breakfast(content) {
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
// 기숙사식당 저녁 데이터 추출
function parseMenuContentForHufsDorm_dinner(content) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const menu_path = '#menuTableDiv > table > tbody > tr:nth-child(4) > td';
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
    응답.render('index.ejs', {isLoggedIn});
});

// /menu로 들어오면 menu.ejs 보내줌
app.get('/menu', async (req, res) => {
    // 오늘 요일에 따라 db에서 오늘의 메뉴를 가져옴
    // const today = new Date();
    // const dayOfWeek = today.getDay();

    const today = new Date();
    const offset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
    const newDate = new Date(today.getTime() + offset);
    const dayOfWeek = newDate.getDay(); // 새로운 날짜의 요일 가져오기

    let today_stu_res;
    let today_prof_res;
    let today_hufs_res;
    let today_stu_res_dinner;
    let today_hufs_res_breakfast;
    let today_hufs_res_dinner;

    const stu_res_result = await db.collection('stu_res').findOne({ _id: 1 });
    const prof_res_result = await db.collection('prof_res').findOne({ _id: 1 });
    const hufs_res_result = await db.collection('hufs_res').findOne({ _id: 1 });

    const stu_res_dinner_result = await db.collection('stu_res_dinner').findOne({ _id: 1 });
    const hufs_res_breakfast_result = await db.collection('hufs_res_breakfast').findOne({ _id: 1 });
    const hufs_res_dinner_result = await db.collection('hufs_res_dinner').findOne({ _id: 1 });

    today_stu_res = stu_res_result.stu_res[dayOfWeek];
    today_prof_res = prof_res_result.prof_res[dayOfWeek];
    today_hufs_res = hufs_res_result.hufs_res[dayOfWeek];

    today_stu_res_dinner = stu_res_dinner_result.stu_res_dinner[dayOfWeek];
    today_hufs_res_breakfast = hufs_res_breakfast_result.hufs_res_breakfast[dayOfWeek];
    today_hufs_res_dinner = hufs_res_dinner_result.hufs_res_dinner[dayOfWeek];

    res.render('menu.ejs', { "stu_res": today_stu_res, "prof_res": today_prof_res, "hufs_res": today_hufs_res, 
    "stu_res_dinner": today_stu_res_dinner, "hufs_res_breakfast": today_hufs_res_breakfast, "hufs_res_dinner": today_hufs_res_dinner, "GoogleMapApiKey": process.env.GOOGLE_MAP_API_KEY, isLoggedIn});
});

app.get('/subscribe', (요청, 응답) => {
    응답.render('mail.ejs', {isLoggedIn});
})

app.get('/info', (요청, 응답) => {
    응답.render('info.ejs', {"GoogleMapApiKey": process.env.GOOGLE_MAP_API_KEY, isLoggedIn});
})

// /subscribe로 post 요청 받으면
app.post('/subscribe', (req, res) => {
    db.collection('email_information').findOne({ email: req.body.email }, function (에러, 결과) {
        if (에러) { res.send("에러입니다.") }
        else if (결과) { 
            res.render("mail.ejs", {data: "이미 구독 중인 계정입니다."});
         }
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
        // const today = new Date();
        // const dayOfWeek = today.getDay();
        const today = new Date();
        const offset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
        const newDate = new Date(today.getTime() + offset);
        const dayOfWeek = newDate.getDay(); // 새로운 날짜의 요일 가져오기

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
        
        // 저장된 리프레시 토큰으로 액세스 토큰을 갱신
        oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN });
        const { token } = await oAuth2Client.getAccessToken();

        for (let subscriber of subscribers) {
            // Send email logic
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'hufsmenu@gmail.com',
                    clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
                    clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
                    accessToken: token,
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

// /register로 들어오면 register.ejs 보내줌
app.get('/register', function (요청, 응답) {
    응답.render('register.ejs', {isLoggedIn});
})
// register로 post 요청 받았을 때
app.post('/register', function (요청, 응답) {
    db.collection('login').findOne({ id: 요청.body.id }, function (에러, 결과) {
        if (에러) { 응답.send('에러입니다') }
        else if (결과) {
            응답.render('register.ejs', {message : '이미 존재하는 아이디입니다.', isLoggedIn});
        }
        else if (!/^[A-Za-z]+$/.test(요청.body.id)) {
            응답.render('register.ejs', {message : '아이디는 영어만 입력할 수 있습니다.', isLoggedIn});
        }
        else if (!/^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[\W_]).{8,}$/.test(요청.body.pw)) {
            응답.render('register.ejs', {message : '비밀번호는 8자리 이상이며 영어와 숫자, 특수기호를 모두 포함해야 합니다.', isLoggedIn});
        }
        else {
            // 비번 암호화해서 저장
            db.collection('login').insertOne({ id: 요청.body.id, pw: bcrypt.hashSync(요청.body.pw, 10) }, function (에러, 결과) {
                console.log('저장완료');
                응답.redirect('/');
            });
        }
    });
});

// /login으로 들어오면 login.ejs 보내줌
app.get('/login', function (요청, 응답) {
    응답.render('login.ejs', {isLoggedIn});
})

// 사용자의 로그인 상태를 저장하는 변수
let isLoggedIn = false;

// login으로 post 요청 받았을 때
app.post('/login', passport.authenticate('local', { // 미들웨어 씀
    failureRedirect: '/fail',
    failureFlash: true
}), function (요청, 응답) {
    isLoggedIn = true;
    응답.redirect('/');
});

// fail로 get 요청 받았을 때
app.get('/fail', function (요청, 응답) {
    // passport가 추가한 flash 메시지를 가져옴
    const flashMessage = 요청.flash('error')[0]; // 첫 번째 에러 메시지만 가져옴
    응답.render('login.ejs', { message: "틀렸습니다. 다시 입력하세요:)" , isLoggedIn});
});

// logout으로 get 요청 받았을 때
app.get('/logout', function (요청, 응답) {
    요청.logout(function (에러) {
        if (에러) {
            return 에러.status(500).send('Error occurred during logout');
        }
        isLoggedIn = false;
        응답.redirect('/');
    });
});

// mypage로 get 요청 받았을 때
app.get('/mypage', 로그인했니, function (요청, 응답) {   // 미들웨어 씀
    console.log(요청.user);

    db.collection('login').findOne({_id: 요청.user._id}, function(에러, 결과) {
        let 생성시간;
        // _id 필드의 타임스탬프 추출
        생성시간 = new ObjectId(결과._id).getTimestamp();
        console.log('문서 생성 시간:', 생성시간);
        db.collection('post').find({작성자: 요청.user._id}).toArray(function (에러, 결과2) {
            console.log(결과2);
            응답.render('mypage.ejs', { user: 요청.user, posts: 결과2, makeAccountTime: 생성시간, isLoggedIn });
        });
    });

});


// 로그인했는지 확인하는 함수
function 로그인했니(요청, 응답, next) {
    if (요청.user) {
        next();
    } else {
        // 응답.send('로그인안하셨는데요?');
        응답.redirect('/login');
    }
}

// 아이디 비번 인증하는 코드
passport.use(new LocalStrategy({
    usernameField: 'id',    // form name : id
    passwordField: 'pw',    // form name : pw
    session: true,  // 로그인 후 세션을 저장할 것인지
    passReqToCallback: false,   // 아이디, 비번 말고 다른 정보검사가 필요한지
}, function (입력한아이디, 입력한비번, done) {
    if (!/^[A-Za-z0-9]+$/.test(입력한아이디)) {
        return done(null, false, {message: '아이디는 영어와 숫자만 입력할 수 있습니다.'});
    }
    else if (!/^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[\W_]).{8,}$/.test(입력한비번)) {
        return done(null, false, {message: '비밀번호는 8자리 이상이며 영어와 숫자, 특수기호를 모두 포함해야 합니다.'});
    }
    else {
        db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
            if (에러) return done(에러);
    
            if (!결과) return done(null, false, { message: '존재하지 않는 아이디입니다.' });
            
            // 입력한비번의 암호화한 값과 DB에 저장되어 있는 pw 비교
            if (bcrypt.compareSync(입력한비번, 결과.pw)) {
                return done(null, 결과);
            } else {
                return done(null, false, { message: '비밀번호가 틀렸습니다.' });
            }
        })
    }
}));

// 세션을 저장시키는 코드 (로그인 성공시 발동)
passport.serializeUser(function (user, done) {
    done(null, user.id);    // 세션 데이터를 만들고 세션의 id 정보를 쿠키로 보냄
});
// 이 세션 데이터를 가진 사람을 DB에서 찾아주세요 (마이페이지 접속시 발동)
passport.deserializeUser(function (아이디, done) {
    db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
        done(null, 결과);
    });
});

// /edit으로 접속하면 edit.ejs 보여줌
app.get('/edit/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        console.log(결과);
        응답.render('edit.ejs', { post: 결과, isLoggedIn});
    });
});
// edit으로 put 요청 받았을 때
app.put('/edit', function (요청, 응답) {
    // DB에 저장된 값 수정
    db.collection('post').updateOne({ _id: parseInt(요청.body.id) }, { $set: { 제목: 요청.body.title, 본문: 요청.body.content } }, function (에러, 결과) {
        console.log('수정완료');
        응답.redirect('/list'); // 응답은 필수
    });
});
// /add 경로로 POST 요청 시
app.post('/add', function (요청, 응답) {
    console.log(요청.body.title);
    console.log(요청.body.content);
    console.log(요청.user);
    // DB에 저장
    db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
        // const now = new Date();
        const today = new Date();
        const offset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
        const now = new Date(today.getTime() + offset);

        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 월은 0부터 시작하므로 +1 해줍니다.
        const day = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        console.log(year + "년 " + month + "월 " + day + "일 " + hours + ":" + minutes + "분")
        
        console.log(결과.totalPost);
        var 총게시물갯수 = 결과.totalPost;
        var 저장할거 = { _id: 총게시물갯수 + 1, 작성자 : 요청.user._id, 제목: 요청.body.title, 본문: 요청.body.content, 작성시간: year + "년 " + month + "월 " + day + "일 " + hours + ":" + minutes + "분" }
        db.collection('post').insertOne(저장할거, function (에러, 결과) {
            console.log('저장완료');
            // 응답.send('전송완료');
            응답.redirect('/list'); // add하면 list로 redirect

            // counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시켜야함
            db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
                if (에러) { return console.log(에러) }
            });
        });
    });
});
// /delete 경로로 delete 요청을 받았을 때
app.delete('/delete', function (요청, 응답) {
    console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);    // 데이터 주고 받을 때는 문자로 바뀌니 이걸 다시 숫자로 바꿔줌

    var 삭제할데이터 = {_id : 요청.body._id, 작성자 : 요청.user._id}

    // 요청.body에 담겨온 게시물번호를 가진 글을 DB에서 찾아서 삭제
    db.collection('post').deleteOne(삭제할데이터, function (에러, 결과) {
        console.log('삭제완료');
        if (결과) {console.log(결과)}
        응답.status(200).send({ message: '성공했습니다' });
    });
});
// /list로 get 요청 시
app.get('/list', 로그인했니, function (요청, 응답) {
    // DB에 저장된 post라는 collection안의 모든 데이터를 list.ejs로 보내고 띄워라
    db.collection('post').find().toArray(function (에러, 결과) {
        응답.render('list.ejs', { posts: 결과, user: 요청.user, isLoggedIn });
    });
});

// search로 get 요청 받았을 때
// binary search - search index 활용
app.get('/search', (요청, 응답) => {
    console.log(요청.query);    // query string, query parameter
    
    var 검색조건 = [
        {
          $search: {
            index: 'default',
            text: {
              query: 요청.query.value,
              path: '제목'  // 제목본문 둘다 찾고 싶으면 ['제목', '본문']
            }
        }
        },
    ]
    // 검색조건에 맞는 것들을 모두 가져와 list.ejs로 전달
    db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
        console.log(결과);
        응답.render('list.ejs', { posts : 결과, user: 요청.user, isLoggedIn});
    });
});
app.get('/FAQ', function(요청, 응답) {
    응답.render('FAQ.ejs', {isLoggedIn});
})