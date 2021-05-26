const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const getCourseData = require('./getCourse');

const url = '/courses?locale=ja&search%5Btitle%5D=&search%5Byear%5D=2021&search%5Bsemester%5D=&search%5Bsub_semester%5D=&search%5Bteacher_name%5D=&search%5Bsummary%5D=&button=';

let count = 1;

function scanPage(path) {
    const url = 'https://syllabus.sfc.keio.ac.jp' + path;
    request(url, (error, response, body) => {
        if (error) {
            console.error(`Error loading data for ${url}`);
            console.error(error);
            return;
        }
        const dom = cheerio.load(body);
        const nextLink = dom('.next a').attr('href');
        console.log(`Page ${count}: ${dom('.detail-btn').length} courses have a link`);
        dom('.detail-btn').each((index, elem) => {
            const courseId = dom(elem).attr('href').replace('/courses/', '')
                .split('?')[0];
            console.log(courseId);
            if (!fs.existsSync(`data/${courseId}.json`)) {
                getCourseData(courseId);
            } else {
                console.log(`Skipping ${courseId} - already loaded`);
            }
        });
        if (nextLink) {
            count++;
            scanPage(nextLink);
        }
    });
}

scanPage(url);
